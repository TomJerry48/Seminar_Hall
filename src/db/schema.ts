import { relations, sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// 1. Departments
export const departments = pgTable(
  "departments",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull().unique(),
    code: text("code").notNull().unique(),
    headOfDepartment: text("head_of_department"),
    description: text("description"),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [index("idx_departments_code").on(table.code)]
);

// 2. Users (Administrator and Faculty)
export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    uid: text("uid").notNull().unique(), // Firebase Auth UID or unique internal UID
    fullName: text("full_name").notNull(),
    email: text("email").notNull().unique(),
    passwordHash: text("password_hash"), // Bcrypt hash for email/password login
    role: text("role").notNull().default("faculty"), // 'admin' | 'faculty'
    departmentId: integer("department_id").references(() => departments.id, {
      onDelete: "set null",
    }),
    designation: text("designation"),
    phone: text("phone"),
    accountStatus: text("account_status").notNull().default("active"), // 'active' | 'inactive' | 'suspended'
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_users_email").on(table.email),
    index("idx_users_role").on(table.role),
    index("idx_users_department").on(table.departmentId),
  ]
);

// 3. Halls (Seminar Halls & Auditoriums)
export const halls = pgTable(
  "halls",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull().unique(),
    code: text("code").notNull().unique(),
    building: text("building").notNull(),
    floor: text("floor").notNull().default("Ground Floor"),
    capacity: integer("capacity").notNull(),
    description: text("description"),
    hasAc: boolean("has_ac").default(true).notNull(),
    hasProjector: boolean("has_projector").default(true).notNull(),
    hasSoundSystem: boolean("has_sound_system").default(true).notNull(),
    requiresApproval: boolean("requires_approval").default(true).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_halls_active").on(table.isActive),
    index("idx_halls_capacity").on(table.capacity),
    check("chk_hall_capacity_positive", sql`${table.capacity} > 0`),
  ]
);

// 4. Resources (Equipment & Facilities)
export const resources = pgTable(
  "resources",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull().unique(),
    category: text("category").notNull().default("General"), // 'Audio/Visual', 'Furniture', 'IT Equipment', 'General'
    description: text("description"),
    totalQuantity: integer("total_quantity").notNull().default(1),
    availableQuantity: integer("available_quantity").notNull().default(1),
    status: text("status").notNull().default("available"), // 'available' | 'under_maintenance' | 'unavailable'
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_resources_status").on(table.status),
    check("chk_resource_qty_non_negative", sql`${table.totalQuantity} >= 0 AND ${table.availableQuantity} >= 0`),
  ]
);

// 5. Hall Resources (Association between Halls and Fixed/Assigned Resources)
export const hallResources = pgTable(
  "hall_resources",
  {
    id: serial("id").primaryKey(),
    hallId: integer("hall_id")
      .notNull()
      .references(() => halls.id, { onDelete: "cascade" }),
    resourceId: integer("resource_id")
      .notNull()
      .references(() => resources.id, { onDelete: "cascade" }),
    quantity: integer("quantity").notNull().default(1),
    conditionStatus: text("condition_status").notNull().default("working"), // 'working' | 'damaged' | 'maintenance'
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("uq_hall_resource").on(table.hallId, table.resourceId),
    index("idx_hall_resources_hall").on(table.hallId),
  ]
);

// 6. Bookings
export const bookings = pgTable(
  "bookings",
  {
    id: serial("id").primaryKey(),
    hallId: integer("hall_id")
      .notNull()
      .references(() => halls.id, { onDelete: "restrict" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    eventName: text("event_name").notNull(),
    eventDescription: text("event_description"),
    eventType: text("event_type").notNull().default("Seminar"), // 'Seminar', 'Workshop', 'Guest Lecture', 'Department Meeting', 'Conference', 'Cultural/Technical'
    expectedAttendees: integer("expected_attendees").notNull(),
    bookingDate: text("booking_date").notNull(), // YYYY-MM-DD
    startTime: text("start_time").notNull(), // HH:MM (24-hr format, e.g., '09:30')
    endTime: text("end_time").notNull(), // HH:MM (24-hr format, e.g., '12:30')
    status: text("status").notNull().default("pending"), // 'pending' | 'approved' | 'rejected' | 'cancelled' | 'completed'
    requiredResourcesNotes: text("required_resources_notes"),
    adminRemarks: text("admin_remarks"),
    approvedBy: integer("approved_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_bookings_hall_date").on(table.hallId, table.bookingDate),
    index("idx_bookings_user").on(table.userId),
    index("idx_bookings_status").on(table.status),
    index("idx_bookings_date").on(table.bookingDate),
    check("chk_booking_time_order", sql`${table.endTime} > ${table.startTime}`),
    check("chk_booking_attendees_positive", sql`${table.expectedAttendees} > 0`),
  ]
);

// 7. Booking Resources (Requested resources for a specific booking)
export const bookingResources = pgTable(
  "booking_resources",
  {
    id: serial("id").primaryKey(),
    bookingId: integer("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),
    resourceId: integer("resource_id")
      .notNull()
      .references(() => resources.id, { onDelete: "restrict" }),
    quantityRequested: integer("quantity_requested").notNull().default(1),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_booking_resources_booking").on(table.bookingId),
  ]
);

// 8. Maintenance Requests (Equipment damage or Hall maintenance reports)
export const maintenanceRequests = pgTable(
  "maintenance_requests",
  {
    id: serial("id").primaryKey(),
    hallId: integer("hall_id").references(() => halls.id, {
      onDelete: "set null",
    }),
    resourceId: integer("resource_id").references(() => resources.id, {
      onDelete: "set null",
    }),
    reportedBy: integer("reported_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    title: text("title").notNull(),
    issueDescription: text("issue_description").notNull(),
    priority: text("priority").notNull().default("medium"), // 'low' | 'medium' | 'high' | 'critical'
    status: text("status").notNull().default("open"), // 'open' | 'in_progress' | 'resolved' | 'closed'
    resolutionNotes: text("resolution_notes"),
    resolvedBy: integer("resolved_by").references(() => users.id, {
      onDelete: "set null",
    }),
    resolvedAt: timestamp("resolved_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_maintenance_status").on(table.status),
    index("idx_maintenance_hall").on(table.hallId),
    index("idx_maintenance_reported_by").on(table.reportedBy),
  ]
);

// 9. Hall Blocks (Scheduled Maintenance Blocks preventing bookings)
export const hallBlocks = pgTable(
  "hall_blocks",
  {
    id: serial("id").primaryKey(),
    hallId: integer("hall_id")
      .notNull()
      .references(() => halls.id, { onDelete: "cascade" }),
    reason: text("reason").notNull(),
    startDate: text("start_date").notNull(), // YYYY-MM-DD
    endDate: text("end_date").notNull(), // YYYY-MM-DD
    startTime: text("start_time").notNull().default("00:00"), // HH:MM
    endTime: text("end_time").notNull().default("23:59"), // HH:MM
    isActive: boolean("is_active").default(true).notNull(),
    createdBy: integer("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_hall_blocks_hall_dates").on(table.hallId, table.startDate, table.endDate),
    check("chk_block_date_order", sql`${table.endDate} >= ${table.startDate}`),
  ]
);

// 10. Notifications
export const notifications = pgTable(
  "notifications",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    message: text("message").notNull(),
    type: text("type").notNull().default("info"), // 'booking_approved' | 'booking_rejected' | 'booking_created' | 'booking_cancelled' | 'maintenance' | 'info'
    relatedEntityId: integer("related_entity_id"),
    isRead: boolean("is_read").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_notifications_user_read").on(table.userId, table.isRead),
  ]
);

// 11. Booking History (Audit trail of booking status changes)
export const bookingHistory = pgTable(
  "booking_history",
  {
    id: serial("id").primaryKey(),
    bookingId: integer("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),
    action: text("action").notNull(), // 'created' | 'approved' | 'rejected' | 'cancelled' | 'modified'
    previousStatus: text("previous_status"),
    newStatus: text("new_status").notNull(),
    changedBy: integer("changed_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    remarks: text("remarks"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_booking_history_booking").on(table.bookingId),
  ]
);

// 12. Audit Logs (System-wide administrative & security actions)
export const auditLogs = pgTable(
  "audit_logs",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    action: text("action").notNull(), // e.g., 'CREATE_HALL', 'APPROVE_BOOKING', 'CREATE_FACULTY'
    entityType: text("entity_type").notNull(), // e.g., 'hall', 'booking', 'user', 'department', 'resource', 'maintenance'
    entityId: integer("entity_id"),
    details: text("details"),
    ipAddress: text("ip_address"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_audit_logs_created").on(table.createdAt),
    index("idx_audit_logs_entity").on(table.entityType, table.entityId),
  ]
);

// 13. AI Recommendations (Smart hall allotment log & criteria tracking)
export const aiRecommendations = pgTable(
  "ai_recommendations",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    requestedDate: text("requested_date").notNull(),
    requestedStartTime: text("requested_start_time").notNull(),
    requestedEndTime: text("requested_end_time").notNull(),
    expectedAttendees: integer("expected_attendees").notNull(),
    requiredFacilities: text("required_facilities"),
    recommendedHallId: integer("recommended_hall_id").references(() => halls.id, {
      onDelete: "set null",
    }),
    matchScore: integer("match_score"),
    reasoning: text("reasoning"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_ai_recommendations_user").on(table.userId),
  ]
);

// Relations
export const departmentsRelations = relations(departments, ({ many }) => ({
  users: many(users),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  department: one(departments, {
    fields: [users.departmentId],
    references: [departments.id],
  }),
  bookings: many(bookings),
  notifications: many(notifications),
}));

export const hallsRelations = relations(halls, ({ many }) => ({
  bookings: many(bookings),
  hallResources: many(hallResources),
  hallBlocks: many(hallBlocks),
  maintenanceRequests: many(maintenanceRequests),
}));
