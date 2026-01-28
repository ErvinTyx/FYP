import { auth, signIn, signOut } from "../auth";
import type { Role } from "../roles";

export type Session = {
  userId: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  roles: Role[];
};

export async function getSession(): Promise<Session | null> {
  const session = await auth();

  if (!session?.user) {
    return null;
  }

  return {
    userId: session.user.id,
    email: session.user.email,
    firstName: session.user.firstName,
    lastName: session.user.lastName,
    roles: session.user.roles,
  };
}

export async function requireSession(): Promise<Session> {
  const session = await getSession();

  if (!session) {
    throw new Error("Unauthorized");
  }

  return session;
}

export async function requireRole(requiredRoles: Role[]): Promise<Session> {
  const session = await requireSession();
  const hasRole = session.roles.some((role) => requiredRoles.includes(role));

  if (!hasRole) {
    throw new Error("Forbidden");
  }

  return session;
}

// Re-export auth functions for convenience
export { auth, signIn, signOut };
