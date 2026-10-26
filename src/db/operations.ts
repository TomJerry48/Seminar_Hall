import { db } from "./index.ts";
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
import { and, asc, desc, eq, gte, inArray, lte } from "drizzle-orm";
import { searchAvailableHalls } from "./queries.ts";

// Resources Management
export async function getAllResources() {
  try {
    return await db.select().from(resources).orderBy(asc(resources.name));
  } catch (error) {
    console.error("Database query failed in getAllResources:", error);
    throw new Error("Failed to retrieve equipment and resources.", { cause: error });
  }
}

export async function createResourceRecord(data: {
  name: string;
  category: string;
  description?: string;
  totalQuantity: number;
  availableQuantity: number;
  status?: string;
}) {
  try {
    const [created] = await db
      .insert(resources)
      .values({
        name: data.name.trim(),
        category: data.category.trim() || "General",
        description: data.description?.trim() || null,
        totalQuantity: data.totalQuantity,
        availableQuantity: data.availableQuantity,
        status: data.status || "available",
      })
      .returning();
    return created;
  } catch (error: any) {
    console.error("Database query failed in createResourceRecord:", error);
    if (error?.code === "23505") {
      throw new Error("A resource with this name already exists.", { cause: error });
    }
    throw new Error("Failed to create resource.", { cause: error });
  }
}

export async function updateResourceRecord(
  id: number,
  data: {
    name?: string;
    category?: string;
    description?: string;
    totalQuantity?: number;
    availableQuantity?: number;
    status?: string;
  }
) {
  try {
    const [updated] = await db
      .update(resources)
      .set({
        ...(data.name !== undefined ? { name: data.name.trim() } : {}),
        ...(data.category !== undefined ? { category: data.category.trim() } : {}),
        ...(data.description !== undefined
          ? { description: data.description.trim() || null }
          : {}),
        ...(data.totalQuantity !== undefined ? { totalQuantity: data.totalQuantity } : {}),
        ...(data.availableQuantity !== undefined
          ? { availableQuantity: data.availableQuantity }
          : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
        updatedAt: new Date(),
      })
      .where(eq(resources.id, id))
      .returning();
    return updated;
  } catch (error: any) {
    console.error("Database query failed in updateResourceRecord:", error);
    throw new Error("Failed to update resource.", { cause: error });
  }
}

export async function assignResourceToHall(data: {
  hallId: number;
  resourceId: number;
  quantity: number;
  conditionStatus?: string;
}) {
  try {
    const [assigned] = await db
      .insert(hallResources)
      .values({
        hallId: data.hallId,
        resourceId: data.resourceId,
        quantity: data.quantity,
        conditionStatus: data.conditionStatus || "working",
      })
      .onConflictDoUpdate({
        target: [hallResources.hallId, hallResources.resourceId],
        set: {
          quantity: data.quantity,
          conditionStatus: data.conditionStatus || "working",
        },
      })
      .returning();
    return assigned;
  } catch (error) {
    console.error("Database query failed in assignResourceToHall:", error);
    throw new Error("Failed to associate resource with hall.", { cause: error });
  }
}

export async function removeResourceFromHall(hallId: number, resourceId: number) {
  try {
    await db
      .delete(hallResources)
      .where(
        and(eq(hallResources.hallId, hallId), eq(hallResources.resourceId, resourceId))
      );
  } catch (error) {
    console.error("Database query failed in removeResourceFromHall:", error);
    throw new Error("Failed to remove resource from hall.", { cause: error });
  }
}

// Maintenance Requests
export async function getMaintenanceRequestsList(userIdFilter?: number) {
  try {
    const rows = await db
      .select({
        id: maintenanceRequests.id,
        hallId: maintenanceRequests.hallId,
        hallName: halls.name,
        resourceId: maintenanceRequests.resourceId,
        resourceName: resources.name,
        reportedBy: maintenanceRequests.reportedBy,
        reporterName: users.fullName,
        reporterEmail: users.email,
        title: maintenanceRequests.title,
        issueDescription: maintenanceRequests.issueDescription,
        priority: maintenanceRequests.priority,
        status: maintenanceRequests.status,
        resolutionNotes: maintenanceRequests.resolutionNotes,
        resolvedAt: maintenanceRequests.resolvedAt,
        createdAt: maintenanceRequests.createdAt,
        updatedAt: maintenanceRequests.updatedAt,
      })
      .from(maintenanceRequests)
      .innerJoin(users, eq(maintenanceRequests.reportedBy, users.id))
      .leftJoin(halls, eq(maintenanceRequests.hallId, halls.id))
      .leftJoin(resources, eq(maintenanceRequests.resourceId, resources.id))
      .orderBy(desc(maintenanceRequests.createdAt));

    if (userIdFilter) {
      return rows.filter((r) => r.reportedBy === userIdFilter);
    }
    return rows;
  } catch (error) {
    console.error("Database query failed in getMaintenanceRequestsList:", error);
    throw new Error("Failed to retrieve maintenance requests.", { cause: error });
  }
}

export async function createMaintenanceRequestRecord(data: {
  hallId?: number | null;
  resourceId?: number | null;
  reportedBy: number;
  title: string;
  issueDescription: string;
  priority: string;
}) {
  try {
    const [created] = await db
      .insert(maintenanceRequests)
      .values({
        hallId: data.hallId ?? null,
        resourceId: data.resourceId ?? null,
        reportedBy: data.reportedBy,
        title: data.title.trim(),
        issueDescription: data.issueDescription.trim(),
        priority: data.priority || "medium",
        status: "open",
      })
      .returning();
    return created;
  } catch (error) {
    console.error("Database query failed in createMaintenanceRequestRecord:", error);
    throw new Error("Failed to submit maintenance request.", { cause: error });
  }
}

export async function updateMaintenanceRequestRecord(
  id: number,
  data: {
    status?: string;
    priority?: string;
    resolutionNotes?: string;
    resolvedBy?: number;
  }
) {
  try {
    const isResolved = data.status === "resolved" || data.status === "closed";
    const [updated] = await db
      .update(maintenanceRequests)
      .set({
        ...(data.status !== undefined ? { status: data.status } : {}),
        ...(data.priority !== undefined ? { priority: data.priority } : {}),
        ...(data.resolutionNotes !== undefined
          ? { resolutionNotes: data.resolutionNotes.trim() || null }
          : {}),
        ...(isResolved && data.resolvedBy
          ? { resolvedBy: data.resolvedBy, resolvedAt: new Date() }
          : {}),
        updatedAt: new Date(),
      })
      .where(eq(maintenanceRequests.id, id))
      .returning();
    return updated;
  } catch (error) {
    console.error("Database query failed in updateMaintenanceRequestRecord:", error);
    throw new Error("Failed to update maintenance request.", { cause: error });
  }
}

// Hall Maintenance Blocks
export async function getAllHallBlocks() {
  try {
    return await db
      .select({
        id: hallBlocks.id,
        hallId: hallBlocks.hallId,
        hallName: halls.name,
        building: halls.building,
        reason: hallBlocks.reason,
        startDate: hallBlocks.startDate,
        endDate: hallBlocks.endDate,
        startTime: hallBlocks.startTime,
        endTime: hallBlocks.endTime,
        isActive: hallBlocks.isActive,
        createdBy: hallBlocks.createdBy,
        creatorName: users.fullName,
        createdAt: hallBlocks.createdAt,
      })
      .from(hallBlocks)
      .innerJoin(halls, eq(hallBlocks.hallId, halls.id))
      .innerJoin(users, eq(hallBlocks.createdBy, users.id))
      .orderBy(desc(hallBlocks.startDate));
  } catch (error) {
    console.error("Database query failed in getAllHallBlocks:", error);
    throw new Error("Failed to retrieve hall maintenance blocks.", { cause: error });
  }
}

export async function createHallBlockRecord(data: {
  hallId: number;
  reason: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  createdBy: number;
}) {
  try {
    if (data.endDate < data.startDate) {
      throw new Error("Block end date must be on or after the start date.");
    }
    if (data.startDate === data.endDate && data.endTime <= data.startTime) {
      throw new Error("Block end time must be later than start time.");
    }
    const [created] = await db
      .insert(hallBlocks)
      .values({
        hallId: data.hallId,
        reason: data.reason.trim(),
        startDate: data.startDate,
        endDate: data.endDate,
        startTime: data.startTime || "00:00",
        endTime: data.endTime || "23:59",
        isActive: true,
        createdBy: data.createdBy,
      })
      .returning();
    return created;
  } catch (error: any) {
    console.error("Database query failed in createHallBlockRecord:", error);
    throw new Error(error.message || "Failed to create hall maintenance block.", {
      cause: error,
    });
  }
}

export async function toggleHallBlockRecord(id: number, isActive: boolean) {
  try {
    const [updated] = await db
      .update(hallBlocks)
      .set({ isActive })
      .where(eq(hallBlocks.id, id))
      .returning();
    return updated;
  } catch (error) {
    console.error("Database query failed in toggleHallBlockRecord:", error);
    throw new Error("Failed to update hall maintenance block.", { cause: error });
  }
}

// Notifications
export async function getUserNotifications(userId: number) {
  try {
    return await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
  } catch (error) {
    console.error("Database query failed in getUserNotifications:", error);
    throw new Error("Failed to retrieve notifications.", { cause: error });
  }
}

export async function markNotificationRead(id: number, userId: number) {
  try {
    const [updated] = await db
      .update(notifications)
      .set({ isRead: true })
      .where(and(eq(notifications.id, id), eq(notifications.userId, userId)))
      .returning();
    return updated;
  } catch (error) {
    console.error("Database query failed in markNotificationRead:", error);
    throw new Error("Failed to mark notification as read.", { cause: error });
  }
}

export async function markAllNotificationsRead(userId: number) {
  try {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.userId, userId));
  } catch (error) {
    console.error("Database query failed in markAllNotificationsRead:", error);
    throw new Error("Failed to mark notifications as read.", { cause: error });
  }
}

// Booking History
export async function getBookingHistoryList(userIdFilter?: number) {
  try {
    const rows = await db
      .select({
        id: bookingHistory.id,
        bookingId: bookingHistory.bookingId,
        eventName: bookings.eventName,
        bookingDate: bookings.bookingDate,
        startTime: bookings.startTime,
        endTime: bookings.endTime,
        hallName: halls.name,
        bookingOwnerId: bookings.userId,
        action: bookingHistory.action,
        previousStatus: bookingHistory.previousStatus,
        newStatus: bookingHistory.newStatus,
        changedBy: bookingHistory.changedBy,
        actorName: users.fullName,
        actorRole: users.role,
        remarks: bookingHistory.remarks,
        createdAt: bookingHistory.createdAt,
      })
      .from(bookingHistory)
      .innerJoin(bookings, eq(bookingHistory.bookingId, bookings.id))
      .innerJoin(halls, eq(bookings.hallId, halls.id))
      .innerJoin(users, eq(bookingHistory.changedBy, users.id))
      .orderBy(desc(bookingHistory.createdAt));

    if (userIdFilter) {
      return rows.filter((r) => r.bookingOwnerId === userIdFilter);
    }
    return rows;
  } catch (error) {
    console.error("Database query failed in getBookingHistoryList:", error);
    throw new Error("Failed to retrieve booking history.", { cause: error });
  }
}

// Audit Logs
export async function getAuditLogsList() {
  try {
    return await db
      .select({
        id: auditLogs.id,
        userId: auditLogs.userId,
        userName: users.fullName,
        userEmail: users.email,
        userRole: users.role,
        action: auditLogs.action,
        entityType: auditLogs.entityType,
        entityId: auditLogs.entityId,
        details: auditLogs.details,
        ipAddress: auditLogs.ipAddress,
        createdAt: auditLogs.createdAt,
      })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.userId, users.id))
      .orderBy(desc(auditLogs.createdAt))
      .limit(250);
  } catch (error) {
    console.error("Database query failed in getAuditLogsList:", error);
    throw new Error("Failed to retrieve system audit logs.", { cause: error });
  }
}

// Dashboard Statistics (Calculated 100% from real PostgreSQL records)
export async function getDashboardStatistics(userId: number, role: "admin" | "faculty") {
  try {
    const todayStr = new Date().toISOString().split("T")[0];

    const allHalls = await db.select().from(halls);
    const allUsers = await db.select().from(users);
    const allBookings = await db
      .select({
        id: bookings.id,
        hallId: bookings.hallId,
        hallName: halls.name,
        userId: bookings.userId,
        organizerName: users.fullName,
        eventName: bookings.eventName,
        eventType: bookings.eventType,
        bookingDate: bookings.bookingDate,
        startTime: bookings.startTime,
        endTime: bookings.endTime,
        expectedAttendees: bookings.expectedAttendees,
        status: bookings.status,
        createdAt: bookings.createdAt,
      })
      .from(bookings)
      .innerJoin(halls, eq(bookings.hallId, halls.id))
      .innerJoin(users, eq(bookings.userId, users.id))
      .orderBy(asc(bookings.bookingDate), asc(bookings.startTime));

    const allMaintenance = await db.select().from(maintenanceRequests);
    const allResources = await db.select().from(resources);
    const userNotifs = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(10);

    if (role === "admin") {
      const totalHalls = allHalls.length;
      const activeHalls = allHalls.filter((h) => h.isActive).length;
      const activeFaculty = allUsers.filter(
        (u) => u.role === "faculty" && u.accountStatus === "active"
      ).length;
      const upcomingBookings = allBookings.filter(
        (b) => b.bookingDate >= todayStr && (b.status === "approved" || b.status === "pending")
      );
      const pendingBookings = allBookings.filter((b) => b.status === "pending");
      const openMaintenance = allMaintenance.filter(
        (m) => m.status === "open" || m.status === "in_progress"
      );
      const availableResourcesCount = allResources.filter(
        (r) => r.status === "available" && r.availableQuantity > 0
      ).length;

      return {
        role: "admin",
        metrics: {
          totalHalls,
          activeHalls,
          activeFaculty,
          upcomingBookingsCount: upcomingBookings.length,
          pendingBookingsCount: pendingBookings.length,
          openMaintenanceCount: openMaintenance.length,
          totalResourcesCount: allResources.length,
          availableResourcesCount,
        },
        upcomingBookings: upcomingBookings.slice(0, 8),
        pendingBookings: pendingBookings.slice(0, 8),
        recentNotifications: userNotifs,
      };
    } else {
      const myBookings = allBookings.filter((b) => b.userId === userId);
      const myUpcoming = myBookings.filter(
        (b) => b.bookingDate >= todayStr && (b.status === "approved" || b.status === "pending")
      );
      const myPending = myBookings.filter((b) => b.status === "pending");
      const myApproved = myBookings.filter((b) => b.status === "approved");

      return {
        role: "faculty",
        metrics: {
          totalPersonalBookings: myBookings.length,
          upcomingPersonalCount: myUpcoming.length,
          pendingPersonalCount: myPending.length,
          approvedPersonalCount: myApproved.length,
          activeHallsCount: allHalls.filter((h) => h.isActive).length,
        },
        upcomingBookings: myUpcoming.slice(0, 8),
        recentBookings: [...myBookings]
          .sort((a, b) => (a.bookingDate < b.bookingDate ? 1 : -1))
          .slice(0, 8),
        recentNotifications: userNotifs,
      };
    }
  } catch (error) {
    console.error("Database query failed in getDashboardStatistics:", error);
    throw new Error("Failed to calculate dashboard statistics.", { cause: error });
  }
}

// Reports (Calculated strictly from real database queries for selected date range)
export async function generateSystemReport(params: {
  startDate?: string;
  endDate?: string;
}) {
  try {
    const allBookings = await db
      .select({
        id: bookings.id,
        hallId: bookings.hallId,
        hallName: halls.name,
        building: halls.building,
        capacity: halls.capacity,
        eventName: bookings.eventName,
        eventType: bookings.eventType,
        organizerName: users.fullName,
        departmentName: departments.name,
        bookingDate: bookings.bookingDate,
        startTime: bookings.startTime,
        endTime: bookings.endTime,
        expectedAttendees: bookings.expectedAttendees,
        status: bookings.status,
      })
      .from(bookings)
      .innerJoin(halls, eq(bookings.hallId, halls.id))
      .innerJoin(users, eq(bookings.userId, users.id))
      .leftJoin(departments, eq(users.departmentId, departments.id))
      .orderBy(desc(bookings.bookingDate));

    const filteredBookings = allBookings.filter((b) => {
      if (params.startDate && b.bookingDate < params.startDate) return false;
      if (params.endDate && b.bookingDate > params.endDate) return false;
      return true;
    });

    const allHalls = await db.select().from(halls).orderBy(asc(halls.name));
    const allMaintenance = await db.select().from(maintenanceRequests);
    const allBookingResources = await db
      .select({
        bookingId: bookingResources.bookingId,
        resourceId: bookingResources.resourceId,
        resourceName: resources.name,
        category: resources.category,
        quantityRequested: bookingResources.quantityRequested,
      })
      .from(bookingResources)
      .innerJoin(resources, eq(bookingResources.resourceId, resources.id));

    // Status Summary
    const statusSummary = {
      total: filteredBookings.length,
      approved: filteredBookings.filter((b) => b.status === "approved").length,
      pending: filteredBookings.filter((b) => b.status === "pending").length,
      rejected: filteredBookings.filter((b) => b.status === "rejected").length,
      cancelled: filteredBookings.filter((b) => b.status === "cancelled").length,
    };

    // Hall Utilization
    const hallUtilization = allHalls.map((h) => {
      const hallBookings = filteredBookings.filter((b) => b.hallId === h.id);
      const approvedBookings = hallBookings.filter((b) => b.status === "approved");
      const totalAttendees = approvedBookings.reduce(
        (sum, b) => sum + b.expectedAttendees,
        0
      );
      return {
        hallId: h.id,
        hallName: h.name,
        code: h.code,
        building: h.building,
        capacity: h.capacity,
        totalRequests: hallBookings.length,
        approvedBookingsCount: approvedBookings.length,
        totalAttendeesServed: totalAttendees,
      };
    });

    // Maintenance Summary
    const maintenanceSummary = {
      total: allMaintenance.length,
      open: allMaintenance.filter((m) => m.status === "open").length,
      inProgress: allMaintenance.filter((m) => m.status === "in_progress").length,
      resolved: allMaintenance.filter(
        (m) => m.status === "resolved" || m.status === "closed"
      ).length,
      highPriority: allMaintenance.filter(
        (m) => m.priority === "high" || m.priority === "critical"
      ).length,
    };

    // Resource Usage
    const filteredBookingIds = new Set(filteredBookings.map((b) => b.id));
    const relevantResourceReqs = allBookingResources.filter((br) =>
      filteredBookingIds.has(br.bookingId)
    );
    const resourceUsageMap = new Map<
      number,
      { resourceId: number; resourceName: string; category: string; timesRequested: number; totalUnitsRequested: number }
    >();

    for (const r of relevantResourceReqs) {
      const existing = resourceUsageMap.get(r.resourceId) || {
        resourceId: r.resourceId,
        resourceName: r.resourceName,
        category: r.category,
        timesRequested: 0,
        totalUnitsRequested: 0,
      };
      existing.timesRequested += 1;
      existing.totalUnitsRequested += r.quantityRequested;
      resourceUsageMap.set(r.resourceId, existing);
    }

    return {
      hasData:
        filteredBookings.length > 0 ||
        allMaintenance.length > 0 ||
        relevantResourceReqs.length > 0,
      bookings: filteredBookings,
      statusSummary,
      hallUtilization,
      maintenanceSummary,
      resourceUsage: Array.from(resourceUsageMap.values()),
    };
  } catch (error) {
    console.error("Database query failed in generateSystemReport:", error);
    throw new Error("Failed to generate system reports.", { cause: error });
  }
}

// Rule-Based Smart Hall Recommendation Engine (grounded in actual PostgreSQL records)
export async function getSmartHallRecommendations(params: {
  userId: number;
  date: string;
  startTime: string;
  endTime: string;
  expectedAttendees: number;
  requireAc?: boolean;
  requireProjector?: boolean;
  requireSound?: boolean;
}) {
  try {
    const availabilityList = await searchAvailableHalls({
      date: params.date,
      startTime: params.startTime,
      endTime: params.endTime,
      minCapacity: params.expectedAttendees,
      requireAc: params.requireAc,
      requireProjector: params.requireProjector,
      requireSound: params.requireSound,
    });

    const availableCandidates = availabilityList.filter((h) => h.isAvailable);

    // Score each available hall based on capacity fitefficiency (minimize wasted seats while fitting all attendees) and facility completeness
    const scoredHalls = availableCandidates
      .map((hall) => {
        const capacityRatio = params.expectedAttendees / hall.capacity; // Closer to 0.75-1.0 is optimal fit
        let score = Math.round(capacityRatio * 70);
        if (hall.hasAc) score += 10;
        if (hall.hasProjector) score += 10;
        if (hall.hasSoundSystem) score += 10;
        score = Math.min(100, Math.max(10, score));

        const spareSeats = hall.capacity - params.expectedAttendees;
        const reasons: string[] = [
          `Available on ${params.date} from ${params.startTime} to ${params.endTime}`,
          `Optimal capacity fit: seats ${hall.capacity} (${spareSeats} buffer seats for ${params.expectedAttendees} attendees)`,
        ];
        if (hall.hasAc && hall.hasProjector && hall.hasSoundSystem) {
          reasons.push("Equipped with AC, Projector, and PA Sound System");
        }
        if (hall.resources && hall.resources.length > 0) {
          reasons.push(
            `Includes ${hall.resources.length} assigned equipment item(s)`
          );
        }

        return {
          ...hall,
          matchScore: score,
          reasoning: reasons.join(" · "),
        };
      })
      .sort((a, b) => b.matchScore - a.matchScore);

    // Record top recommendation in ai_recommendations table if a match exists
    if (scoredHalls.length > 0) {
      const top = scoredHalls[0];
      await db.insert(aiRecommendations).values({
        userId: params.userId,
        requestedDate: params.date,
        requestedStartTime: params.startTime,
        requestedEndTime: params.endTime,
        expectedAttendees: params.expectedAttendees,
        requiredFacilities: [
          params.requireAc ? "AC" : null,
          params.requireProjector ? "Projector" : null,
          params.requireSound ? "Sound System" : null,
        ]
          .filter(Boolean)
          .join(", "),
        recommendedHallId: top.id,
        matchScore: top.matchScore,
        reasoning: top.reasoning,
      });
    }

    return {
      recommendations: scoredHalls,
      unavailableHalls: availabilityList.filter((h) => !h.isAvailable),
    };
  } catch (error) {
    console.error("Database query failed in getSmartHallRecommendations:", error);
    throw new Error("Failed to compute hall recommendations.", { cause: error });
  }
}
