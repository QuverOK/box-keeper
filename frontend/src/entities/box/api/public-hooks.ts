import { api } from "@/shared/api/client";
import type { Box } from "../model/types";

export interface PublicBoxResponse {
  box: Box;
  storage: { id: string; name: string };
}

export function fetchPublicBoxByQr(qrCode: string) {
  const code = qrCode.trim();
  return api.get<PublicBoxResponse>(
    `/public/boxes/by-qr/${encodeURIComponent(code)}`,
  );
}
