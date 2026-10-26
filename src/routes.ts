import { Router, Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "./db/index.ts";
import { bookings, departments, halls, users } from "./db/schema.ts";
import {
  AuthRequest,
  getOrCreateFirebaseUser,
  requireAdmin,
  requireAuth,
  signJwtToken,
} from "./middleware/auth.ts";
import { adminAuth } from "./lib/firebase-admin.ts";
import {
  checkSystemStatus,
  createBookingTransaction,
  createDepartmentRecord,
  createNotification,
  getAllDepartments,
  getAllHallsWithDetails,
  getAllUsersWithDepartments,
  getBookingsList,
  getHallByIdWithDetails,
  logAuditAction,
  searchAvailableHalls,
  updateBookingStatusTransaction,
  updateDepartmentRecord,
} from "./db/queries.ts";
import {
  assignResourceToHall,
  createHallBlockRecord,
  createMaintenanceRequestRecord,
  createResourceRecord,
  generateSystemReport,
  getAllHallBlocks,
  getAllResources,
  getAuditLogsList,
  getBookingHistoryList,
  getDashboardStatistics,
  getMaintenanceRequestsList,
  getSmartHallRecommendations,
  getUserNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  removeResourceFromHall,
  toggleHallBlockRecord,
  updateMaintenanceRequestRecord,
  updateResourceRecord,
} from "./db/operations.ts";

export const apiRouter = Router();

// 1. System Initialization Check (Public)
apiRouter.get("/system/status", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const status = await checkSystemStatus();
    res.json(status);
  } catch (error) {
    next(error);
  }
});

// 2. First-Time Administrator Setup (Only works when 0 administrators exist in DB)
apiRouter.post("/auth/setup-initial-admin", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { fullName, email, password, designation } = req.body;
    if (!fullName || !email || !password) {
      return res.status(400).json({ error: "Full name, email, and password are required." });
    }
    if (String(password).length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters long." });
    }

    const status = await checkSystemStatus();
    if (status.hasAdmin) {
      return res.status(403).json({
        error: "Initial administrator setup has already been completed. Please sign in.",
      });
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const existing = await db.select().from(users).where(eq(users.email, normalizedEmail));
    if (existing.length > 0) {
      return res.status(400).json({ error: "Email address is already registered." });
    }

    const passwordHash = await bcrypt.hash(String(password), 12);
    const uid = `admin_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    const [created] = await db
      .insert(users)
      .values({
        uid,
        fullName: String(fullName).trim(),
        email: normalizedEmail,
        passwordHash,
        role: "admin",
        designation: designation ? String(designation).trim() : "System Administrator",
        accountStatus: "active",
      })
      .returning();

    await logAuditAction({
      userId: created.id,
      action: "INITIALIZE_ADMIN",
      entityType: "user",
      entityId: created.id,
      details: `First administrator account (${normalizedEmail}) initialized.`,
      ipAddress: req.ip,
    });

    const authUser = {
      id: created.id,
      uid: created.uid,
      fullName: created.fullName,
      email: created.email,
      role: created.role as "admin" | "faculty",
      departmentId: created.departmentId,
      designation: created.designation,
      accountStatus: created.accountStatus,
    };

    const token = signJwtToken(authUser);
    res.status(201).json({ user: authUser, token });
  } catch (error) {
    next(error);
  }
});

// 3. Authentication: Email & Password Login (JWT + Bcrypt)
apiRouter.post("/auth/login", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const foundUsers = await db.select().from(users).where(eq(users.email, normalizedEmail));

    if (foundUsers.length === 0) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const userRecord = foundUsers[0];
    if (!userRecord.passwordHash) {
      return res.status(401).json({
        error: "This account uses Google Sign-In or does not have a password set.",
      });
    }

    const isValid = await bcrypt.compare(String(password), userRecord.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    if (userRecord.accountStatus !== "active") {
      return res.status(403).json({
        error: `Account is currently ${userRecord.accountStatus}. Contact the Administrator.`,
      });
    }

    const authUser = {
      id: userRecord.id,
      uid: userRecord.uid,
      fullName: userRecord.fullName,
      email: userRecord.email,
      role: userRecord.role as "admin" | "faculty",
      departmentId: userRecord.departmentId,
      designation: userRecord.designation,
      accountStatus: userRecord.accountStatus,
    };

    const token = signJwtToken(authUser);

    await logAuditAction({
      userId: userRecord.id,
      action: "USER_LOGIN",
      entityType: "user",
      entityId: userRecord.id,
      details: `User ${userRecord.email} (${userRecord.role}) signed in via email/password.`,
      ipAddress: req.ip,
    });

    res.json({ user: authUser, token });
  } catch (error) {
    next(error);
  }
});

// 4. Authentication: Google Sign-In Token Exchange
apiRouter.post("/auth/google", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { idToken } = req.body;
    if (!idToken) {
      return res.status(400).json({ error: "Firebase ID token is required." });
    }

    const decoded = await adminAuth.verifyIdToken(idToken);
    if (!decoded.email) {
      return res.status(400).json({ error: "Google account must have a verified email." });
    }

    const dbUser = await getOrCreateFirebaseUser(decoded.uid, decoded.email, decoded.name);
    if (dbUser.accountStatus !== "active") {
      return res.status(403).json({
        error: `Account is ${dbUser.accountStatus}. Contact the Administrator.`,
      });
    }

    const token = signJwtToken(dbUser);

    await logAuditAction({
      userId: dbUser.id,
      action: "USER_GOOGLE_LOGIN",
      entityType: "user",
      entityId: dbUser.id,
      details: `User ${dbUser.email} (${dbUser.role}) signed in via Google Auth.`,
      ipAddress: req.ip,
    });

    res.json({ user: dbUser, token });
  } catch (error) {
    next(error);
  }
});

// 5. Current User Profile
apiRouter.get("/auth/me", requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const u = req.user!;
    let departmentName: string | null = null;
    if (u.departmentId) {
      const deptRows = await db
        .select()
        .from(departments)
        .where(eq(departments.id, u.departmentId));
      if (deptRows.length > 0) departmentName = deptRows[0].name;
    }
    res.json({ user: { ...u, departmentName } });
  } catch (error) {
    next(error);
  }
});

// Update Current User Password / Profile
apiRouter.put("/auth/profile", requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { fullName, phone, designation, newPassword } = req.body;
    const updates: Record<string, any> = { updatedAt: new Date() };

    if (fullName && String(fullName).trim()) {
      updates.fullName = String(fullName).trim();
    }
    if (phone !== undefined) {
      updates.phone = phone ? String(phone).trim() : null;
    }
    if (designation !== undefined) {
      updates.designation = designation ? String(designation).trim() : null;
    }
    if (newPassword) {
      if (String(newPassword).length < 8) {
        return res.status(400).json({ error: "New password must be at least 8 characters." });
      }
      updates.passwordHash = await bcrypt.hash(String(newPassword), 12);
    }

    const [updated] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, req.user!.id))
      .returning();

    res.json({
      user: {
        id: updated.id,
        uid: updated.uid,
        fullName: updated.fullName,
        email: updated.email,
        role: updated.role,
        departmentId: updated.departmentId,
        designation: updated.designation,
        phone: updated.phone,
        accountStatus: updated.accountStatus,
      },
    });
  } catch (error) {
    next(error);
  }
});

// 6. Departments Endpoints
apiRouter.get("/departments", requireAuth, async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const list = await getAllDepartments();
    res.json({ departments: list });
  } catch (error) {
    next(error);
  }
});

apiRouter.post(
  "/departments",
  requireAuth,
  requireAdmin,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { name, code, headOfDepartment, description } = req.body;
      if (!name || !code) {
        return res.status(400).json({ error: "Department name and code are required." });
      }
      const created = await createDepartmentRecord({
        name: String(name),
        code: String(code),
        headOfDepartment: headOfDepartment ? String(headOfDepartment) : undefined,
        description: description ? String(description) : undefined,
      });

      await logAuditAction({
        userId: req.user!.id,
        action: "CREATE_DEPARTMENT",
        entityType: "department",
        entityId: created.id,
        details: `Created department "${created.name}" (${created.code}).`,
        ipAddress: req.ip,
      });

      res.status(201).json({ department: created });
    } catch (error) {
      next(error);
    }
  }
);

apiRouter.put(
  "/departments/:id",
  requireAuth,
  requireAdmin,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid department ID." });

      const updated = await updateDepartmentRecord(id, req.body);
      if (!updated) return res.status(404).json({ error: "Department not found." });

      await logAuditAction({
        userId: req.user!.id,
        action: "UPDATE_DEPARTMENT",
        entityType: "department",
        entityId: updated.id,
        details: `Updated department "${updated.name}" (${updated.code}).`,
        ipAddress: req.ip,
      });

      res.json({ department: updated });
    } catch (error) {
      next(error);
    }
  }
);

// 7. Faculty & User Management Endpoints (Admin Only)
apiRouter.get(
  "/users",
  requireAuth,
  requireAdmin,
  async (_req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const list = await getAllUsersWithDepartments();
      res.json({ users: list });
    } catch (error) {
      next(error);
    }
  }
);

apiRouter.post(
  "/users",
  requireAuth,
  requireAdmin,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { fullName, email, password, role, departmentId, designation, phone } = req.body;
      if (!fullName || !email || !password) {
        return res
          .status(400)
          .json({ error: "Full name, email, and initial password are required." });
      }
      if (String(password).length < 8) {
        return res
          .status(400)
          .json({ error: "Password must be at least 8 characters long." });
      }

      const normalizedEmail = String(email).toLowerCase().trim();
      const existing = await db.select().from(users).where(eq(users.email, normalizedEmail));
      if (existing.length > 0) {
        return res
          .status(400)
          .json({ error: "A user with this email address already exists." });
      }

      const passwordHash = await bcrypt.hash(String(password), 12);
      const assignedRole = role === "admin" ? "admin" : "faculty";
      const uid = `${assignedRole}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

      const [created] = await db
        .insert(users)
        .values({
          uid,
          fullName: String(fullName).trim(),
          email: normalizedEmail,
          passwordHash,
          role: assignedRole,
          departmentId: departmentId ? Number(departmentId) : null,
          designation: designation ? String(designation).trim() : "Assistant Professor",
          phone: phone ? String(phone).trim() : null,
          accountStatus: "active",
        })
        .returning();

      await logAuditAction({
        userId: req.user!.id,
        action: "CREATE_USER_ACCOUNT",
        entityType: "user",
        entityId: created.id,
        details: `Created ${assignedRole} account for ${created.fullName} (${created.email}).`,
        ipAddress: req.ip,
      });

      res.status(201).json({
        user: {
          id: created.id,
          uid: created.uid,
          fullName: created.fullName,
          email: created.email,
          role: created.role,
          departmentId: created.departmentId,
          designation: created.designation,
          phone: created.phone,
          accountStatus: created.accountStatus,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

apiRouter.put(
  "/users/:id",
  requireAuth,
  requireAdmin,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid user ID." });

      const { fullName, role, departmentId, designation, phone, accountStatus, password } =
        req.body;

      const updateFields: Record<string, any> = { updatedAt: new Date() };
      if (fullName !== undefined) updateFields.fullName = String(fullName).trim();
      if (role === "admin" || role === "faculty") updateFields.role = role;
      if (departmentId !== undefined)
        updateFields.departmentId = departmentId ? Number(departmentId) : null;
      if (designation !== undefined)
        updateFields.designation = designation ? String(designation).trim() : null;
      if (phone !== undefined) updateFields.phone = phone ? String(phone).trim() : null;
      if (accountStatus !== undefined) updateFields.accountStatus = accountStatus;
      if (password && String(password).length >= 8) {
        updateFields.passwordHash = await bcrypt.hash(String(password), 12);
      }

      const [updated] = await db
        .update(users)
        .set(updateFields)
        .where(eq(users.id, id))
        .returning();

      if (!updated) return res.status(404).json({ error: "User not found." });

      await logAuditAction({
        userId: req.user!.id,
        action: "UPDATE_USER_ACCOUNT",
        entityType: "user",
        entityId: updated.id,
        details: `Updated user account ${updated.email} (status: ${updated.accountStatus}, role: ${updated.role}).`,
        ipAddress: req.ip,
      });

      res.json({ user: updated });
    } catch (error) {
      next(error);
    }
  }
);

// 8. Seminar Halls Endpoints
apiRouter.get("/halls", requireAuth, async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const list = await getAllHallsWithDetails();
    res.json({ halls: list });
  } catch (error) {
    next(error);
  }
});

apiRouter.get(
  "/halls/availability",
  requireAuth,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const {
        date,
        startTime,
        endTime,
        minCapacity,
        requireAc,
        requireProjector,
        requireSound,
      } = req.query;

      if (!date || !startTime || !endTime) {
        return res
          .status(400)
          .json({ error: "Date, start time, and end time are required to check availability." });
      }

      if (String(endTime) <= String(startTime)) {
        return res
          .status(400)
          .json({ error: "End time must be later than start time." });
      }

      const results = await searchAvailableHalls({
        date: String(date),
        startTime: String(startTime),
        endTime: String(endTime),
        minCapacity: minCapacity ? Number(minCapacity) : undefined,
        requireAc: requireAc === "true",
        requireProjector: requireProjector === "true",
        requireSound: requireSound === "true",
      });

      res.json({ halls: results });
    } catch (error) {
      next(error);
    }
  }
);

apiRouter.get(
  "/halls/:id",
  requireAuth,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid hall ID." });

      const hall = await getHallByIdWithDetails(id);
      if (!hall) return res.status(404).json({ error: "Seminar hall not found." });

      res.json({ hall });
    } catch (error) {
      next(error);
    }
  }
);

apiRouter.post(
  "/halls",
  requireAuth,
  requireAdmin,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const {
        name,
        code,
        building,
        floor,
        capacity,
        description,
        hasAc,
        hasProjector,
        hasSoundSystem,
        requiresApproval,
        isActive,
      } = req.body;

      if (!name || !code || !building || !capacity) {
        return res
          .status(400)
          .json({ error: "Hall name, code, building, and capacity are required." });
      }

      const capNum = Number(capacity);
      if (isNaN(capNum) || capNum <= 0) {
        return res.status(400).json({ error: "Capacity must be a positive number." });
      }

      const [created] = await db
        .insert(halls)
        .values({
          name: String(name).trim(),
          code: String(code).trim().toUpperCase(),
          building: String(building).trim(),
          floor: floor ? String(floor).trim() : "Ground Floor",
          capacity: capNum,
          description: description ? String(description).trim() : null,
          hasAc: hasAc !== undefined ? Boolean(hasAc) : true,
          hasProjector: hasProjector !== undefined ? Boolean(hasProjector) : true,
          hasSoundSystem: hasSoundSystem !== undefined ? Boolean(hasSoundSystem) : true,
          requiresApproval: requiresApproval !== undefined ? Boolean(requiresApproval) : true,
          isActive: isActive !== undefined ? Boolean(isActive) : true,
        })
        .returning();

      await logAuditAction({
        userId: req.user!.id,
        action: "CREATE_HALL",
        entityType: "hall",
        entityId: created.id,
        details: `Registered seminar hall "${created.name}" (${created.code}), Capacity: ${created.capacity}.`,
        ipAddress: req.ip,
      });

      res.status(201).json({ hall: created });
    } catch (error: any) {
      if (error?.code === "23505") {
        return res
          .status(400)
          .json({ error: "A seminar hall with this name or code already exists." });
      }
      next(error);
    }
  }
);

apiRouter.put(
  "/halls/:id",
  requireAuth,
  requireAdmin,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid hall ID." });

      const {
        name,
        code,
        building,
        floor,
        capacity,
        description,
        hasAc,
        hasProjector,
        hasSoundSystem,
        requiresApproval,
        isActive,
      } = req.body;

      const updates: Record<string, any> = { updatedAt: new Date() };
      if (name !== undefined) updates.name = String(name).trim();
      if (code !== undefined) updates.code = String(code).trim().toUpperCase();
      if (building !== undefined) updates.building = String(building).trim();
      if (floor !== undefined) updates.floor = String(floor).trim();
      if (capacity !== undefined) {
        const capNum = Number(capacity);
        if (isNaN(capNum) || capNum <= 0) {
          return res.status(400).json({ error: "Capacity must be greater than zero." });
        }
        updates.capacity = capNum;
      }
      if (description !== undefined)
        updates.description = description ? String(description).trim() : null;
      if (hasAc !== undefined) updates.hasAc = Boolean(hasAc);
      if (hasProjector !== undefined) updates.hasProjector = Boolean(hasProjector);
      if (hasSoundSystem !== undefined) updates.hasSoundSystem = Boolean(hasSoundSystem);
      if (requiresApproval !== undefined) updates.requiresApproval = Boolean(requiresApproval);
      if (isActive !== undefined) updates.isActive = Boolean(isActive);

      const [updated] = await db
        .update(halls)
        .set(updates)
        .where(eq(halls.id, id))
        .returning();

      if (!updated) return res.status(404).json({ error: "Seminar hall not found." });

      await logAuditAction({
        userId: req.user!.id,
        action: "UPDATE_HALL",
        entityType: "hall",
        entityId: updated.id,
        details: `Updated seminar hall "${updated.name}" (Active: ${updated.isActive}, Capacity: ${updated.capacity}).`,
        ipAddress: req.ip,
      });

      res.json({ hall: updated });
    } catch (error: any) {
      if (error?.code === "23505") {
        return res
          .status(400)
          .json({ error: "A seminar hall with this name or code already exists." });
      }
      next(error);
    }
  }
);

// Associate Resource with Hall
apiRouter.post(
  "/halls/:id/resources",
  requireAuth,
  requireAdmin,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const hallId = Number(req.params.id);
      const { resourceId, quantity, conditionStatus } = req.body;
      if (isNaN(hallId) || !resourceId) {
        return res.status(400).json({ error: "Hall ID and Resource ID are required." });
      }

      const assigned = await assignResourceToHall({
        hallId,
        resourceId: Number(resourceId),
        quantity: Number(quantity) || 1,
        conditionStatus,
      });

      await logAuditAction({
        userId: req.user!.id,
        action: "ASSIGN_HALL_RESOURCE",
        entityType: "hall",
        entityId: hallId,
        details: `Assigned resource #${resourceId} (Qty: ${assigned.quantity}) to hall #${hallId}.`,
        ipAddress: req.ip,
      });

      res.status(201).json({ hallResource: assigned });
    } catch (error) {
      next(error);
    }
  }
);

apiRouter.delete(
  "/halls/:id/resources/:resourceId",
  requireAuth,
  requireAdmin,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const hallId = Number(req.params.id);
      const resourceId = Number(req.params.resourceId);
      await removeResourceFromHall(hallId, resourceId);
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }
);

// 9. Bookings Endpoints
apiRouter.get("/bookings", requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { myOnly, hallId, status, startDate, endDate } = req.query;
    const filters: any = {};

    if (myOnly === "true") {
      filters.userId = req.user!.id;
    }
    if (hallId) filters.hallId = Number(hallId);
    if (status) filters.status = String(status);
    if (startDate) filters.startDate = String(startDate);
    if (endDate) filters.endDate = String(endDate);

    const list = await getBookingsList(filters);
    res.json({ bookings: list });
  } catch (error) {
    next(error);
  }
});

apiRouter.post("/bookings", requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const {
      hallId,
      eventName,
      eventDescription,
      eventType,
      expectedAttendees,
      bookingDate,
      startTime,
      endTime,
      requiredResourcesNotes,
      requestedResources,
    } = req.body;

    if (!hallId || !eventName || !expectedAttendees || !bookingDate || !startTime || !endTime) {
      return res.status(400).json({
        error:
          "Hall, event name, expected attendees, date, start time, and end time are required.",
      });
    }

    const created = await createBookingTransaction({
      hallId: Number(hallId),
      userId: req.user!.id,
      userRole: req.user!.role,
      eventName: String(eventName),
      eventDescription: eventDescription ? String(eventDescription) : undefined,
      eventType: eventType ? String(eventType) : "Seminar",
      expectedAttendees: Number(expectedAttendees),
      bookingDate: String(bookingDate),
      startTime: String(startTime),
      endTime: String(endTime),
      requiredResourcesNotes: requiredResourcesNotes
        ? String(requiredResourcesNotes)
        : undefined,
      requestedResources: Array.isArray(requestedResources) ? requestedResources : [],
    });

    await logAuditAction({
      userId: req.user!.id,
      action: "CREATE_BOOKING",
      entityType: "booking",
      entityId: created.id,
      details: `Created booking "${created.event_name}" for hall #${created.hall_id} on ${created.booking_date} (${created.start_time}–${created.end_time}).`,
      ipAddress: req.ip,
    });

    res.status(201).json({ booking: created });
  } catch (error: any) {
    res.status(400).json({ error: error.message || "Failed to create booking." });
  }
});

apiRouter.patch(
  "/bookings/:id/status",
  requireAuth,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const bookingId = Number(req.params.id);
      const { status, remarks } = req.body;

      if (isNaN(bookingId) || !["approved", "rejected", "cancelled"].includes(status)) {
        return res.status(400).json({
          error: "Valid booking ID and target status (approved, rejected, cancelled) are required.",
        });
      }

      const updated = await updateBookingStatusTransaction({
        bookingId,
        actorId: req.user!.id,
        actorRole: req.user!.role,
        newStatus: status,
        remarks: remarks ? String(remarks) : undefined,
      });

      await logAuditAction({
        userId: req.user!.id,
        action: `BOOKING_${String(status).toUpperCase()}`,
        entityType: "booking",
        entityId: bookingId,
        details: `Booking #${bookingId} status updated to ${status}.${
          remarks ? ` Remarks: ${remarks}` : ""
        }`,
        ipAddress: req.ip,
      });

      res.json({ booking: updated });
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Failed to update booking status." });
    }
  }
);

apiRouter.get(
  "/bookings/history",
  requireAuth,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userIdFilter =
        req.user!.role === "admin" && req.query.all === "true"
          ? undefined
          : req.user!.id;
      const history = await getBookingHistoryList(userIdFilter);
      res.json({ history });
    } catch (error) {
      next(error);
    }
  }
);

// 10. Resources Endpoints
apiRouter.get("/resources", requireAuth, async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const list = await getAllResources();
    res.json({ resources: list });
  } catch (error) {
    next(error);
  }
});

apiRouter.post(
  "/resources",
  requireAuth,
  requireAdmin,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { name, category, description, totalQuantity, availableQuantity, status } = req.body;
      if (!name) {
        return res.status(400).json({ error: "Resource name is required." });
      }
      const totalQty = Number(totalQuantity ?? 1);
      const availQty = Number(availableQuantity ?? totalQty);
      if (totalQty < 0 || availQty < 0 || availQty > totalQty) {
        return res.status(400).json({
          error: "Available quantity must be non-negative and cannot exceed total quantity.",
        });
      }

      const created = await createResourceRecord({
        name: String(name),
        category: category ? String(category) : "General",
        description: description ? String(description) : undefined,
        totalQuantity: totalQty,
        availableQuantity: availQty,
        status: status ? String(status) : "available",
      });

      await logAuditAction({
        userId: req.user!.id,
        action: "CREATE_RESOURCE",
        entityType: "resource",
        entityId: created.id,
        details: `Added equipment/resource "${created.name}" (Total: ${created.totalQuantity}).`,
        ipAddress: req.ip,
      });

      res.status(201).json({ resource: created });
    } catch (error) {
      next(error);
    }
  }
);

apiRouter.put(
  "/resources/:id",
  requireAuth,
  requireAdmin,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid resource ID." });

      const updated = await updateResourceRecord(id, req.body);
      if (!updated) return res.status(404).json({ error: "Resource not found." });

      await logAuditAction({
        userId: req.user!.id,
        action: "UPDATE_RESOURCE",
        entityType: "resource",
        entityId: updated.id,
        details: `Updated resource "${updated.name}" (Available: ${updated.availableQuantity}/${updated.totalQuantity}, Status: ${updated.status}).`,
        ipAddress: req.ip,
      });

      res.json({ resource: updated });
    } catch (error) {
      next(error);
    }
  }
);

// 11. Maintenance Requests Endpoints
apiRouter.get(
  "/maintenance",
  requireAuth,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const filterUserId = req.user!.role === "admin" ? undefined : req.user!.id;
      const list = await getMaintenanceRequestsList(filterUserId);
      res.json({ maintenanceRequests: list });
    } catch (error) {
      next(error);
    }
  }
);

apiRouter.post(
  "/maintenance",
  requireAuth,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { hallId, resourceId, title, issueDescription, priority } = req.body;
      if (!title || !issueDescription) {
        return res
          .status(400)
          .json({ error: "Issue title and detailed description are required." });
      }

      const created = await createMaintenanceRequestRecord({
        hallId: hallId ? Number(hallId) : null,
        resourceId: resourceId ? Number(resourceId) : null,
        reportedBy: req.user!.id,
        title: String(title),
        issueDescription: String(issueDescription),
        priority: priority ? String(priority) : "medium",
      });

      await logAuditAction({
        userId: req.user!.id,
        action: "SUBMIT_MAINTENANCE_REQUEST",
        entityType: "maintenance",
        entityId: created.id,
        details: `Submitted maintenance report: "${created.title}" (Priority: ${created.priority}).`,
        ipAddress: req.ip,
      });

      res.status(201).json({ maintenanceRequest: created });
    } catch (error) {
      next(error);
    }
  }
);

apiRouter.patch(
  "/maintenance/:id",
  requireAuth,
  requireAdmin,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid request ID." });

      const { status, priority, resolutionNotes } = req.body;
      const updated = await updateMaintenanceRequestRecord(id, {
        status,
        priority,
        resolutionNotes,
        resolvedBy: req.user!.id,
      });

      if (!updated) return res.status(404).json({ error: "Maintenance request not found." });

      await createNotification({
        userId: updated.reportedBy,
        title: `Maintenance Request Updated`,
        message: `Your maintenance report "${updated.title}" is now marked as ${updated.status}.${
          resolutionNotes ? ` Resolution: ${resolutionNotes}` : ""
        }`,
        type: "maintenance",
        relatedEntityId: updated.id,
      });

      await logAuditAction({
        userId: req.user!.id,
        action: "UPDATE_MAINTENANCE_REQUEST",
        entityType: "maintenance",
        entityId: updated.id,
        details: `Updated maintenance request #${updated.id} status to ${updated.status}.`,
        ipAddress: req.ip,
      });

      res.json({ maintenanceRequest: updated });
    } catch (error) {
      next(error);
    }
  }
);

// 12. Hall Maintenance Blocks Endpoints
apiRouter.get(
  "/hall-blocks",
  requireAuth,
  async (_req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const blocks = await getAllHallBlocks();
      res.json({ hallBlocks: blocks });
    } catch (error) {
      next(error);
    }
  }
);

apiRouter.post(
  "/hall-blocks",
  requireAuth,
  requireAdmin,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { hallId, reason, startDate, endDate, startTime, endTime } = req.body;
      if (!hallId || !reason || !startDate || !endDate) {
        return res
          .status(400)
          .json({ error: "Hall, reason, start date, and end date are required." });
      }

      const created = await createHallBlockRecord({
        hallId: Number(hallId),
        reason: String(reason),
        startDate: String(startDate),
        endDate: String(endDate),
        startTime: startTime ? String(startTime) : "00:00",
        endTime: endTime ? String(endTime) : "23:59",
        createdBy: req.user!.id,
      });

      await logAuditAction({
        userId: req.user!.id,
        action: "CREATE_HALL_BLOCK",
        entityType: "hall",
        entityId: Number(hallId),
        details: `Blocked hall #${hallId} from ${startDate} to ${endDate} (${created.reason}).`,
        ipAddress: req.ip,
      });

      res.status(201).json({ hallBlock: created });
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Failed to create maintenance block." });
    }
  }
);

apiRouter.patch(
  "/hall-blocks/:id",
  requireAuth,
  requireAdmin,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const id = Number(req.params.id);
      const { isActive } = req.body;
      const updated = await toggleHallBlockRecord(id, Boolean(isActive));
      res.json({ hallBlock: updated });
    } catch (error) {
      next(error);
    }
  }
);

// 13. Notifications Endpoints
apiRouter.get(
  "/notifications",
  requireAuth,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const list = await getUserNotifications(req.user!.id);
      res.json({ notifications: list });
    } catch (error) {
      next(error);
    }
  }
);

apiRouter.patch(
  "/notifications/read-all",
  requireAuth,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      await markAllNotificationsRead(req.user!.id);
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }
);

apiRouter.patch(
  "/notifications/:id/read",
  requireAuth,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const id = Number(req.params.id);
      const updated = await markNotificationRead(id, req.user!.id);
      res.json({ notification: updated });
    } catch (error) {
      next(error);
    }
  }
);

// 14. Dashboard Statistics
apiRouter.get(
  "/dashboard",
  requireAuth,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const stats = await getDashboardStatistics(req.user!.id, req.user!.role);
      res.json(stats);
    } catch (error) {
      next(error);
    }
  }
);

// 15. Reports (Admin Only)
apiRouter.get(
  "/reports",
  requireAuth,
  requireAdmin,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { startDate, endDate } = req.query;
      const report = await generateSystemReport({
        startDate: startDate ? String(startDate) : undefined,
        endDate: endDate ? String(endDate) : undefined,
      });
      res.json(report);
    } catch (error) {
      next(error);
    }
  }
);

// 16. Smart Hall Allotment & Recommendations
apiRouter.post(
  "/recommendations",
  requireAuth,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const {
        date,
        startTime,
        endTime,
        expectedAttendees,
        requireAc,
        requireProjector,
        requireSound,
      } = req.body;

      if (!date || !startTime || !endTime || !expectedAttendees) {
        return res.status(400).json({
          error: "Date, start time, end time, and expected attendees are required.",
        });
      }

      if (String(endTime) <= String(startTime)) {
        return res.status(400).json({ error: "End time must be later than start time." });
      }

      const result = await getSmartHallRecommendations({
        userId: req.user!.id,
        date: String(date),
        startTime: String(startTime),
        endTime: String(endTime),
        expectedAttendees: Number(expectedAttendees),
        requireAc: Boolean(requireAc),
        requireProjector: Boolean(requireProjector),
        requireSound: Boolean(requireSound),
      });

      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

// 17. Audit Logs (Admin Only)
apiRouter.get(
  "/audit-logs",
  requireAuth,
  requireAdmin,
  async (_req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const logs = await getAuditLogsList();
      res.json({ auditLogs: logs });
    } catch (error) {
      next(error);
    }
  }
);
