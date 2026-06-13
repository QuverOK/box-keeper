import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Camera, Download, ImageUp, Loader2, QrCode, RotateCcw, } from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, } from "./ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { fetchPublicBoxByQr } from "@/entities/box/api/public-hooks";
import { normalizeApiError } from "@/shared/api/errors";
import { createQrLabelDataUrl, downloadQrLabel, } from "@/shared/lib/qr-label-image";
const READER_ID = "qr-reader";
interface QRScannerProps {
    onBack: () => void;
    onScanSuccess?: (result: {
        storageId: string;
        boxId: string;
    }) => void | Promise<void>;
    qrCodeData?: {
        boxName: string;
        storageName: string;
        qrCodeToken: string;
    };
    showViewTab?: boolean;
}
function normalizeDecodedText(text: string): string {
    return text.trim().replace(/\uFEFF/g, "");
}
async function pickCameraId(): Promise<string | {
    facingMode: string;
}> {
    try {
        const cameras = await Html5Qrcode.getCameras();
        if (cameras.length === 0) {
            return { facingMode: "user" };
        }
        const backCamera = cameras.find((c) => /back|rear|environment|задн/i.test(c.label));
        return backCamera?.id ?? cameras[cameras.length - 1].id;
    }
    catch {
        return { facingMode: "user" };
    }
}
export function QRScanner({ onBack, onScanSuccess, qrCodeData, showViewTab = !!qrCodeData, }: QRScannerProps) {
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const processingRef = useRef(false);
    const onScanSuccessRef = useRef(onScanSuccess);
    onScanSuccessRef.current = onScanSuccess;
    const [activeTab, setActiveTab] = useState("scan");
    const [scanMode, setScanMode] = useState<"camera" | "photo">("camera");
    const [cameraError, setCameraError] = useState<string | null>(null);
    const [scanError, setScanError] = useState<string | null>(null);
    const [isLookingUp, setIsLookingUp] = useState(false);
    const [qrImageUrl, setQrImageUrl] = useState<string | null>(null);
    const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const stopScanner = useCallback(async () => {
        const scanner = scannerRef.current;
        if (!scanner)
            return;
        try {
            if (scanner.isScanning) {
                await scanner.stop();
            }
            scanner.clear();
        }
        catch {
            void 0;
        }
        scannerRef.current = null;
    }, []);
    const lookupAndNavigate = useCallback(async (decodedText: string) => {
        const callback = onScanSuccessRef.current;
        if (processingRef.current || !callback)
            return;
        const normalized = normalizeDecodedText(decodedText);
        if (!normalized)
            return;
        processingRef.current = true;
        setScanError(null);
        setIsLookingUp(true);
        try {
            await stopScanner();
            const result = await fetchPublicBoxByQr(normalized);
            await callback({
                storageId: result.storage.id,
                boxId: result.box.id,
            });
        }
        catch (err) {
            const apiErr = normalizeApiError(err);
            setScanError(apiErr.message || "Коробка не найдена");
        }
        finally {
            setIsLookingUp(false);
            processingRef.current = false;
        }
    }, [stopScanner]);
    const startScanner = useCallback(async () => {
        if (scanMode !== "camera" || activeTab !== "scan")
            return;
        setCameraError(null);
        try {
            await stopScanner();
            const container = document.getElementById(READER_ID);
            if (!container)
                return;
            const scanner = new Html5Qrcode(READER_ID, { verbose: false });
            scannerRef.current = scanner;
            const cameraId = await pickCameraId();
            await scanner.start(cameraId, {
                fps: 10,
                qrbox: (viewfinderWidth, viewfinderHeight) => {
                    const size = Math.min(viewfinderWidth, viewfinderHeight) * 0.75;
                    return { width: Math.floor(size), height: Math.floor(size) };
                },
                aspectRatio: 1,
            }, (decodedText) => {
                void lookupAndNavigate(decodedText);
            }, () => { });
        }
        catch {
            setCameraError("Не удалось открыть камеру. Разрешите доступ к камере или загрузите фото.");
        }
    }, [activeTab, lookupAndNavigate, scanMode, stopScanner]);
    useEffect(() => {
        if (activeTab !== "scan" || scanMode !== "camera") {
            void stopScanner();
            return;
        }
        const timer = window.setTimeout(() => {
            void startScanner();
        }, 300);
        return () => {
            window.clearTimeout(timer);
            void stopScanner();
        };
    }, [activeTab, scanMode, startScanner, stopScanner]);
    useEffect(() => {
        return () => {
            if (photoPreviewUrl) {
                URL.revokeObjectURL(photoPreviewUrl);
            }
        };
    }, [photoPreviewUrl]);
    useEffect(() => {
        if (!qrCodeData?.qrCodeToken) {
            setQrImageUrl(null);
            return;
        }
        createQrLabelDataUrl(qrCodeData.qrCodeToken, qrCodeData.boxName)
            .then(setQrImageUrl)
            .catch(() => setQrImageUrl(null));
    }, [qrCodeData?.qrCodeToken, qrCodeData?.boxName]);
    const scanSelectedFile = async (file: File) => {
        setScanError(null);
        setIsLookingUp(true);
        try {
            await stopScanner();
            const scanner = new Html5Qrcode("qr-file-scanner", { verbose: false });
            const decodedText = await scanner.scanFile(file, true);
            await lookupAndNavigate(decodedText);
        }
        catch {
            setScanError("QR-код не найден на фото. Попробуйте другое изображение.");
            processingRef.current = false;
        }
        finally {
            setIsLookingUp(false);
        }
    };
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (!file)
            return;
        if (photoPreviewUrl) {
            URL.revokeObjectURL(photoPreviewUrl);
        }
        setSelectedFile(file);
        setPhotoPreviewUrl(URL.createObjectURL(file));
        setScanMode("photo");
        setScanError(null);
        void scanSelectedFile(file);
    };
    const resetToCamera = () => {
        if (photoPreviewUrl) {
            URL.revokeObjectURL(photoPreviewUrl);
        }
        setPhotoPreviewUrl(null);
        setSelectedFile(null);
        setScanError(null);
        processingRef.current = false;
        setScanMode("camera");
    };
    const handleDownloadQR = () => {
        if (!qrImageUrl || !qrCodeData)
            return;
        downloadQrLabel(qrImageUrl, qrCodeData.boxName);
    };
    return (<div className="min-h-screen bg-background">
      <div id="qr-file-scanner" className="hidden" aria-hidden/>

      <header className="bg-card border-b sticky top-0 z-10">
        <div className="page-container py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="w-5 h-5"/>
            </Button>
            <div className="flex-1">
              <h1 className="text-2xl">QR-коды</h1>
              <p className="text-muted-foreground">Сканирование и просмотр</p>
            </div>
          </div>
        </div>
      </header>

      <main className="page-container py-8 max-w-2xl">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className={`grid w-full ${showViewTab ? "grid-cols-2" : "grid-cols-1"}`}>
            <TabsTrigger value="scan" className="gap-2">
              <Camera className="w-4 h-4"/>
              Сканировать
            </TabsTrigger>
            {showViewTab && (<TabsTrigger value="view" className="gap-2">
                <QrCode className="w-4 h-4"/>
                Просмотр
              </TabsTrigger>)}
          </TabsList>

          <TabsContent value="scan" className="mt-6" forceMount>
            <Card>
              <CardHeader>
                <CardTitle>Сканировать QR-код</CardTitle>
                <CardDescription>
                  Наведите камеру на QR-код коробки или загрузите фото
                </CardDescription>
              </CardHeader>
              <CardContent>
                {scanMode === "camera" ? (<div id={READER_ID} className="w-full min-h-[clamp(200px,45dvh,320px)] rounded-lg overflow-hidden mb-4 bg-gray-900 [&_video]:rounded-lg"/>) : (<div className="mb-4">
                    {photoPreviewUrl && (<div className="rounded-lg overflow-hidden border bg-muted mb-3">
                        <img src={photoPreviewUrl} alt="Загруженное фото" className="w-full max-h-80 object-contain"/>
                      </div>)}
                    <Button variant="outline" className="w-full gap-2" onClick={resetToCamera} disabled={isLookingUp}>
                      <RotateCcw className="w-4 h-4"/>
                      Снова использовать камеру
                    </Button>
                  </div>)}

                {isLookingUp && (<div className="flex items-center justify-center gap-2 mb-4 text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin"/>
                    <span className="text-sm">
                      {scanMode === "photo"
                ? "Распознавание QR-кода..."
                : "Поиск коробки..."}
                    </span>
                  </div>)}

                {cameraError && scanMode === "camera" && (<div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-sm text-amber-800">{cameraError}</p>
                  </div>)}

                {scanError && (<div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-700">{scanError}</p>
                    {scanMode === "photo" && selectedFile && (<Button variant="outline" size="sm" className="mt-2" onClick={() => void scanSelectedFile(selectedFile)}>
                        Повторить распознавание
                      </Button>)}
                  </div>)}

                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload}/>

                <Button variant="outline" className="w-full gap-2" disabled={isLookingUp} onClick={() => fileInputRef.current?.click()}>
                  <ImageUp className="w-4 h-4"/>
                  Загрузить фото
                </Button>

                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Совет:</strong> Убедитесь, что QR-код хорошо освещён
                    и полностью виден в кадре.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {showViewTab && (<TabsContent value="view" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Просмотр QR-кода</CardTitle>
                  <CardDescription>
                    {qrCodeData
                ? `${qrCodeData.boxName} — ${qrCodeData.storageName}`
                : "Выберите коробку для просмотра QR-кода"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {qrCodeData && qrImageUrl ? (<>
                      <div className="bg-white p-8 rounded-lg border-2 border-gray-200 mb-4">
                        <img src={qrImageUrl} alt={`QR-код коробки ${qrCodeData.boxName}`} className="w-full max-w-sm mx-auto object-contain"/>
                      </div>

                      <div className="space-y-3">
                        <Button className="w-full gap-2" onClick={handleDownloadQR}>
                          <Download className="w-4 h-4"/>
                          Скачать QR-код
                        </Button>

                        <div className="p-4 bg-muted rounded-lg">
                          <p className="text-sm text-muted-foreground mb-2">
                            <strong>Коробка:</strong> {qrCodeData.boxName}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            <strong>Хранилище:</strong> {qrCodeData.storageName}
                          </p>
                        </div>
                      </div>
                    </>) : (<div className="text-center py-16">
                      <QrCode className="w-16 h-16 text-muted-foreground mx-auto mb-4"/>
                      <p className="text-muted-foreground">
                        Откройте коробку и нажмите на иконку QR-кода для
                        просмотра
                      </p>
                    </div>)}
                </CardContent>
              </Card>
            </TabsContent>)}
        </Tabs>
      </main>
    </div>);
}
