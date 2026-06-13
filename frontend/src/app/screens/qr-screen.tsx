import { useCallback, useState } from "react";
import { useNavigate, useParams } from "@tanstack/react-router";
import { QRScanner } from "@/components/QRScanner";
import { useBox } from "@/entities/box";
import { useUserStore } from "@/entities/user/model/store";
import { api } from "@/shared/api/client";
import { normalizeApiError } from "@/shared/api/errors";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/ui/alert-dialog";
import { getToken } from "../route-guards";
export function QrScreen() {
  const navigate = useNavigate();
  const { token, clearAuth } = useUserStore();
  const params = useParams({ strict: false });
  const boxId =
    "boxId" in params ? (params.boxId as string | undefined) : undefined;
  const isAuthenticated = !!token || !!getToken();
  const { data: box } = useBox(isAuthenticated && boxId ? boxId : "");
  const [pendingForeignScan, setPendingForeignScan] = useState<{
    storageId: string;
    boxId: string;
  } | null>(null);
  const [scannerKey, setScannerKey] = useState(0);
  const qrCodeData =
    box && boxId
      ? {
          boxName: box.name,
          storageName:
            (
              box as typeof box & {
                storage?: {
                  name: string;
                };
              }
            ).storage?.name ?? "",
          qrCodeToken: box.qrCode,
        }
      : undefined;
  const handleScanSuccess = useCallback(
    async ({
      storageId,
      boxId: scannedBoxId,
    }: {
      storageId: string;
      boxId: string;
    }) => {
      const activeToken = getToken();
      if (!activeToken) {
        navigate({
          to: "/storage/$storageId/box/$boxId",
          params: { storageId, boxId: scannedBoxId },
          search: { guest: "1" },
        });
        return;
      }
      try {
        await api.get(`/boxes/${scannedBoxId}`);
        navigate({
          to: "/storage/$storageId/box/$boxId",
          params: { storageId, boxId: scannedBoxId },
        });
      } catch (err) {
        const apiErr = normalizeApiError(err);
        if (apiErr.status === 403) {
          setPendingForeignScan({ storageId, boxId: scannedBoxId });
          return;
        }
        throw err;
      }
    },
    [navigate],
  );
  const handleConfirmForeignScan = () => {
    if (!pendingForeignScan) return;
    const { storageId, boxId: scannedBoxId } = pendingForeignScan;
    setPendingForeignScan(null);
    clearAuth();
    navigate({
      to: "/storage/$storageId/box/$boxId",
      params: { storageId, boxId: scannedBoxId },
      search: { guest: "1" },
    });
  };
  return (
    <>
      <QRScanner
        key={scannerKey}
        onBack={() =>
          navigate({ to: isAuthenticated ? "/dashboard" : "/login" })
        }
        onScanSuccess={handleScanSuccess}
        qrCodeData={qrCodeData}
        showViewTab={isAuthenticated && !!boxId}
      />

      <AlertDialog
        open={pendingForeignScan !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingForeignScan(null);
            setScannerKey((k) => k + 1);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Коробка другого пользователя</AlertDialogTitle>
            <AlertDialogDescription>
              Эта коробка принадлежит другому аккаунту. Для просмотра в гостевом
              режиме необходимо выйти из текущего профиля. Вы уверены?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmForeignScan}>
              Выйти и просмотреть
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
