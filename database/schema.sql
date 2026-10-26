-- =============================================================================
-- SSMIET HallSync AI — PostgreSQL Database Schema
-- SSM Institute of Engineering and Technology, Dindigul
-- =============================================================================
-- Strict Rules Enforced:
-- 1. Starts completely EMPTY (No sample users, halls, bookings, or fake data).
-- 2. Does NOT execute DROP DATABASE or DROP TABLE.
-- 3. Normalized relational tables with foreign keys, check constraints, and indexes.
-- =============================================================================

CREATE TABLE IF NOT EXISTS "departments" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" text NOT NULL UNIQUE,
  "code" text NOT NULL UNIQUE,
  "head_of_department" text,
  "description" text,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "users" (
  "id" serial PRIMARY KEY NOT NULL,
  "uid" text NOT NULL UNIQUE,
  "full_name" text NOT NULL,
  "email" text NOT NULL UNIQUE,
  "password_hash" text,
  "role" text DEFAULT 'faculty' NOT NULL,
  "department_id" integer REFERENCES "departments"("id") ON DELETE SET NULL,
  "designation" text,
  "phone" text,
  "account_status" text DEFAULT 'active' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "halls" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" text NOT NULL UNIQUE,
  "code" text NOT NULL UNIQUE,
  "building" text NOT NULL,
  "floor" text DEFAULT 'Ground Floor' NOT NULL,
  "capacity" integer NOT NULL CHECK ("capacity" > 0),
  "description" text,
  "has_ac" boolean DEFAULT true NOT NULL,
  "has_projector" boolean DEFAULT true NOT NULL,
  "has_sound_system" boolean DEFAULT true NOT NULL,
  "requires_approval" boolean DEFAULT true NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "resources" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" text NOT NULL UNIQUE,
  "category" text DEFAULT 'General' NOT NULL,
  "description" text,
  "total_quantity" integer DEFAULT 1 NOT NULL,
  "available_quantity" integer DEFAULT 1 NOT NULL,
  "status" text DEFAULT 'available' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "chk_resource_qty_non_negative" CHECK ("total_quantity" >= 0 AND "available_quantity" >= 0)
);

CREATE TABLE IF NOT EXISTS "hall_resources" (
  "id" serial PRIMARY KEY NOT NULL,
  "hall_id" integer NOT NULL REFERENCES "halls"("id") ON DELETE CASCADE,
  "resource_id" integer NOT NULL REFERENCES "resources"("id") ON DELETE CASCADE,
  "quantity" integer DEFAULT 1 NOT NULL,
  "condition_status" text DEFAULT 'working' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "uq_hall_resource" UNIQUE ("hall_id", "resource_id")
);

CREATE TABLE IF NOT EXISTS "bookings" (
  "id" serial PRIMARY KEY NOT NULL,
  "hall_id" integer NOT NULL REFERENCES "halls"("id") ON DELETE RESTRICT,
  "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
  "event_name" text NOT NULL,
  "event_description" text,
  "event_type" text DEFAULT 'Seminar' NOT NULL,
  "expected_attendees" integer NOT NULL CHECK ("expected_attendees" > 0),
  "booking_date" text NOT NULL,
  "start_time" text NOT NULL,
  "end_time" text NOT NULL,
  "status" text DEFAULT 'pending' NOT NULL,
  "required_resources_notes" text,
  "admin_remarks" text,
  "approved_by" integer REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "chk_booking_time_order" CHECK ("end_time" > "start_time")
);

CREATE TABLE IF NOT EXISTS "booking_resources" (
  "id" serial PRIMARY KEY NOT NULL,
  "booking_id" integer NOT NULL REFERENCES "bookings"("id") ON DELETE CASCADE,
  "resource_id" integer NOT NULL REFERENCES "resources"("id") ON DELETE RESTRICT,
  "quantity_requested" integer DEFAULT 1 NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "maintenance_requests" (
  "id" serial PRIMARY KEY NOT NULL,
  "hall_id" integer REFERENCES "halls"("id") ON DELETE SET NULL,
  "resource_id" integer REFERENCES "resources"("id") ON DELETE SET NULL,
  "reported_by" integer NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
  "title" text NOT NULL,
  "issue_description" text NOT NULL,
  "priority" text DEFAULT 'medium' NOT NULL,
  "status" text DEFAULT 'open' NOT NULL,
  "resolution_notes" text,
  "resolved_by" integer REFERENCES "users"("id") ON DELETE SET NULL,
  "resolved_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "hall_blocks" (
  "id" serial PRIMARY KEY NOT NULL,
  "hall_id" integer NOT NULL REFERENCES "halls"("id") ON DELETE CASCADE,
  "reason" text NOT NULL,
  "start_date" text NOT NULL,
  "end_date" text NOT NULL,
  "start_time" text DEFAULT '00:00' NOT NULL,
  "end_time" text DEFAULT '23:59' NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_by" integer NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "chk_block_date_order" CHECK ("end_date" >= "start_date")
);

CREATE TABLE IF NOT EXISTS "notifications" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "title" text NOT NULL,
  "message" text NOT NULL,
  "type" text DEFAULT 'info' NOT NULL,
  "related_entity_id" integer,
  "is_read" boolean DEFAULT false NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "booking_history" (
  "id" serial PRIMARY KEY NOT NULL,
  "booking_id" integer NOT NULL REFERENCES "bookings"("id") ON DELETE CASCADE,
  "action" text NOT NULL,
  "previous_status" text,
  "new_status" text NOT NULL,
  "changed_by" integer NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
  "remarks" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "audit_logs" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer REFERENCES "users"("id") ON DELETE SET NULL,
  "action" text NOT NULL,
  "entity_type" text NOT NULL,
  "entity_id" integer,
  "details" text,
  "ip_address" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "ai_recommendations" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "requested_date" text NOT NULL,
  "requested_start_time" text NOT NULL,
  "requested_end_time" text NOT NULL,
  "expected_attendees" integer NOT NULL,
  "required_facilities" text,
  "recommended_hall_id" integer REFERENCES "halls"("id") ON DELETE SET NULL,
  "match_score" integer,
  "reasoning" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS "idx_departments_code" ON "departments" ("code");
CREATE INDEX IF NOT EXISTS "idx_users_email" ON "users" ("email");
CREATE INDEX IF NOT EXISTS "idx_users_role" ON "users" ("role");
CREATE INDEX IF NOT EXISTS "idx_users_department" ON "users" ("department_id");
CREATE INDEX IF NOT EXISTS "idx_halls_active" ON "halls" ("is_active");
CREATE INDEX IF NOT EXISTS "idx_halls_capacity" ON "halls" ("capacity");
CREATE INDEX IF NOT EXISTS "idx_resources_status" ON "resources" ("status");
CREATE INDEX IF NOT EXISTS "idx_hall_resources_hall" ON "hall_resources" ("hall_id");
CREATE INDEX IF NOT EXISTS "idx_bookings_hall_date" ON "bookings" ("hall_id", "booking_date");
CREATE INDEX IF NOT EXISTS "idx_bookings_user" ON "bookings" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_bookings_status" ON "bookings" ("status");
CREATE INDEX IF NOT EXISTS "idx_bookings_date" ON "bookings" ("booking_date");
CREATE INDEX IF NOT EXISTS "idx_booking_resources_booking" ON "booking_resources" ("booking_id");
CREATE INDEX IF NOT EXISTS "idx_maintenance_status" ON "maintenance_requests" ("status");
CREATE INDEX IF NOT EXISTS "idx_maintenance_hall" ON "maintenance_requests" ("hall_id");
CREATE INDEX IF NOT EXISTS "idx_maintenance_reported_by" ON "maintenance_requests" ("reported_by");
CREATE INDEX IF NOT EXISTS "idx_hall_blocks_hall_dates" ON "hall_blocks" ("hall_id", "start_date", "end_date");
CREATE INDEX IF NOT EXISTS "idx_notifications_user_read" ON "notifications" ("user_id", "is_read");
CREATE INDEX IF NOT EXISTS "idx_booking_history_booking" ON "booking_history" ("booking_id");
CREATE INDEX IF NOT EXISTS "idx_audit_logs_created" ON "audit_logs" ("created_at");
CREATE INDEX IF NOT EXISTS "idx_audit_logs_entity" ON "audit_logs" ("entity_type", "entity_id");
CREATE INDEX IF NOT EXISTS "idx_ai_recommendations_user" ON "ai_recommendations" ("user_id");
