import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcrypt";
import { prisma } from "./prisma";
import type { Role } from "./roles";

declare module "next-auth" {
  interface User {
    id: string;
    email: string;
    firstName?: string | null;
    lastName?: string | null;
    roles: Role[];
  }

  interface Session {
    user: {
      id: string;
      email: string;
      firstName?: string | null;
      lastName?: string | null;
      roles: Role[];
    } & DefaultSession["user"];
    loginAt: number; // Timestamp when user logged in
    expiresAt: number; // Timestamp when session expires
  }
}

// Validate required environment variables before initializing NextAuth
if (!process.env.AUTH_SECRET) {
  console.warn(
    "[NextAuth] WARNING: AUTH_SECRET is not set. Authentication will not work properly."
  );
}

// Initialize NextAuth with error handling
let nextAuthConfig;
try {
  nextAuthConfig = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
          try {
        if (!credentials?.email || !credentials?.password) {
              console.log("[NextAuth] Missing credentials");
          return null;
        }

        const email = credentials.email as string;
        const password = credentials.password as string;

            console.log(`[NextAuth] Attempting login for: ${email}`);

            // Find user with roles
            let user;
            try {
              user = await prisma.user.findUnique({
                where: { email },
                include: {
                  roles: {
                    include: {
                      role: true,
                    },
                  },
                },
              });
            } catch (dbError) {
              console.error("[NextAuth] Database query error:", dbError);
              throw dbError;
            }

            if (!user) {
              console.log(`[NextAuth] User not found: ${email}`);
              return null;
            }

            // Check if user account is active
            if (user.status === 'pending') {
              console.log(`[NextAuth] User account pending - needs to set password: ${email}`);
              return null;
            }

            if (user.status === 'inactive') {
              console.log(`[NextAuth] User account is inactive: ${email}`);
              return null;
            }

            if (user.status === 'rejected') {
              console.log(`[NextAuth] User account was rejected: ${email}`);
              return null;
            }

            console.log(`[NextAuth] User found: ${user.email}, status: ${user.status}, checking password...`);

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password);
            
        if (!isValidPassword) {
              console.log(`[NextAuth] Invalid password for user: ${email}`);
          return null;
        }

            console.log(`[NextAuth] Password valid for user: ${email}`);

        // Extract role names
        const roles = user.roles.map((ur: { role: { name: string } }) => ur.role.name as Role);

            console.log(`[NextAuth] Login successful for: ${email}, roles: ${roles.join(", ")}`);

        return {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          roles,
        };
          } catch (error) {
            console.error("[NextAuth] Authorize error:", error);
            if (error instanceof Error) {
              console.error("[NextAuth] Error stack:", error.stack);
            }
            return null;
          }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // Session timeout: 15 minutes in milliseconds
      const SESSION_MAX_AGE_MS = 15 * 60 * 1000;
      
      if (user) {
        token.id = user.id;
        token.firstName = user.firstName;
        token.lastName = user.lastName;
        token.roles = user.roles;
        // Store the login timestamp - only set on initial login
        token.loginAt = Date.now();
        token.expiresAt = Date.now() + SESSION_MAX_AGE_MS;
      }
      
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.firstName = token.firstName as string | null;
        session.user.lastName = token.lastName as string | null;
        session.user.roles = token.roles as Role[];
        // Pass timestamps to session so client can check expiration
        session.loginAt = token.loginAt as number;
        session.expiresAt = token.expiresAt as number;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 15 * 60, // 15 minutes
  },
  secret: process.env.AUTH_SECRET,
    // NextAuth v5: trustHost allows automatic URL detection in development
    // For production, set AUTH_URL environment variable
    trustHost: true,
  });
} catch (error) {
  console.error("[NextAuth] Failed to initialize:", error);
  throw new Error(
    `NextAuth initialization failed: ${error instanceof Error ? error.message : "Unknown error"}`
  );
}

export const { handlers, signIn, signOut, auth } = nextAuthConfig;
