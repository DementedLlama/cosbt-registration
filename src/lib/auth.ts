import { NextAuthOptions, getServerSession, Session } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { logAudit } from "./audit";

// ─── Login Rate Limiter (in-memory, per-email) ──────────────────────────────
const LOGIN_RATE_WINDOW_MS = 15 * 60_000; // 15 minutes
const LOGIN_MAX_ATTEMPTS = 5;

const loginAttempts = new Map<string, { count: number; firstAttempt: number }>();

// Periodic cleanup to prevent memory leak
setInterval(() => {
  const now = Date.now();
  loginAttempts.forEach((attempt, email) => {
    if (now - attempt.firstAttempt > LOGIN_RATE_WINDOW_MS) {
      loginAttempts.delete(email);
    }
  });
}, 5 * 60_000);

function isLoginRateLimited(email: string): boolean {
  const now = Date.now();
  const attempt = loginAttempts.get(email);

  if (!attempt || now - attempt.firstAttempt > LOGIN_RATE_WINDOW_MS) {
    loginAttempts.set(email, { count: 1, firstAttempt: now });
    return false;
  }

  if (attempt.count >= LOGIN_MAX_ATTEMPTS) {
    return true;
  }

  attempt.count++;
  return false;
}

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60, // 8 hours
  },
  pages: {
    signIn: "/admin/login",
    error: "/admin/login",
  },
  secret: process.env.NEXTAUTH_SECRET,

  providers: [
    CredentialsProvider({
      name: "Admin Login",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },

      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const normalizedEmail = credentials.email.toLowerCase().trim();

        // Rate limit: 5 failed attempts per email per 15 minutes
        if (isLoginRateLimited(normalizedEmail)) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: normalizedEmail },
          select: {
            id: true,
            name: true,
            email: true,
            passwordHash: true,
            role: true,
            isActive: true,
          },
        });

        if (!user || !user.isActive) {
          return null;
        }

        const isValid = await bcrypt.compare(
          credentials.password,
          user.passwordHash
        );
        if (!isValid) {
          return null;
        }

        // Successful login — clear rate limit counter
        loginAttempts.delete(normalizedEmail);

        // Record last login (fire-and-forget)
        prisma.user
          .update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() },
          })
          .catch(() => {});

        // Bug fix: ADMIN_LOGIN audit event was missing despite being required
        // by the architecture. Best-effort — failure must not block login.
        void logAudit({
          action: "ADMIN_LOGIN",
          targetTable: "User",
          targetId: user.id,
        });

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
        };
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.isActive = user.isActive;
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        // Re-check DB on every session access to catch deactivated users mid-session.
        // Note: NextAuth v4 JWT strategy does not support programmatic sign-out from
        // the session callback. We set isActive=false and every route/layout checks it.
        // The JWT expires after maxAge (8h), but every getServerSession() re-checks DB.
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { isActive: true, role: true },
        });

        if (!dbUser || !dbUser.isActive) {
          session.user.id = token.id;
          session.user.role = token.role;
          session.user.isActive = false;
          return session;
        }

        session.user.id = token.id;
        session.user.role = dbUser.role;
        session.user.isActive = dbUser.isActive;
      }
      return session;
    },
  },
};

/**
 * Require an active admin session for API route handlers.
 * Returns the session on success, or a 401 NextResponse on failure.
 */
export async function requireAdminSession(): Promise<Session | NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session || !session.user.isActive) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return session;
}
