"use client";

import { ReactNode } from "react";
import { useUserRole } from "@/lib/auth/use-user-role";

interface Props {
  roles: Array<"admin" | "operator" | "supplier">;
  children: ReactNode;
}

export default function RoleGate({
  roles,
  children,
}: Props) {
  const { role, loading } = useUserRole();

  if (loading) {
    return null;
  }

  if (!role) {
    return null;
  }

  if (!roles.includes(role)) {
    return null;
  }

  return <>{children}</>;
}