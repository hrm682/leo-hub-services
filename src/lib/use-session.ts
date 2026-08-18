import { useQuery } from "@tanstack/react-query";
import type { User } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "soporte" | "cliente";

/** Sesión actual validada contra el servidor de autenticación. */
export function useSession() {
  return useQuery({
    queryKey: ["session"],
    queryFn: async (): Promise<User | null> => {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user) return null;
      return data.user;
    },
    staleTime: 30_000,
    retry: false,
  });
}

/** Roles del usuario actual (cliente / soporte / admin). */
export function useRoles(userId: string | undefined) {
  return useQuery({
    queryKey: ["roles", userId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<AppRole[]> => {
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId!);
      return (data ?? []).map((r) => r.role as AppRole);
    },
    staleTime: 60_000,
  });
}

export function useIsStaff(userId: string | undefined) {
  const { data: roles, isLoading } = useRoles(userId);
  return {
    isStaff: Boolean(roles?.some((r) => r === "admin" || r === "soporte")),
    isAdmin: Boolean(roles?.includes("admin")),
    roles: roles ?? [],
    isLoading,
  };
}
