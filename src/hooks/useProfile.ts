import { useQuery, useQueryClient } from "@tanstack/react-query";

import api from "../lib/axios";
import { useAuthStore } from "../stores/authStore";

export type Profile = {
  id: string;
  name: string;
  preferredName: string | null;
};

export const profileKey = (userId: string) => ["profile", userId] as const;

export function useProfile() {
  const userId = useAuthStore((state) => state.user?.id);

  return useQuery({
    queryKey: profileKey(userId ?? ""),
    queryFn: async () => (await api.get<Profile>("/api/profile")).data,
    enabled: Boolean(userId),
  });
}

export function useDisplayName() {
  const profile = useProfile().data;
  return profile?.name || "Student";
}

export function useSavePreferredName() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((state) => state.user?.id);

  return async (preferredName: string) => {
    const { data } = await api.patch<Profile>("/api/profile", {
      preferredName,
    });

    if (userId) {
      queryClient.setQueryData(profileKey(userId), data);
    }

    return data;
  };
}
