import { getServerSession } from "next-auth";
import { authOptions } from "./auth";

/**
 * Returns true if the current session belongs to an admin user.
 * Returns false for regular users or unauthenticated requests.
 */
export async function isAdmin(): Promise<boolean> {
  const session = await getServerSession(authOptions);
  return session?.user?.role === "ADMIN";
}

/**
 * Returns the current session, or null if unauthenticated.
 */
export async function getSession() {
  return getServerSession(authOptions);
}

/**
 * Returns the current user's ID, or null if unauthenticated.
 */
export async function getUserId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  return session?.user?.id ?? null;
}

/**
 * Returns a Prisma `where` clause that scopes data access:
 *
 *   - For ADMIN users: `{}` (no filter — they can see ALL users' data)
 *   - For regular users: `{ userId: "<their id>" }` (only their own data)
 *   - For unauthenticated: `{ userId: "__NO_USER__" }` (matches nothing)
 *
 * Usage in API routes:
 *
 *   const scope = await getDataScope();
 *   const templates = await prisma.emailTemplate.findMany({ where: scope });
 *
 * For routes that need to filter on a relation other than `userId`
 * (e.g. `ownerId`), pass the field name:
 *
 *   const scope = await getDataScope("ownerId");
 */
export async function getDataScope(
  userField: string = "userId"
): Promise<Record<string, string>> {
  const session = await getServerSession(authOptions);
  if (session?.user?.role === "ADMIN") {
    return {}; // admin sees all
  }
  if (session?.user?.id) {
    return { [userField]: session.user.id };
  }
  return { [userField]: "__NO_USER__" }; // unauthenticated → matches nothing
}
