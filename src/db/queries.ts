import { db, pool } from "./index.ts";
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
} from "./schema.ts";
import { and, asc, desc, eq, gte, inArray, lte, ne, sql } from "drizzle-orm";

// Helper: Record Audit Log
export async function logAuditAction(params: {
  userId?: number | null;
  action: string;
  entityType: string;
  entityId?: number | null;
  details: string;
  ipAddress?: string;
}) {
  try {
    await db.insert(auditLogs).values({
      userId: params.userId ?? null,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId ?? null,
      details: params.details,
      ipAddress: params.ipAddress ?? "127.0.0.1",
    });
  } catch (error) {
    console.error("Failed to write audit log:", error);
  }
}

// Helper: Create Notification
export async function createNotification(params: {
  userId: number;
  title: string;
  message: string;
  type: string;
  relatedEntityId?: number;
}) {
  try {
    await db.insert(notifications).values({
      userId: params.userId,
      title: params.title,
      message: params.message,
      type: params.type,
      relatedEntityId: params.relatedEntityId,
    });
  } catch (error) {
    console.error("Failed to create notification:", error);
  }
}

// Check if database has any administrator
export async function checkSystemStatus() {
  try {
    const adminRecords = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.role, "admin"))
      .limit(1);
    return {
      hasAdmin: adminRecords.length > 0,
    };
  } catch (error) {
    console.error("Database query failed in checkSystemStatus:", error);
    throw new Error("Failed to check system initialization status.", {
      cause: error,
    });
  }
}

// Departments
export async function getAllDepartments() {
  try {
    return await db.select().from(departments).orderBy(asc(departments.name));
  } catch (error) {
    console.error("Database query failed in getAllDepartments:", error);
    throw new Error("Failed to retrieve departments.", { cause: error });
  }
}

export async function createDepartmentRecord(data: {
  name: string;
  code: string;
  headOfDepartment?: string;
  description?: string;
}) {
  try {
    const [created] = await db
      .insert(departments)
      .values({
        name: data.name.trim(),
        code: data.code.trim().toUpperCase(),
        headOfDepartment: data.headOfDepartment?.trim() || null,
        description: data.description?.trim() || null,
        isActive: true,
      })
      .returning();
    return created;
  } catch (error: any) {
    console.error("Database query failed in createDepartmentRecord:", error);
    if (error?.code === "23505") {
      throw new Error("A department with this name or code already exists.", {
        cause: error,
      });
    }
    throw new Error("Failed to create department.", { cause: error });
  }
}

export async function updateDepartmentRecord(
  id: number,
  data: {
    name?: string;
    code?: string;
    headOfDepartment?: string;
    description?: string;
    isActive?: boolean;
  }
) {
  try {
    const [updated] = await db
      .update(departments)
      .set({
        ...(data.name !== undefined ? { name: data.name.trim() } : {}),
        ...(data.code !== undefined ? { code: data.code.trim().toUpperCase() } : {}),
        ...(data.headOfDepartment !== undefined
          ? { headOfDepartment: data.headOfDepartment.trim() || null }
          : {}),
        ...(data.description !== undefined
          ? { description: data.description.trim() || null }
          : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
        updatedAt: new Date(),
      })
      .where(eq(departments.id, id))
      .returning();
    return updated;
  } catch (error: any) {
    console.error("Database query failed in updateDepartmentRecord:", error);
    if (error?.code === "23505") {
      throw new Error("A department with this name or code already exists.", {
        cause: error,
      });
    }
    throw new Error("Failed to update department.", { cause: error });
  }
}

// Users / Faculty Management
export async function getAllUsersWithDepartments() {
  try {
    const rows = await db
      .select({
        id: users.id,
        uid: users.uid,
        fullName: users.fullName,
        email: users.email,
        role: users.role,
        departmentId: users.departmentId,
        departmentName: departments.name,
        departmentCode: departments.code,
        designation: users.designation,
        phone: users.phone,
        accountStatus: users.accountStatus,
        createdAt: users.createdAt,
      })
      .from(users)
      .leftJoin(departments, eq(users.departmentId, departments.id))
      .orderBy(desc(users.createdAt));
    return rows;
  } catch (error) {
    console.error("Database query failed in getAllUsersWithDepartments:", error);
    throw new Error("Failed to retrieve user accounts.", { cause: error });
  }
}

// Halls & Hall Resources
export async function getAllHallsWithDetails() {
  try {
    const allHalls = await db.select().from(halls).orderBy(asc(halls.name));
    const allHallRes = await db
      .select({
        id: hallResources.id,
        hallId: hallResources.hallId,
        resourceId: hallResources.resourceId,
        resourceName: resources.name,
        category: resources.category,
        quantity: hallResources.quantity,
        conditionStatus: hallResources.conditionStatus,
      })
      .from(hallResources)
      .innerJoin(resources, eq(hallResources.resourceId, resources.id));

    return allHalls.map((hall) => ({
      ...hall,
      resources: allHallRes.filter((r) => r.hallId === hall.id),
    }));
  } catch (error) {
    console.error("Database query failed in getAllHallsWithDetails:", error);
    throw new Error("Failed to retrieve seminar halls.", { cause: error });
  }
}

export async function getHallByIdWithDetails(hallId: number) {
  try {
    const hallRows = await db.select().from(halls).where(eq(halls.id, hallId));
    if (hallRows.length === 0) return null;
    const hall = hallRows[0];

    const assignedResources = await db
      .select({
        id: hallResources.id,
        hallId: hallResources.hallId,
        resourceId: hallResources.resourceId,
        resourceName: resources.name,
        category: resources.category,
        quantity: hallResources.quantity,
        conditionStatus: hallResources.conditionStatus,
      })
      .from(hallResources)
      .innerJoin(resources, eq(hallResources.resourceId, resources.id))
      .where(eq(hallResources.hallId, hallId));

    const hallBookingsList = await db
      .select({
        id: bookings.id,
        eventName: bookings.eventName,
        eventType: bookings.eventType,
        bookingDate: bookings.bookingDate,
        startTime: bookings.startTime,
        endTime: bookings.endTime,
        expectedAttendees: bookings.expectedAttendees,
        status: bookings.status,
        organizerName: users.fullName,
        departmentName: departments.name,
      })
      .from(bookings)
      .innerJoin(users, eq(bookings.userId, users.id))
      .leftJoin(departments, eq(users.departmentId, departments.id))
      .where(eq(bookings.hallId, hallId))
      .orderBy(desc(bookings.bookingDate), asc(bookings.startTime));

    const blocksList = await db
      .select()
      .from(hallBlocks)
      .where(and(eq(hallBlocks.hallId, hallId), eq(hallBlocks.isActive, true)))
      .orderBy(desc(hallBlocks.startDate));

    return {
      ...hall,
      resources: assignedResources,
      bookings: hallBookingsList,
      blocks: blocksList,
    };
  } catch (error) {
    console.error("Database query failed in getHallByIdWithDetails:", error);
    throw new Error("Failed to retrieve hall details.", { cause: error });
  }
}

// Search Available Halls by Date, Time, Capacity, Facilities
export async function searchAvailableHalls(params: {
  date: string;
  startTime: string;
  endTime: string;
  minCapacity?: number;
  requireAc?: boolean;
  requireProjector?: boolean;
  requireSound?: boolean;
}) {
  try {
    const allHalls = await getAllHallsWithDetails();
    const activeHalls = allHalls.filter((h) => h.isActive);

    // Find overlapping active bookings on that date
    const activeBookingsOnDate = await db
      .select()
      .from(bookings)
      .where(
        and(
          eq(bookings.bookingDate, params.date),
          inArray(bookings.status, ["pending", "approved"])
        )
      );

    // Find active hall maintenance blocks covering that date
    const activeBlocksOnDate = await db
      .select()
      .from(hallBlocks)
      .where(
        and(
          eq(hallBlocks.isActive, true),
          lte(hallBlocks.startDate, params.date),
          gte(hallBlocks.endDate, params.date)
        )
      );

    return activeHalls.map((hall) => {
      const capacityMet = !params.minCapacity || hall.capacity >= params.minCapacity;
      const acMet = !params.requireAc || hall.hasAc;
      const projectorMet = !params.requireProjector || hall.hasProjector;
      const soundMet = !params.requireSound || hall.hasSoundSystem;

      // Time overlap check: (StartA < EndB) and (EndA > StartB)
      const conflictingBookings = activeBookingsOnDate.filter(
        (b) =>
          b.hallId === hall.id &&
          b.startTime < params.endTime &&
          b.endTime > params.startTime
      );

      const conflictingBlocks = activeBlocksOnDate.filter((blk) => {
        if (blk.hallId !== hall.id) return false;
        // If multi-day block or time overlap on same day
        const blockStart = blk.startDate < params.date ? "00:00" : blk.startTime;
        const blockEnd = blk.endDate > params.date ? "23:59" : blk.endTime;
        return blockStart < params.endTime && blockEnd > params.startTime;
      });

      const isAvailable =
        capacityMet &&
        acMet &&
        projectorMet &&
        soundMet &&
        conflictingBookings.length === 0 &&
        conflictingBlocks.length === 0;

      let unavailabilityReason: string | null = null;
      if (!capacityMet) {
        unavailabilityReason = `Capacity (${hall.capacity}) is below required (${params.minCapacity})`;
      } else if (!acMet || !projectorMet || !soundMet) {
        unavailabilityReason = "Does not meet requested facility filters";
      } else if (conflictingBlocks.length > 0) {
        unavailabilityReason = `Blocked for maintenance: ${conflictingBlocks[0].reason}`;
      } else if (conflictingBookings.length > 0) {
        unavailabilityReason = `Already booked (${conflictingBookings[0].startTime} - ${conflictingBookings[0].endTime}: ${conflictingBookings[0].eventName})`;
      }

      return {
        ...hall,
        isAvailable,
        unavailabilityReason,
        conflictingBookingsCount: conflictingBookings.length,
        conflictingBlocksCount: conflictingBlocks.length,
      };
    });
  } catch (error) {
    console.error("Database query failed in searchAvailableHalls:", error);
    throw new Error("Failed to search hall availability.", { cause: error });
  }
}

// Transactional Booking Creation with Row-Level Locking to prevent race conditions & double booking
export async function createBookingTransaction(params: {
  hallId: number;
  userId: number;
  userRole: string;
  eventName: string;
  eventDescription?: string;
  eventType: string;
  expectedAttendees: number;
  bookingDate: string;
  startTime: string;
  endTime: string;
  requiredResourcesNotes?: string;
  requestedResources?: Array<{ resourceId: number; quantity: number }>;
}) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1. Lock the hall row FOR UPDATE to serialize concurrent booking attempts for the same hall
    const hallRes = await client.query(
      `SELECT id, name, capacity, is_active, requires_approval FROM halls WHERE id = $1 FOR UPDATE`,
      [params.hallId]
    );

    if (hallRes.rowCount === 0) {
      throw new Error("Selected seminar hall does not exist.");
    }

    const hall = hallRes.rows[0];
    if (!hall.is_active) {
      throw new Error(`Hall "${hall.name}" is currently inactive and cannot be booked.`);
    }

    if (params.expectedAttendees <= 0) {
      throw new Error("Expected attendees must be greater than zero.");
    }

    if (params.expectedAttendees > hall.capacity) {
      throw new Error(
        `Expected attendees (${params.expectedAttendees}) exceed the capacity of ${hall.name} (Max: ${hall.capacity}).`
      );
    }

    if (params.endTime <= params.startTime) {
      throw new Error("Booking end time must be later than the start time.");
    }

    // 2. Check for active maintenance blocks on this hall
    const blockCheck = await client.query(
      `SELECT id, reason, start_date, end_date, start_time, end_time
       FROM hall_blocks
       WHERE hall_id = $1
         AND is_active = true
         AND start_date <= $2
         AND end_date >= $2`,
      [params.hallId, params.bookingDate]
    );

    for (const blk of blockCheck.rows) {
      const blkStart = blk.start_date < params.bookingDate ? "00:00" : blk.start_time;
      const blkEnd = blk.end_date > params.bookingDate ? "23:59" : blk.end_time;
      if (blkStart < params.endTime && blkEnd > params.startTime) {
        throw new Error(
          `Hall "${hall.name}" is blocked for maintenance on ${params.bookingDate} (${blkStart}–${blkEnd}): ${blk.reason}`
        );
      }
    }

    // 3. Check for overlapping active bookings (pending or approved)
    const overlapCheck = await client.query(
      `SELECT id, event_name, start_time, end_time, status
       FROM bookings
       WHERE hall_id = $1
         AND booking_date = $2
         AND status IN ('pending', 'approved')
         AND start_time < $4
         AND end_time > $3`,
      [params.hallId, params.bookingDate, params.startTime, params.endTime]
    );

    if ((overlapCheck.rowCount ?? 0) > 0) {
      const conflict = overlapCheck.rows[0];
      throw new Error(
        `Time slot conflict: "${hall.name}" already has an active booking ("${conflict.event_name}") from ${conflict.start_time} to ${conflict.end_time} on ${params.bookingDate}.`
      );
    }

    // 4. Determine initial booking status
    const initialStatus =
      params.userRole === "admin" || !hall.requires_approval ? "approved" : "pending";
    const approvedBy = initialStatus === "approved" ? params.userId : null;

    // 5. Insert booking
    const insertBookingRes = await client.query(
      `INSERT INTO bookings (
        hall_id, user_id, event_name, event_description, event_type,
        expected_attendees, booking_date, start_time, end_time,
        status, required_resources_notes, approved_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`,
      [
        params.hallId,
        params.userId,
        params.eventName.trim(),
        params.eventDescription?.trim() || null,
        params.eventType || "Seminar",
        params.expectedAttendees,
        params.bookingDate,
        params.startTime,
        params.endTime,
        initialStatus,
        params.requiredResourcesNotes?.trim() || null,
        approvedBy,
      ]
    );

    const newBooking = insertBookingRes.rows[0];

    // 6. Insert requested booking_resources if provided
    if (params.requestedResources && params.requestedResources.length > 0) {
      for (const reqRes of params.requestedResources) {
        if (reqRes.quantity > 0) {
          await client.query(
            `INSERT INTO booking_resources (booking_id, resource_id, quantity_requested)
             VALUES ($1, $2, $3)`,
            [newBooking.id, reqRes.resourceId, reqRes.quantity]
          );
        }
      }
    }

    // 7. Record booking history
    await client.query(
      `INSERT INTO booking_history (booking_id, action, previous_status, new_status, changed_by, remarks)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        newBooking.id,
        "created",
        null,
        initialStatus,
        params.userId,
        initialStatus === "approved"
          ? "Booking created and automatically approved."
          : "Booking request submitted for administrator approval.",
      ]
    );

    // 8. Notify user & admins
    await client.query(
      `INSERT INTO notifications (user_id, title, message, type, related_entity_id)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        params.userId,
        initialStatus === "approved" ? "Booking Confirmed" : "Booking Request Submitted",
        `Your booking for "${params.eventName}" in ${hall.name} on ${params.bookingDate} (${params.startTime}–${params.endTime}) is ${initialStatus}.`,
        initialStatus === "approved" ? "booking_approved" : "booking_created",
        newBooking.id,
      ]
    );

    if (initialStatus === "pending") {
      const adminsRes = await client.query(
        `SELECT id FROM users WHERE role = 'admin' AND account_status = 'active'`
      );
      for (const adminRow of adminsRes.rows) {
        if (adminRow.id !== params.userId) {
          await client.query(
            `INSERT INTO notifications (user_id, title, message, type, related_entity_id)
             VALUES ($1, $2, $3, $4, $5)`,
            [
              adminRow.id,
              "New Hall Booking Request",
              `New pending booking request for "${params.eventName}" in ${hall.name} on ${params.bookingDate} (${params.startTime}–${params.endTime}).`,
              "booking_created",
              newBooking.id,
            ]
          );
        }
      }
    }

    await client.query("COMMIT");
    return newBooking;
  } catch (error: any) {
    await client.query("ROLLBACK");
    console.error("Booking transaction failed:", error);
    throw new Error(error.message || "Failed to create booking.", { cause: error });
  } finally {
    client.release();
  }
}

// Retrieve bookings with full hall, user, and department metadata
export async function getBookingsList(filters?: {
  userId?: number;
  hallId?: number;
  status?: string;
  startDate?: string;
  endDate?: string;
}) {
  try {
    const allRows = await db
      .select({
        id: bookings.id,
        hallId: bookings.hallId,
        hallName: halls.name,
        hallCode: halls.code,
        building: halls.building,
        hallCapacity: halls.capacity,
        userId: bookings.userId,
        organizerName: users.fullName,
        organizerEmail: users.email,
        departmentName: departments.name,
        eventName: bookings.eventName,
        eventDescription: bookings.eventDescription,
        eventType: bookings.eventType,
        expectedAttendees: bookings.expectedAttendees,
        bookingDate: bookings.bookingDate,
        startTime: bookings.startTime,
        endTime: bookings.endTime,
        status: bookings.status,
        requiredResourcesNotes: bookings.requiredResourcesNotes,
        adminRemarks: bookings.adminRemarks,
        createdAt: bookings.createdAt,
        updatedAt: bookings.updatedAt,
      })
      .from(bookings)
      .innerJoin(halls, eq(bookings.hallId, halls.id))
      .innerJoin(users, eq(bookings.userId, users.id))
      .leftJoin(departments, eq(users.departmentId, departments.id))
      .orderBy(desc(bookings.bookingDate), asc(bookings.startTime));

    return allRows.filter((row) => {
      if (filters?.userId && row.userId !== filters.userId) return false;
      if (filters?.hallId && row.hallId !== filters.hallId) return false;
      if (filters?.status && filters.status !== "all" && row.status !== filters.status)
        return false;
      if (filters?.startDate && row.bookingDate < filters.startDate) return false;
      if (filters?.endDate && row.bookingDate > filters.endDate) return false;
      return true;
    });
  } catch (error) {
    console.error("Database query failed in getBookingsList:", error);
    throw new Error("Failed to retrieve bookings.", { cause: error });
  }
}

// Update booking status (Approve, Reject, Cancel) inside a transaction
export async function updateBookingStatusTransaction(params: {
  bookingId: number;
  actorId: number;
  actorRole: "admin" | "faculty";
  newStatus: "approved" | "rejected" | "cancelled";
  remarks?: string;
}) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const bookingRes = await client.query(
      `SELECT b.*, h.name as hall_name
       FROM bookings b
       JOIN halls h ON b.hall_id = h.id
       WHERE b.id = $1
       FOR UPDATE`,
      [params.bookingId]
    );

    if (bookingRes.rowCount === 0) {
      throw new Error("Booking record not found.");
    }

    const booking = bookingRes.rows[0];

    // Authorization check
    if (params.newStatus === "approved" || params.newStatus === "rejected") {
      if (params.actorRole !== "admin") {
        throw new Error("Only administrators can approve or reject bookings.");
      }
    }

    if (params.newStatus === "cancelled") {
      if (params.actorRole !== "admin" && booking.user_id !== params.actorId) {
        throw new Error("You are not authorized to cancel another faculty member's booking.");
      }
      if (booking.status === "cancelled" || booking.status === "rejected") {
        throw new Error(`Booking is already ${booking.status}.`);
      }
    }

    // If approving, verify no other approved booking or maintenance block overlaps
    if (params.newStatus === "approved") {
      const conflictRes = await client.query(
        `SELECT id, event_name, start_time, end_time
         FROM bookings
         WHERE hall_id = $1
           AND booking_date = $2
           AND id != $3
           AND status = 'approved'
           AND start_time < $5
           AND end_time > $4`,
        [
          booking.hall_id,
          booking.booking_date,
          booking.id,
          booking.start_time,
          booking.end_time,
        ]
      );

      if ((conflictRes.rowCount ?? 0) > 0) {
        const conflict = conflictRes.rows[0];
        throw new Error(
          `Cannot approve: Overlaps with already approved booking "${conflict.event_name}" (${conflict.start_time}–${conflict.end_time}).`
        );
      }
    }

    const previousStatus = booking.status;
    const approvedBy = params.newStatus === "approved" ? params.actorId : booking.approved_by;

    const updatedRes = await client.query(
      `UPDATE bookings
       SET status = $1,
           admin_remarks = COALESCE($2, admin_remarks),
           approved_by = $3,
           updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [params.newStatus, params.remarks?.trim() || null, approvedBy, params.bookingId]
    );

    await client.query(
      `INSERT INTO booking_history (booking_id, action, previous_status, new_status, changed_by, remarks)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        params.bookingId,
        params.newStatus,
        previousStatus,
        params.newStatus,
        params.actorId,
        params.remarks?.trim() || `Booking status changed from ${previousStatus} to ${params.newStatus}.`,
      ]
    );

    // Notify booking owner
    const notifTitle =
      params.newStatus === "approved"
        ? "Booking Approved"
        : params.newStatus === "rejected"
        ? "Booking Rejected"
        : "Booking Cancelled";

    await client.query(
      `INSERT INTO notifications (user_id, title, message, type, related_entity_id)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        booking.user_id,
        notifTitle,
        `Your booking "${booking.event_name}" in ${booking.hall_name} on ${booking.booking_date} (${booking.start_time}–${booking.end_time}) has been ${params.newStatus}.${
          params.remarks ? ` Remarks: ${params.remarks}` : ""
        }`,
        `booking_${params.newStatus}`,
        booking.id,
      ]
    );

    await client.query("COMMIT");
    return updatedRes.rows[0];
  } catch (error: any) {
    await client.query("ROLLBACK");
    console.error("Failed to update booking status:", error);
    throw new Error(error.message || "Failed to update booking status.", {
      cause: error,
    });
  } finally {
    client.release();
  }
}
