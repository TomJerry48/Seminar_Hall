import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { eq } from "drizzle-orm";
import { adminAuth } from "../lib/firebase-admin.ts";
import { db } from "../db/index.ts";
import { users } from "../db/schema.ts";

const JWT_SECRET = process.env.JWT_SECRET || "ssmiet_hallsync_enterprise_jwt_secret_key_2026";

export interface AuthenticatedUser {
  id: number;
  uid: string;
  fullName: string;
  email: string;
  role: "admin" | "faculty";
  departmentId: number | null;
  designation: string | null;
  accountStatus: string;
}

export interface AuthRequest extends Request {
  user?: AuthenticatedUser;
}

export function signJwtToken(user: AuthenticatedUser): string {
  return jwt.sign(
    {
      id: user.id,
      uid: user.uid,
      email: user.email,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: "12h" }
  );
}

/**
 * Safely registers or retrieves a user in PostgreSQL via Drizzle upsert.
 * If the users table is completely empty (0 records), the very first authenticated
 * user via Google Sign-In is provisioned as 'admin' so the system can be managed immediately.
 */
export async function getOrCreateFirebaseUser(
  uid: string,
  email: string,
  displayName?: string
): Promise<AuthenticatedUser> {
  try {
    const normalizedEmail = email.toLowerCase().trim();
    const existingByEmail = await db
      .select()
      .from(users)
      .where(eq(users.email, normalizedEmail));

    if (existingByEmail.length > 0) {
      const existing = existingByEmail[0];
      if (existing.uid !== uid) {
        const [updated] = await db
          .update(users)
          .set({ uid, updatedAt: new Date() })
          .where(eq(users.id, existing.id))
          .returning();
        return updated as AuthenticatedUser;
      }
      return existing as AuthenticatedUser;
    }

    const allUsers = await db.select({ id: users.id }).from(users).limit(1);
    const initialRole = allUsers.length === 0 ? "admin" : "faculty";
    const initialDesignation =
      allUsers.length === 0 ? "System Administrator" : "Faculty Member";

    const result = await db
      .insert(users)
      .values({
        uid,
        fullName: displayName || normalizedEmail.split("@")[0],
        email: normalizedEmail,
        role: initialRole,
        designation: initialDesignation,
        accountStatus: "active",
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email: normalizedEmail,
          updatedAt: new Date(),
        },
      })
      .returning();

    return result[0] as AuthenticatedUser;
  } catch (error) {
    console.error("Database user upsert failed:", error);
    throw new Error("Failed to synchronize user account with database.", {
      cause: error,
    });
  }
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized: Missing authentication token" });
  }

  const token = authHeader.split("Bearer ")[1].trim();
  if (!token) {
    return res.status(401).json({ error: "Unauthorized: Empty token" });
  }

  // 1. Try verifying as JWT token first (issued by Email/Password login or session exchange)
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      id: number;
      uid: string;
      email: string;
      role: string;
    };
    const dbUsers = await db
      .select()
      .from(users)
      .where(eq(users.id, decoded.id));

    if (dbUsers.length === 0) {
      return res.status(401).json({ error: "Unauthorized: User account no longer exists" });
    }

    const dbUser = dbUsers[0];
    if (dbUser.accountStatus !== "active") {
      return res.status(403).json({
        error: `Account is currently ${dbUser.accountStatus}. Please contact the Administrator.`,
      });
    }

    req.user = {
      id: dbUser.id,
      uid: dbUser.uid,
      fullName: dbUser.fullName,
      email: dbUser.email,
      role: dbUser.role as "admin" | "faculty",
      departmentId: dbUser.departmentId,
      designation: dbUser.designation,
      accountStatus: dbUser.accountStatus,
    };
    return next();
  } catch {
    // Token is not a local JWT, fall through to Firebase ID Token verification
  }

  // 2. Verify as Firebase ID Token
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    if (!decodedToken.email) {
      return res.status(401).json({ error: "Unauthorized: Token missing email claim" });
    }

    const dbUser = await getOrCreateFirebaseUser(
      decodedToken.uid,
      decodedToken.email,
      decodedToken.name
    );

    if (dbUser.accountStatus !== "active") {
      return res.status(403).json({
        error: `Account is currently ${dbUser.accountStatus}. Please contact the Administrator.`,
      });
    }

    req.user = dbUser;
    return next();
  } catch (error) {
    console.error("Error verifying authentication token:", error);
    return res.status(401).json({ error: "Unauthorized: Invalid or expired token" });
  }
};

export const requireAdmin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized: Authentication required" });
  }
  if (req.user.role !== "admin") {
    return res.status(403).json({
      error: "Forbidden: Administrator privileges are required for this operation",
    });
  }
  next();
};
