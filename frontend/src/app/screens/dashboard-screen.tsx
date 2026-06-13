import { useNavigate } from "@tanstack/react-router";
import { Dashboard } from "@/components/Dashboard";
import {
  useStorages,
  useCreateStorage,
  useDeleteStorage,
} from "@/entities/storage";
import { useUserStore } from "@/entities/user/model/store";
export function DashboardScreen() {
  const navigate = useNavigate();
  const { user } = useUserStore();
  const { data: storages = [] } = useStorages();
  const createStorage = useCreateStorage();
  const deleteStorage = useDeleteStorage();
  return (
    <Dashboard
      userEmail={user?.email ?? ""}
      storages={storages.map((s) => ({
        id: s.id,
        name: s.name,
        boxCount: s.boxes?.length ?? 0,
      }))}
      onStorageClick={(storageId) =>
        navigate({ to: "/storage/$storageId", params: { storageId } })
      }
      onCreateStorage={async (name, roomWidth, roomDepth, roomHeight) => {
        await createStorage.mutateAsync({
          name,
          roomWidth,
          roomDepth,
          roomHeight,
        });
      }}
      onDeleteStorage={async (storageId) => {
        await deleteStorage.mutateAsync(storageId);
      }}
    />
  );
}
