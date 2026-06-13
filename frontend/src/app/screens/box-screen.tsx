import { useNavigate, useParams, useSearch } from "@tanstack/react-router";
import { BoxView } from "@/widgets/box-view";
import { useBox, useUpdateBox, useDeleteBox } from "@/entities/box";
import { useCreateItem } from "@/entities/item";
import { usePublicStorage, useStorage } from "@/entities/storage";
import { extractStorageCategories } from "@/features/item-category";
import { stripGuestFromPath } from "../navigation";

export function BoxScreen() {
  const { storageId, boxId } = useParams({
    from: "/storage/$storageId/box/$boxId",
  });
  const search = useSearch({ from: "/storage/$storageId/box/$boxId" });
  const navigate = useNavigate();

  const readOnly = search.guest === "1";

  const { data: authBox } = useBox(readOnly ? "" : boxId);
  const { data: authStorage } = useStorage(readOnly ? "" : storageId);
  const { data: publicStorage } = usePublicStorage(readOnly ? storageId : "");
  const addItem = useCreateItem(boxId, storageId);
  const updateBox = useUpdateBox(boxId, storageId);
  const deleteBox = useDeleteBox(storageId);

  const publicBox = publicStorage?.boxes?.find((b) => b.id === boxId);
  const box = readOnly ? publicBox : authBox;
  const roomSize =
    readOnly && publicStorage
      ? {
          width: publicStorage.roomWidth,
          depth: publicStorage.roomDepth,
          height: publicStorage.roomHeight,
        }
      : authStorage
        ? {
            width: authStorage.roomWidth,
            depth: authStorage.roomDepth,
            height: authStorage.roomHeight,
          }
        : undefined;

  const siblingBoxes = (
    readOnly ? publicStorage?.boxes : authStorage?.boxes
  )?.map((b) => ({ id: b.id, name: b.name }));

  const availableCategories = extractStorageCategories(
    readOnly ? (publicStorage?.boxes ?? []) : (authStorage?.boxes ?? []),
  );

  const requireAuth = () => {
    const redirect = stripGuestFromPath(
      window.location.pathname + window.location.search,
    );
    navigate({ to: "/login", search: { redirect } });
  };

  if (!box) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Загрузка...</p>
      </div>
    );
  }

  return (
    <BoxView
      boxId={boxId}
      boxName={box.name}
      boxColor={box.color}
      boxSizeW={box.sizeW}
      boxSizeD={box.sizeD}
      boxSizeH={box.sizeH}
      qrCode={box.qrCode}
      roomSize={roomSize}
      siblingBoxes={siblingBoxes}
      readOnly={readOnly}
      onRequireAuth={requireAuth}
      availableCategories={availableCategories}
      items={(box.items ?? []).map((i) => ({
        id: i.id,
        name: i.name,
        category: i.category,
        description: i.description ?? "",
      }))}
      onBack={() =>
        navigate({
          to: "/storage/$storageId",
          params: { storageId },
          search: readOnly
            ? { guest: "1", highlight: boxId }
            : { highlight: boxId },
        })
      }
      onItemClick={(itemId) =>
        navigate({
          to: "/storage/$storageId/box/$boxId/item/$itemId",
          params: { storageId, boxId, itemId },
          search: readOnly ? { guest: "1" } : {},
        })
      }
      onAddItem={async (name, category, description) => {
        await addItem.mutateAsync({ name, category, description });
      }}
      onAddItems={async (items) => {
        for (const item of items) {
          await addItem.mutateAsync(item);
        }
      }}
      onUpdateBox={async (name, color, sizeW, sizeD, sizeH) => {
        await updateBox.mutateAsync({ name, color, sizeW, sizeD, sizeH });
      }}
      onDeleteBox={async () => {
        await deleteBox.mutateAsync(boxId);
        navigate({ to: "/storage/$storageId", params: { storageId } });
      }}
      onShowQR={() => navigate({ to: "/qr/$boxId", params: { boxId } })}
    />
  );
}
