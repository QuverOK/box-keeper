import { ArrowLeft, Camera, Download, QrCode } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, } from "@/shared/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
interface QRScannerProps {
    onBack: () => void;
    qrCodeData?: {
        boxName: string;
        storageName: string;
        qrCodeUrl: string;
    };
}
export function QRScanner({ onBack, qrCodeData }: QRScannerProps) {
    const handleDownloadQR = () => {
        if (qrCodeData?.qrCodeUrl) {
            console.log("Downloading QR code...");
        }
    };
    const handleScanQR = () => {
        console.log("Opening camera for QR scan...");
    };
    return (<div className="min-h-screen bg-background">

      <header className="bg-card border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="w-5 h-5"/>
            </Button>
            <div className="flex-1">
              <h1 className="text-2xl">QR-коды</h1>
              <p className="text-muted-foreground">Сканирование и управление</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <Tabs defaultValue="scan" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="scan" className="gap-2">
              <Camera className="w-4 h-4"/>
              Сканировать
            </TabsTrigger>
            <TabsTrigger value="view" className="gap-2">
              <QrCode className="w-4 h-4"/>
              Просмотр
            </TabsTrigger>
          </TabsList>

          <TabsContent value="scan" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Сканировать QR-код</CardTitle>
                <CardDescription>
                  Наведите камеру на QR-код коробки для быстрого доступа
                </CardDescription>
              </CardHeader>
              <CardContent>

                <div className="aspect-square bg-gray-900 rounded-lg flex items-center justify-center mb-4">
                  <div className="text-center text-white">
                    <Camera className="w-16 h-16 mx-auto mb-4 opacity-50"/>
                    <p className="text-sm opacity-75">Камера откроется здесь</p>
                  </div>
                </div>

                <Button className="w-full gap-2" onClick={handleScanQR}>
                  <Camera className="w-4 h-4"/>
                  Включить камеру
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

          <TabsContent value="view" className="mt-6">
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
                {qrCodeData ? (<>

                    <div className="bg-card p-8 rounded-lg border-2 border-border mb-4">
                      <div className="aspect-square bg-white dark:bg-white flex items-center justify-center rounded">

                        <svg viewBox="0 0 200 200" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">

                          <rect width="200" height="200" fill="white"/>
                          <g fill="black">

                            <rect x="10" y="10" width="60" height="60"/>
                            <rect x="20" y="20" width="40" height="40" fill="white"/>
                            <rect x="30" y="30" width="20" height="20"/>

                            <rect x="130" y="10" width="60" height="60"/>
                            <rect x="140" y="20" width="40" height="40" fill="white"/>
                            <rect x="150" y="30" width="20" height="20"/>

                            <rect x="10" y="130" width="60" height="60"/>
                            <rect x="20" y="140" width="40" height="40" fill="white"/>
                            <rect x="30" y="150" width="20" height="20"/>

                            {Array.from({ length: 50 }).map((_, i) => (<rect key={i} x={80 + (i % 8) * 10} y={80 + Math.floor(i / 8) * 10} width="8" height="8" opacity={Math.random() > 0.5 ? 1 : 0}/>))}
                          </g>
                        </svg>
                      </div>
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
                      Откройте коробку и нажмите на иконку QR-кода для просмотра
                    </p>
                  </div>)}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>);
}
