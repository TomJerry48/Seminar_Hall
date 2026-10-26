/**
 * End-to-End Backend, Database & Critical Booking Rules Verification Suite
 * SSMIET HallSync AI
 *
 * Verifies:
 * 1. PostgreSQL connection & schema integrity
 * 2. Empty database state before test & cleanup after test (leaves DB 100% empty)
 * 3. JWT Authentication & Bcrypt password verification
 * 4. Role-based authorization (Admin vs Faculty)
 * 5. Hall creation, capacity constraint validation
 * 6. Booking creation & retrieval
 * 7. Overlapping booking rejection (Double-booking prevention)
 * 8. Maintenance block enforcement (Blocks prevent conflicting bookings)
 * 9. Cancelled/Rejected bookings release the time slot
 * 10. Faculty cannot cancel another faculty member's booking
 */
import express from "express";
import bcrypt from "bcryptjs";
import { eq, inArray } from "drizzle-orm";
import { apiRouter } from "../src/routes.ts";
import { db, pool } from "../src/db/index.ts";
import {
  aiRecommendations,
  auditLogs,
  bookingHistory,
  bookingResources,
  bookings,
  departments,
  hallBlocks,
  hallResources,
  halls,
  maintenanceRequests,
  notifications,
  resources,
  users,
} from "../src/db/schema.ts";

function assert(condition: any, message: string) {
  if (!condition) {
    throw new Error(`ASSERTION FAILED: ${message}`);
  }
}

async function runVerificationSuite() {
  console.log("==============================================================");
  console.log("SSMIET HallSync AI — Automated Integration & Booking Test Suite");
  console.log("==============================================================");

  const app = express();
  app.use(express.json());
  app.use("/api", apiRouter);
  app.use("/api", (err: any, _req: any, res: any, _next: any) => {
    res.status(err.status || 500).json({ error: err.message || "Server error" });
  });

  const server = app.listen(0);
  const address = server.address() as any;
  const baseUrl = `http://127.0.0.1:${address.port}/api`;

  let createdAdminId: number | null = null;
  let createdFaculty1Id: number | null = null;
  let createdFaculty2Id: number | null = null;
  let createdHallId: number | null = null;

  try {
    // Test 1: Check system status when empty
    console.log("[1/10] Testing PostgreSQL connectivity & empty system status...");
    const statusRes = await fetch(`${baseUrl}/system/status`);
    assert(statusRes.status === 200, "Expected 200 from /api/system/status");
    const statusData = await statusRes.json();
    assert(statusData.hasAdmin === false, "Expected empty database to have hasAdmin === false");
    console.log("  ✓ PostgreSQL connected; empty database verified.");

    // Test 2: Unauthorized access rejection
    console.log("[2/10] Verifying unauthorized request rejection...");
    const unauthRes = await fetch(`${baseUrl}/halls`);
    assert(unauthRes.status === 401, "Expected 401 for unauthenticated /api/halls request");
    console.log("  ✓ Unauthenticated request rejected with HTTP 401.");

    // Test 3: Initialize First Admin & Login
    console.log("[3/10] Testing initial Admin setup and JWT authentication...");
    const setupRes = await fetch(`${baseUrl}/auth/setup-initial-admin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName: "Test Admin SSMIET",
        email: "test_admin_suite@ssmiet.ac.in",
        password: "StrongPassword123!",
      }),
    });
    assert(setupRes.status === 201, "Expected 201 when creating initial admin");
    const setupBody = await setupRes.json();
    const adminToken = setupBody.token;
    createdAdminId = setupBody.user.id;
    assert(Boolean(adminToken), "Expected JWT token from initial admin setup");
    console.log("  ✓ Administrator account created and JWT issued.");

    // Test 4: Create Faculty Accounts and verify RBAC
    console.log("[4/10] Testing Faculty creation and Role-Based Access Control (RBAC)...");
    const fac1Res = await fetch(`${baseUrl}/users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        fullName: "Prof. Faculty One",
        email: "faculty1_suite@ssmiet.ac.in",
        password: "FacultyPassword123!",
        role: "faculty",
        designation: "Assistant Professor",
      }),
    });
    assert(fac1Res.status === 201, "Expected 201 creating Faculty 1");
    createdFaculty1Id = (await fac1Res.json()).user.id;

    const fac2Res = await fetch(`${baseUrl}/users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        fullName: "Prof. Faculty Two",
        email: "faculty2_suite@ssmiet.ac.in",
        password: "FacultyPassword123!",
        role: "faculty",
        designation: "Associate Professor",
      }),
    });
    assert(fac2Res.status === 201, "Expected 201 creating Faculty 2");
    createdFaculty2Id = (await fac2Res.json()).user.id;

    // Login as Faculty 1
    const facLoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "faculty1_suite@ssmiet.ac.in",
        password: "FacultyPassword123!",
      }),
    });
    assert(facLoginRes.status === 200, "Expected 200 logging in as Faculty 1");
    const fac1Token = (await facLoginRes.json()).token;

    const fac2LoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "faculty2_suite@ssmiet.ac.in",
        password: "FacultyPassword123!",
      }),
    });
    const fac2Token = (await fac2LoginRes.json()).token;

    // Faculty trying to create a hall -> must fail with 403
    const forbiddenHallRes = await fetch(`${baseUrl}/halls`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${fac1Token}`,
      },
      body: JSON.stringify({
        name: "Unauthorized Hall",
        code: "UH-01",
        building: "Main Block",
        capacity: 100,
      }),
    });
    assert(forbiddenHallRes.status === 403, "Expected 403 when Faculty attempts to create hall");
    console.log("  ✓ Admin and Faculty RBAC permissions strictly enforced.");

    // Test 5: Admin creates Seminar Hall
    console.log("[5/10] Testing Seminar Hall registration & retrieval...");
    const createHallRes = await fetch(`${baseUrl}/halls`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: "Kalam Seminar Hall",
        code: "KSH-101",
        building: "Academic Block A",
        floor: "First Floor",
        capacity: 120,
        hasAc: true,
        hasProjector: true,
        hasSoundSystem: true,
      }),
    });
    assert(createHallRes.status === 201, "Expected 201 when Admin creates Hall");
    createdHallId = (await createHallRes.json()).hall.id;
    console.log("  ✓ Seminar Hall registered in PostgreSQL.");

    // Test 6: Invalid Booking Inputs (EndTime <= StartTime and Attendees > Capacity)
    console.log("[6/10] Testing booking validation (time order & capacity limit)...");
    const badTimeRes = await fetch(`${baseUrl}/bookings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${fac1Token}`,
      },
      body: JSON.stringify({
        hallId: createdHallId,
        eventName: "Invalid Time Seminar",
        expectedAttendees: 50,
        bookingDate: "2026-11-15",
        startTime: "14:00",
        endTime: "11:00",
      }),
    });
    assert(badTimeRes.status === 400, "Expected 400 when endTime <= startTime");

    const overCapRes = await fetch(`${baseUrl}/bookings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${fac1Token}`,
      },
      body: JSON.stringify({
        hallId: createdHallId,
        eventName: "Over Capacity Event",
        expectedAttendees: 250, // Hall capacity is 120
        bookingDate: "2026-11-15",
        startTime: "09:00",
        endTime: "11:00",
      }),
    });
    assert(overCapRes.status === 400, "Expected 400 when expectedAttendees > hall capacity");
    console.log("  ✓ Invalid time ranges and over-capacity requests rejected.");

    // Test 7: Create Valid Booking & Reject Overlapping Booking
    console.log("[7/10] Testing valid booking creation and overlapping conflict rejection...");
    const validBookingRes = await fetch(`${baseUrl}/bookings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${fac1Token}`,
      },
      body: JSON.stringify({
        hallId: createdHallId,
        eventName: "AI & Robotics Workshop",
        expectedAttendees: 100,
        bookingDate: "2026-11-15",
        startTime: "10:00",
        endTime: "13:00",
      }),
    });
    assert(validBookingRes.status === 201, "Expected 201 for valid booking creation");
    const booking1Id = (await validBookingRes.json()).booking.id;

    // Overlapping booking (11:30 - 14:30 overlaps with 10:00 - 13:00)
    const overlapRes = await fetch(`${baseUrl}/bookings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${fac2Token}`,
      },
      body: JSON.stringify({
        hallId: createdHallId,
        eventName: "Conflicting Seminar",
        expectedAttendees: 80,
        bookingDate: "2026-11-15",
        startTime: "11:30",
        endTime: "14:30",
      }),
    });
    assert(overlapRes.status === 400, "Expected 400 for overlapping booking request");
    console.log("  ✓ Overlapping double-booking strictly prevented by transaction check.");

    // Test 8: Faculty 2 cannot cancel Faculty 1's booking
    console.log("[8/10] Testing cross-faculty booking modification protection...");
    const crossCancelRes = await fetch(`${baseUrl}/bookings/${booking1Id}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${fac2Token}`,
      },
      body: JSON.stringify({ status: "cancelled" }),
    });
    assert(
      crossCancelRes.status === 400,
      "Expected error when Faculty 2 attempts to cancel Faculty 1's booking"
    );
    console.log("  ✓ Faculty prevented from modifying another faculty member's booking.");

    // Test 9: Cancelled booking releases hall slot
    console.log("[9/10] Testing that cancelled bookings release the hall time slot...");
    const selfCancelRes = await fetch(`${baseUrl}/bookings/${booking1Id}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${fac1Token}`,
      },
      body: JSON.stringify({ status: "cancelled", remarks: "Rescheduled" }),
    });
    assert(selfCancelRes.status === 200, "Expected 200 when Faculty 1 cancels own booking");

    const rebookRes = await fetch(`${baseUrl}/bookings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${fac2Token}`,
      },
      body: JSON.stringify({
        hallId: createdHallId,
        eventName: "Rebooked Slot Seminar",
        expectedAttendees: 80,
        bookingDate: "2026-11-15",
        startTime: "11:30",
        endTime: "14:30",
      }),
    });
    assert(rebookRes.status === 201, "Expected 201 booking slot after previous booking was cancelled");
    console.log("  ✓ Cancelled booking no longer blocks the hall.");

    // Test 10: Maintenance Block prevents booking during blocked window
    console.log("[10/10] Testing Hall Maintenance Block enforcement...");
    const blockRes = await fetch(`${baseUrl}/hall-blocks`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        hallId: createdHallId,
        reason: "Projector & Electrical Maintenance",
        startDate: "2026-11-20",
        endDate: "2026-11-20",
        startTime: "08:00",
        endTime: "18:00",
      }),
    });
    assert(blockRes.status === 201, "Expected 201 creating maintenance block");

    const blockedBookingRes = await fetch(`${baseUrl}/bookings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${fac1Token}`,
      },
      body: JSON.stringify({
        hallId: createdHallId,
        eventName: "Event During Maintenance",
        expectedAttendees: 60,
        bookingDate: "2026-11-20",
        startTime: "10:00",
        endTime: "12:00",
      }),
    });
    assert(blockedBookingRes.status === 400, "Expected 400 when booking during maintenance block");
    console.log("  ✓ Maintenance block prevented conflicting booking.");

    console.log("==============================================================");
    console.log("ALL 10 CRITICAL BACKEND & DATABASE TESTS PASSED SUCCESSFULLY!");
    console.log("==============================================================");
  } finally {
    // Clean up test records so the PostgreSQL database remains 100% EMPTY per strict requirements
    console.log("Cleaning up test records to restore pristine empty database state...");
    await db.delete(bookingHistory);
    await db.delete(bookingResources);
    await db.delete(bookings);
    await db.delete(hallBlocks);
    await db.delete(hallResources);
    await db.delete(maintenanceRequests);
    await db.delete(aiRecommendations);
    await db.delete(notifications);
    await db.delete(auditLogs);
    await db.delete(halls);
    await db.delete(resources);
    await db.delete(users);
    await db.delete(departments);
    server.close();
    await pool.end();
  }
}

runVerificationSuite().catch((err) => {
  console.error("Test Suite Failed:", err);
  process.exit(1);
});
