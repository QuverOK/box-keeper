import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/shared/api/client";
import { STORAGES_KEY } from "@/shared/api/query-keys";
import type { Storage } from "../model/types";
export function useStorages() {
  return useQuery<Storage[]>({
    queryKey: [STORAGES_KEY],
    queryFn: () => api.get<Storage[]>("/storages"),
  });
}
export function useStorage(id: string) {
  return useQuery<Storage>({
    queryKey: [STORAGES_KEY, id],
    queryFn: () => api.get<Storage>(`/storages/${id}`),
    enabled: !!id,
  });
}
export function usePublicStorage(storageId: string) {
  return useQuery<Storage>({
    queryKey: ["public", "storage", storageId],
    queryFn: () => api.get<Storage>(`/public/storages/${storageId}`),
    enabled: !!storageId,
  });
}
interface CreateStorageInput {
  name: string;
  roomWidth: number;
  roomDepth: number;
  roomHeight: number;
}
export function useCreateStorage() {
  const qc = useQueryClient();
  return useMutation<Storage, Error, CreateStorageInput>({
    mutationFn: (data) => api.post<Storage>("/storages", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [STORAGES_KEY] }),
  });
}
export function useUpdateStorage(id: string) {
  const qc = useQueryClient();
  return useMutation<Storage, Error, Partial<CreateStorageInput>>({
    mutationFn: (data) => api.patch<Storage>(`/storages/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [STORAGES_KEY] });
      qc.invalidateQueries({ queryKey: [STORAGES_KEY, id] });
    },
  });
}
export function useDeleteStorage() {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (id) => api.delete(`/storages/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: [STORAGES_KEY] }),
  });
}
