import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/shared/api/client";
import { BOXES_KEY, STORAGES_KEY } from "@/shared/api/query-keys";
import type { Box } from "../model/types";
export function useBoxes(storageId: string) {
  return useQuery<Box[]>({
    queryKey: [BOXES_KEY, storageId],
    queryFn: () => api.get<Box[]>(`/storages/${storageId}/boxes`),
    enabled: !!storageId,
  });
}
export function useBox(boxId: string) {
  return useQuery<Box>({
    queryKey: [BOXES_KEY, "detail", boxId],
    queryFn: () => api.get<Box>(`/boxes/${boxId}`),
    enabled: !!boxId,
  });
}
interface CreateBoxInput {
  name: string;
  sizeW: number;
  sizeD: number;
  sizeH: number;
  color?: string;
}
export function useCreateBox(storageId: string) {
  const qc = useQueryClient();
  return useMutation<Box, Error, CreateBoxInput>({
    mutationFn: (data) => api.post<Box>(`/storages/${storageId}/boxes`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [BOXES_KEY, storageId] });
      qc.invalidateQueries({ queryKey: [STORAGES_KEY, storageId] });
    },
  });
}
export function useUpdateBox(boxId: string, storageId: string) {
  const qc = useQueryClient();
  return useMutation<Box, Error, Partial<CreateBoxInput>>({
    mutationFn: (data) => api.patch<Box>(`/boxes/${boxId}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [BOXES_KEY, storageId] });
      qc.invalidateQueries({ queryKey: [BOXES_KEY, "detail", boxId] });
      qc.invalidateQueries({ queryKey: [STORAGES_KEY, storageId] });
    },
  });
}
interface MoveBoxInput {
  posX?: number | null;
  posY?: number | null;
  posZ?: number | null;
}
export function useMoveBox(boxId: string, storageId: string) {
  const qc = useQueryClient();
  return useMutation<Box, Error, MoveBoxInput>({
    mutationFn: (data) => api.patch<Box>(`/boxes/${boxId}/position`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [BOXES_KEY, storageId] });
      qc.invalidateQueries({ queryKey: [STORAGES_KEY, storageId] });
    },
  });
}
export function useMoveAnyBox(storageId: string) {
  const qc = useQueryClient();
  return useMutation<
    Box,
    Error,
    {
      boxId: string;
    } & MoveBoxInput
  >({
    mutationFn: ({ boxId, ...data }) =>
      api.patch<Box>(`/boxes/${boxId}/position`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [BOXES_KEY, storageId] });
      qc.invalidateQueries({ queryKey: [STORAGES_KEY, storageId] });
    },
  });
}
export function useDeleteBox(storageId: string) {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (id) => api.delete(`/boxes/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [BOXES_KEY, storageId] });
      qc.invalidateQueries({ queryKey: [STORAGES_KEY, storageId] });
    },
  });
}
