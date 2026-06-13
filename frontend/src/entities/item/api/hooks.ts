import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/shared/api/client";
import { BOXES_KEY, ITEMS_KEY, STORAGES_KEY } from "@/shared/api/query-keys";
import type { Item } from "../model/types";

function invalidateItemRelatedQueries(
  qc: ReturnType<typeof useQueryClient>,
  boxId: string,
  storageId: string,
  itemId?: string,
) {
  qc.invalidateQueries({ queryKey: [ITEMS_KEY, boxId] });
  qc.invalidateQueries({ queryKey: [BOXES_KEY, "detail", boxId] });
  qc.invalidateQueries({ queryKey: [STORAGES_KEY, storageId] });
  if (itemId) {
    qc.invalidateQueries({ queryKey: [ITEMS_KEY, "detail", itemId] });
  }
}

export function useItems(boxId: string) {
  return useQuery<Item[]>({
    queryKey: [ITEMS_KEY, boxId],
    queryFn: () => api.get<Item[]>(`/boxes/${boxId}/items`),
    enabled: !!boxId,
  });
}

export function useItem(itemId: string) {
  return useQuery<Item>({
    queryKey: [ITEMS_KEY, "detail", itemId],
    queryFn: () => api.get<Item>(`/items/${itemId}`),
    enabled: !!itemId,
  });
}

interface CreateItemInput {
  name: string;
  category: string;
  description?: string;
  photo?: string;
}

export function useCreateItem(boxId: string, storageId: string) {
  const qc = useQueryClient();
  return useMutation<Item, Error, CreateItemInput>({
    mutationFn: (data) => api.post<Item>(`/boxes/${boxId}/items`, data),
    onSuccess: () => invalidateItemRelatedQueries(qc, boxId, storageId),
  });
}

export function useUpdateItem(
  itemId: string,
  boxId: string,
  storageId: string,
) {
  const qc = useQueryClient();
  return useMutation<Item, Error, Partial<CreateItemInput>>({
    mutationFn: (data) => api.patch<Item>(`/items/${itemId}`, data),
    onSuccess: () => invalidateItemRelatedQueries(qc, boxId, storageId, itemId),
  });
}

export function useDeleteItem(boxId: string, storageId: string) {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (id) => api.delete(`/items/${id}`),
    onSuccess: () => invalidateItemRelatedQueries(qc, boxId, storageId),
  });
}
