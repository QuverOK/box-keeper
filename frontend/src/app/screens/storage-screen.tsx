import { useNavigate, useParams, useSearch } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { StorageView } from "@/widgets/storage-editor";
import {
  useStorage,
  usePublicStorage,
  useUpdateStorage,
} from "@/entities/storage";
import { useCreateBox, useMoveAnyBox } from "@/entities/box";
import { api, BOXES_KEY, STORAGES_KEY } from "@/shared/api";
import {
  useCreatePartition,
  useDeletePartition,
  useUpdatePartition,
} from "@/entities/partition";
import {
  useCreateLayoutLabel,
  useDeleteLayoutLabel,
  useUpdateLayoutLabel,
} from "@/entities/layout-label";
import { stripGuestFromPath } from "../navigation";
export function StorageScreen() {
  const { storageId } = useParams({ from: "/storage/$storageId" });
  const search = useSearch({ from: "/storage/$storageId" });
  const navigate = useNavigate();
  const qc = useQueryClient();
  const readOnly = search.guest === "1";
  const highlightBoxId = search.highlight;
  const { data: authStorage } = useStorage(readOnly ? "" : storageId);
  const { data: publicStorage } = usePublicStorage(readOnly ? storageId : "");
  const addBox = useCreateBox(storageId);
  const moveBox = useMoveAnyBox(storageId);
  const updateStorage = useUpdateStorage(storageId);
  const createPartition = useCreatePartition(readOnly ? "" : storageId);
  const deletePartition = useDeletePartition(readOnly ? "" : storageId);
  const updatePartition = useUpdatePartition(readOnly ? "" : storageId);
  const createLayoutLabel = useCreateLayoutLabel(readOnly ? "" : storageId);
  const deleteLayoutLabel = useDeleteLayoutLabel(readOnly ? "" : storageId);
  const updateLayoutLabel = useUpdateLayoutLabel(readOnly ? "" : storageId);
  const storage = readOnly ? publicStorage : authStorage;
  const requireAuth = () => {
    const redirect = stripGuestFromPath(
      window.location.pathname + window.location.search,
    );
    navigate({ to: "/login", search: { redirect } });
  };
  if (!storage) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Загрузка...</p>
      </div>
    );
  }
  return (
    <StorageView
      storageName={storage.name}
      boxes={(storage.boxes ?? []).map((b) => ({
        id: b.id,
        name: b.name,
        x: b.posX ?? undefined,
        y: b.posY ?? undefined,
        z: b.posZ ?? undefined,
        color: b.color,
        sizeW: b.sizeW,
        sizeD: b.sizeD,
        sizeH: b.sizeH,
        itemCount: b.items?.length ?? 0,
        items: (b.items ?? []).map((i) => ({
          id: i.id,
          name: i.name,
          category: i.category,
          description: i.description ?? "",
        })),
      }))}
      gridSize={{
        x: storage.gridSizeX,
        y: storage.gridSizeY,
        z: storage.gridSizeZ,
      }}
      roomSize={{
        width: storage.roomWidth,
        depth: storage.roomDepth,
        height: storage.roomHeight,
      }}
      readOnly={readOnly}
      highlightBoxId={highlightBoxId}
      onRequireAuth={requireAuth}
      onBack={() => navigate({ to: readOnly ? "/login" : "/dashboard" })}
      onBoxClick={(boxId) =>
        navigate({
          to: "/storage/$storageId/box/$boxId",
          params: { storageId, boxId },
          search: readOnly ? { guest: "1" } : {},
        })
      }
      onAddBox={async (name, sizeW, sizeD, sizeH, items = []) => {
        const newBox = await addBox.mutateAsync({ name, sizeW, sizeD, sizeH });
        for (const item of items) {
          await api.post(`/boxes/${newBox.id}/items`, item);
        }
        if (items.length > 0) {
          qc.invalidateQueries({ queryKey: [BOXES_KEY, storageId] });
          qc.invalidateQueries({ queryKey: [STORAGES_KEY, storageId] });
        }
        navigate({
          to: "/storage/$storageId",
          params: { storageId },
          search: { highlight: newBox.id },
        });
      }}
      onMoveBox={async (boxId, newX, newY, newZ) => {
        await moveBox.mutateAsync({
          boxId,
          posX: newX ?? null,
          posY: newY ?? null,
          posZ: newZ ?? null,
        });
      }}
      partitions={storage.partitions ?? []}
      layoutLabels={storage.layoutLabels ?? []}
      onCreatePartition={async (data) => {
        await createPartition.mutateAsync(data);
      }}
      onDeletePartition={async (id) => {
        await deletePartition.mutateAsync(id);
      }}
      onCreateLayoutLabel={async (data) => {
        await createLayoutLabel.mutateAsync(data);
      }}
      onDeleteLayoutLabel={async (id) => {
        await deleteLayoutLabel.mutateAsync(id);
      }}
      onMovePartition={async (id, x, y) => {
        await updatePartition.mutateAsync({ id, x, y });
      }}
      onMoveLayoutLabel={async (id, x, y) => {
        await updateLayoutLabel.mutateAsync({ id, x, y });
      }}
      onUpdateStorage={async (data) => {
        await updateStorage.mutateAsync(data);
      }}
    />
  );
}
