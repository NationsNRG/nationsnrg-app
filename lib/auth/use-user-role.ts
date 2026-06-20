"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export type UserRole =
  | "admin"
  | "operator"
  | "supplier";

export function useUserRole() {
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadRole() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setLoading(false);
          return;
        }

        const { data } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .single();

        if (data?.role) {
          setRole(data.role as UserRole);
        }
      } finally {
        setLoading(false);
      }
    }

    loadRole();
  }, []);

  return {
    role,
    loading,
  };
}