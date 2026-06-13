import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/shared/api/client";
import { STORAGES_KEY } from "@/shared/api/query-keys";
import type { LayoutLabel } from "@/shared/model";
interface CreateLayoutLabelInput {
    x: number;
    y: number;
    text: string;
    fontSize?: number;
}
export function useCreateLayoutLabel(storageId: string) {
    const qc = useQueryClient();
    return useMutation<LayoutLabel, Error, CreateLayoutLabelInput>({
        mutationFn: (data) => api.post<LayoutLabel>(`/storages/${storageId}/layout-labels`, data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: [STORAGES_KEY, storageId] });
        },
    });
}
export function useDeleteLayoutLabel(storageId: string) {
    const qc = useQueryClient();
    return useMutation<void, Error, string>({
        mutationFn: (id) => api.delete(`/layout-labels/${id}`),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: [STORAGES_KEY, storageId] });
        },
    });
}
interface UpdateLayoutLabelInput {
    id: string;
    x?: number;
    y?: number;
    text?: string;
    fontSize?: number;
}
export function useUpdateLayoutLabel(storageId: string) {
    const qc = useQueryClient();
    return useMutation<LayoutLabel, Error, UpdateLayoutLabelInput>({
        mutationFn: ({ id, ...data }) => api.patch<LayoutLabel>(`/layout-labels/${id}`, data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: [STORAGES_KEY, storageId] });
        },
    });
}
