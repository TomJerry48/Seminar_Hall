/**
 * Explicit Administrator Setup Script for SSMIET HallSync AI
 * Usage:
 *   npm run setup-admin -- --name="Dr. S. Admin" --email="admin@ssmiet.ac.in" --password="YourStrongPassword123!"
 *
 * This script does NOT automatically run on server startup and never uses a hardcoded default password.
 */
import * as dotenv from "dotenv";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, pool } from "../src/db/index.ts";
import { users, auditLogs } from "../src/db/schema.ts";

dotenv.config();

async function createInitialAdmin() {
  const args = process.argv.slice(2);
  const params: Record<string, string> = {};

  for (const arg of args) {
    if (arg.startsWith("--")) {
      const [key, ...valParts] = arg.slice(2).split("=");
      params[key] = valParts.join("=").replace(/^["']|["']$/g, "");
    }
  }

  const fullName = params.name || process.env.INITIAL_ADMIN_NAME;
  const email = (params.email || process.env.INITIAL_ADMIN_EMAIL || "").toLowerCase().trim();
  const password = params.password || process.env.INITIAL_ADMIN_PASSWORD;

  if (!fullName || !email || !password) {
    console.error("Error: Missing required arguments.");
    console.error(
      'Usage: npm run setup-admin -- --name="Admin Name" --email="admin@ssmiet.ac.in" --password="StrongPassword123"'
    );
    process.exit(1);
  }

  if (password.length < 8) {
    console.error("Error: Password must be at least 8 characters long.");
    process.exit(1);
  }

  try {
    const existingUsers = await db.select().from(users).where(eq(users.email, email));
    if (existingUsers.length > 0) {
      console.error(`Error: A user with email ${email} already exists.`);
      process.exit(1);
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const uid = `admin_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    const [createdAdmin] = await db
      .insert(users)
      .values({
        uid,
        fullName,
        email,
        passwordHash,
        role: "admin",
        designation: "System Administrator",
        accountStatus: "active",
      })
      .returning();

    await db.insert(auditLogs).values({
      userId: createdAdmin.id,
      action: "CREATE_INITIAL_ADMIN",
      entityType: "user",
      entityId: createdAdmin.id,
      details: `Administrator account (${email}) created via CLI setup script.`,
      ipAddress: "127.0.0.1",
    });

    console.log("=========================================================");
    console.log("SSMIET HallSync AI - Administrator Created Successfully");
    console.log("=========================================================");
    console.log(`ID:    ${createdAdmin.id}`);
    console.log(`Name:  ${createdAdmin.fullName}`);
    console.log(`Email: ${createdAdmin.email}`);
    console.log(`Role:  ${createdAdmin.role}`);
    console.log("=========================================================");
  } catch (error) {
    console.error("Failed to create administrator:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

createInitialAdmin();
