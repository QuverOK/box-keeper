import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, STORAGES_KEY } from "@/shared/api";
import type { Partition } from "@/shared/model";
interface CreatePartitionInput {
  x: number;
  y: number;
  z: number;
  width: number;
  depth: number;
  height: number;
  label?: string;
}
export function useCreatePartition(storageId: string) {
  const qc = useQueryClient();
  return useMutation<Partition, Error, CreatePartitionInput>({
    mutationFn: (data) =>
      api.post<Partition>(`/storages/${storageId}/partitions`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [STORAGES_KEY, storageId] });
    },
  });
}
export function useDeletePartition(storageId: string) {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (id) => api.delete(`/partitions/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [STORAGES_KEY, storageId] });
    },
  });
}
interface UpdatePartitionInput {
  id: string;
  x?: number;
  y?: number;
  z?: number;
  width?: number;
  depth?: number;
  height?: number;
  label?: string;
}
export function useUpdatePartition(storageId: string) {
  const qc = useQueryClient();
  return useMutation<Partition, Error, UpdatePartitionInput>({
    mutationFn: ({ id, ...data }) =>
      api.patch<Partition>(`/partitions/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [STORAGES_KEY, storageId] });
    },
  });
}
