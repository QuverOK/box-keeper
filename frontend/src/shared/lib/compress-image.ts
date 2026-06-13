export interface CompressImageOptions {
  maxDim?: number;
  quality?: number;
  maxBytes?: number;
}

const DEFAULT_OPTIONS: Required<CompressImageOptions> = {
  maxDim: 1024,
  quality: 0.8,
  maxBytes: 400_000,
};

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Не удалось загрузить изображение"));
    };
    img.src = url;
  });
}

function estimateDataUrlBytes(dataUrl: string): number {
  const base64 = dataUrl.split(",")[1] ?? "";
  return Math.ceil((base64.length * 3) / 4);
}

/**
 * Compresses an image file to a JPEG data URL suitable for JSON API payloads.
 */
export async function compressImage(
  file: File,
  options?: CompressImageOptions,
): Promise<string> {
  const { maxDim, quality, maxBytes } = { ...DEFAULT_OPTIONS, ...options };

  if (!file.type.startsWith("image/")) {
    throw new Error("Выберите файл изображения");
  }

  const img = await loadImageFromFile(file);
  const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
  const width = Math.max(1, Math.round(img.width * scale));
  const height = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas недоступен");

  ctx.drawImage(img, 0, 0, width, height);

  let q = quality;
  let dataUrl = canvas.toDataURL("image/jpeg", q);

  while (estimateDataUrlBytes(dataUrl) > maxBytes && q > 0.35) {
    q -= 0.1;
    dataUrl = canvas.toDataURL("image/jpeg", q);
  }

  if (estimateDataUrlBytes(dataUrl) > maxBytes) {
    throw new Error(
      "Изображение слишком большое. Выберите файл меньшего размера.",
    );
  }

  return dataUrl;
}
