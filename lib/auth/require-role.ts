import { getUserRole } from "./get-user-role";

export async function requireRole(
  userId: string,
  allowedRoles: Array<"admin" | "operator" | "supplier">,
) {
  const role = await getUserRole(userId);

  if (!role) {
    return false;
  }

  return allowedRoles.includes(role);
}