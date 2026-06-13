import { useNavigate, useParams, useSearch } from "@tanstack/react-router";
import { ItemView } from "@/widgets/item-view";
import { useItem, useUpdateItem, useDeleteItem } from "@/entities/item";
import { usePublicStorage, useStorage } from "@/entities/storage";
import { extractStorageCategories } from "@/features/item-category";
import { stripGuestFromPath } from "../navigation";
export function ItemScreen() {
  const { storageId, boxId, itemId } = useParams({
    from: "/storage/$storageId/box/$boxId/item/$itemId",
  });
  const search = useSearch({
    from: "/storage/$storageId/box/$boxId/item/$itemId",
  });
  const navigate = useNavigate();
  const readOnly = search.guest === "1";
  const { data: authItem } = useItem(readOnly ? "" : itemId);
  const { data: authStorage } = useStorage(readOnly ? "" : storageId);
  const { data: publicStorage } = usePublicStorage(readOnly ? storageId : "");
  const updateItem = useUpdateItem(itemId, boxId, storageId);
  const deleteItem = useDeleteItem(boxId, storageId);
  const publicBox = publicStorage?.boxes?.find((b) => b.id === boxId);
  const publicItem = publicBox?.items?.find((i) => i.id === itemId);
  const item = readOnly ? publicItem : authItem;
  const availableCategories = extractStorageCategories(
    readOnly ? (publicStorage?.boxes ?? []) : (authStorage?.boxes ?? []),
  );
  const requireAuth = () => {
    const redirect = stripGuestFromPath(
      window.location.pathname + window.location.search,
    );
    navigate({ to: "/login", search: { redirect } });
  };
  if (!item) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Загрузка...</p>
      </div>
    );
  }
  return (
    <ItemView
      readOnly={readOnly}
      onRequireAuth={requireAuth}
      availableCategories={availableCategories}
      item={{
        id: item.id,
        name: item.name,
        category: item.category,
        description: item.description ?? "",
        photo: item.photo ?? undefined,
      }}
      onBack={() =>
        navigate({
          to: "/storage/$storageId/box/$boxId",
          params: { storageId, boxId },
          search: readOnly ? { guest: "1" } : {},
        })
      }
      onDelete={async () => {
        await deleteItem.mutateAsync(itemId);
        navigate({
          to: "/storage/$storageId/box/$boxId",
          params: { storageId, boxId },
        });
      }}
      onUpdate={async (name, category, description, photo) => {
        await updateItem.mutateAsync({ name, category, description, photo });
      }}
    />
  );
}
