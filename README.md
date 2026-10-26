# SSMIET HallSync AI — Smart Hall Allotment, Event Scheduling and Resource Management System

A full-stack web application built for **SSM Institute of Engineering and Technology (SSMIET), Dindigul** to manage seminar halls, academic event bookings, audio-visual equipment resources, and facility maintenance.

---

## 1. Architecture & Technology Stack

- **Frontend**: React 19, Vite, TypeScript, React Router, Tailwind CSS (Strict White-Based Enterprise Theme).
- **Backend**: Node.js, Express.js REST API (`server.ts` & `src/routes.ts`).
- **Authentication & Authorization**:
  - **JWT + Bcrypt** password hashing for institutional email/password login.
  - **Google Sign-In (Firebase Authentication)** integrated with PostgreSQL user records.
  - Role-Based Access Control (RBAC) enforcing `admin` and `faculty` permissions across all endpoints and UI routes.
- **Database**: PostgreSQL with Drizzle ORM & `pg.Pool` connection pooling (`src/db/schema.ts`, `src/db/index.ts`, `database/schema.sql`).

---

## 2. Database Design (13 Normalized PostgreSQL Tables)

The PostgreSQL schema starts **completely empty** with zero hardcoded or demo records:

1. `departments` — Academic departments (`id`, `name`, `code`, `head_of_department`, `is_active`, timestamps).
2. `users` — Administrator and Faculty accounts (`id`, `uid`, `full_name`, `email`, `password_hash`, `role`, `department_id`, `designation`, `account_status`).
3. `halls` — Seminar halls and auditoriums (`id`, `name`, `code`, `building`, `floor`, `capacity`, `has_ac`, `has_projector`, `has_sound_system`, `requires_approval`, `is_active`).
4. `resources` — College equipment inventory (`id`, `name`, `category`, `total_quantity`, `available_quantity`, `status`).
5. `hall_resources` — Fixed/associated equipment per seminar hall.
6. `bookings` — Seminar hall reservations with check constraints (`end_time > start_time`, `expected_attendees > 0`).
7. `booking_resources` — Additional equipment requested for a specific booking.
8. `maintenance_requests` — Equipment damage and hall maintenance issue tracking.
9. `hall_blocks` — Scheduled maintenance blocks preventing hall bookings during blocked windows.
10. `notifications` — User alerts for booking approvals, rejections, cancellations, and maintenance updates.
11. `booking_history` — Audit trail of booking state transitions.
12. `audit_logs` — System-wide administrative and security logs.
13. `ai_recommendations` — Smart hall allotment suitability scores and reasoning logs.

---

## 3. Step-by-Step Setup Instructions

### Step 1: Install PostgreSQL & Create an Empty Database
1. Install PostgreSQL 15+ on your machine or provision a Cloud SQL PostgreSQL instance.
2. Create a new empty database (for example, `ssmiet_hallsync`).

### Step 2: Configure Environment Variables
Copy `.env.example` to `.env` and configure your PostgreSQL connection parameters and JWT secret:
```bash
cp .env.example .env
```

### Step 3: Initialize the Database Schema
You can initialize the empty schema using either the SQL script or Drizzle Kit:
```bash
psql -h <HOST> -U <USER> -d <DB_NAME> -f database/schema.sql
```
*(In Cloud SQL environments, the schema is managed via `src/db/schema.ts` and `src/db/drizzle.config.ts`).*

### Step 4: Create the Initial Administrator Account
No default or demo users are seeded automatically. To create the first Administrator account via the explicit CLI script:
```bash
npm run setup-admin -- --name="Dr. S. Administrator" --email="admin@ssmiet.ac.in" --password="YourStrongPassword123!"
```
Alternatively, when the `users` table has zero administrators, the Login screen displays a **First-Time Database Initialization** panel allowing you to provision the first administrator account or sign in with Google.

### Step 5: Start the Full-Stack Application
```bash
npm install
npm run dev
```
The Express API and Vite frontend run together on `http://localhost:3000`.

### Step 6: Run Automated Backend & Database Tests
```bash
npm test
```

---

## 4. REST API Endpoints Summary

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/system/status` | Public | Checks whether an initial administrator exists |
| `POST` | `/api/auth/setup-initial-admin` | Public (if 0 admins) | Creates the first administrator account |
| `POST` | `/api/auth/login` | Public | Email & password login returning JWT |
| `POST` | `/api/auth/google` | Public | Verifies Firebase Google ID token & issues JWT |
| `GET` | `/api/auth/me` | Authenticated | Retrieves current user profile |
| `PUT` | `/api/auth/profile` | Authenticated | Updates profile details or password |
| `GET` | `/api/dashboard` | Authenticated | Real PostgreSQL metrics for Admin or Faculty |
| `GET` | `/api/departments` | Authenticated | Lists all academic departments |
| `POST` | `/api/departments` | Admin | Creates a new department |
| `PUT` | `/api/departments/:id` | Admin | Updates a department |
| `GET` | `/api/users` | Admin | Lists all faculty and admin user accounts |
| `POST` | `/api/users` | Admin | Creates a faculty or administrator account |
| `PUT` | `/api/users/:id` | Admin | Updates user role, department, or status |
| `GET` | `/api/halls` | Authenticated | Lists all seminar halls and assigned resources |
| `GET` | `/api/halls/availability` | Authenticated | Searches available halls by date, time, capacity |
| `GET` | `/api/halls/:id` | Authenticated | Retrieves hall details, bookings, and blocks |
| `POST` | `/api/halls` | Admin | Registers a new seminar hall |
| `PUT` | `/api/halls/:id` | Admin | Updates or activates/deactivates a hall |
| `POST` | `/api/halls/:id/resources` | Admin | Associates equipment with a hall |
| `DELETE` | `/api/halls/:id/resources/:resourceId` | Admin | Removes equipment association from a hall |
| `GET` | `/api/bookings` | Authenticated | Lists bookings with filtering |
| `POST` | `/api/bookings` | Authenticated | Transactional booking creation with conflict locking |
| `PATCH` | `/api/bookings/:id/status` | Authenticated | Approves, rejects, or cancels a booking |
| `GET` | `/api/bookings/history` | Authenticated | Retrieves booking status change history |
| `GET` | `/api/resources` | Authenticated | Lists equipment resources |
| `POST` | `/api/resources` | Admin | Adds a new equipment resource |
| `PUT` | `/api/resources/:id` | Admin | Updates resource quantities or status |
| `GET` | `/api/maintenance` | Authenticated | Lists maintenance/damage reports |
| `POST` | `/api/maintenance` | Authenticated | Submits a new maintenance or damage report |
| `PATCH` | `/api/maintenance/:id` | Admin | Updates maintenance priority, status, or resolution |
| `GET` | `/api/hall-blocks` | Authenticated | Lists scheduled hall maintenance blocks |
| `POST` | `/api/hall-blocks` | Admin | Creates a hall maintenance block |
| `PATCH` | `/api/hall-blocks/:id` | Admin | Releases or reactivates a maintenance block |
| `GET` | `/api/notifications` | Authenticated | Retrieves user notifications |
| `PATCH` | `/api/notifications/read-all` | Authenticated | Marks all user notifications as read |
| `GET` | `/api/reports` | Admin | Generates utilization, booking, and maintenance reports |
| `POST` | `/api/recommendations` | Authenticated | Rule-based smart hall suitability recommender |
| `GET` | `/api/audit-logs` | Admin | Retrieves system-wide security & admin audit logs |
