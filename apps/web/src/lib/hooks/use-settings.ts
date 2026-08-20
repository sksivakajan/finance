import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  UpdateProfileInput,
  ChangePasswordInput,
  TwoFactorVerifyInput,
  TwoFactorDisableInput,
  DeleteAccountInput,
} from "@finance/shared";
import { api } from "../api-client";
import type { PublicUser, SessionRecord, TwoFactorEnrollment, TwoFactorConfirmResult } from "../types";

export function useUpdateProfile() {
  return useMutation({
    mutationFn: (input: UpdateProfileInput) => api.patch<PublicUser>("/users/me", input),
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (input: ChangePasswordInput) => api.post<{ message: string }>("/auth/change-password", input),
  });
}

export function useSessions() {
  return useQuery({
    queryKey: ["settings", "sessions"],
    queryFn: () => api.get<SessionRecord[]>("/auth/sessions"),
  });
}

export function useRevokeSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/auth/sessions/${id}`),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["settings", "sessions"] }),
  });
}

export function useEnableTwoFactor() {
  return useMutation({
    mutationFn: () => api.post<TwoFactorEnrollment>("/auth/2fa/enable"),
  });
}

export function useConfirmTwoFactor() {
  return useMutation({
    mutationFn: (input: TwoFactorVerifyInput) => api.post<TwoFactorConfirmResult>("/auth/2fa/verify", input),
  });
}

export function useDisableTwoFactor() {
  return useMutation({
    mutationFn: (input: TwoFactorDisableInput) => api.post<{ message: string }>("/auth/2fa/disable", input),
  });
}

export function useDeactivateAccount() {
  return useMutation({
    mutationFn: (input: DeleteAccountInput) => api.delete<{ message: string }>("/users/me", input),
  });
}
