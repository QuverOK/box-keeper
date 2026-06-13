import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/shared/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Alert, AlertDescription } from "@/shared/ui/alert";
import { normalizeApiError } from "@/shared/api";
import type { Partition, LayoutLabel } from "@/shared/model";

interface LayoutEditControlsProps {
  partitions: Partition[];
  layoutLabels: LayoutLabel[];
  roomSize: { width: number; depth: number; height: number };
  onCreatePartition: (data: {
    x: number;
    y: number;
    z: number;
    width: number;
    depth: number;
    height: number;
    label?: string;
  }) => Promise<void>;
  onDeletePartition: (id: string) => Promise<void>;
  onCreateLabel: (data: {
    x: number;
    y: number;
    text: string;
  }) => Promise<void>;
  onDeleteLabel: (id: string) => Promise<void>;
}

const DEFAULT_PART_WIDTH = 100;
const DEFAULT_PART_DEPTH = 40;
const DEFAULT_PART_HEIGHT = 5;

function centerPartitionXY(
  roomSize: { width: number; depth: number },
  width: number,
  depth: number,
) {
  const roomWcm = roomSize.width * 100;
  const roomDcm = roomSize.depth * 100;
  return {
    x: Math.max(0, (roomWcm - width) / 2),
    y: Math.max(0, (roomDcm - depth) / 2),
  };
}

function centerLabelXY(roomSize: { width: number; depth: number }) {
  const roomWcm = roomSize.width * 100;
  const roomDcm = roomSize.depth * 100;
  return { x: roomWcm / 2, y: roomDcm / 2 };
}

export function LayoutEditControls({
  partitions,
  layoutLabels,
  roomSize,
  onCreatePartition,
  onDeletePartition,
  onCreateLabel,
  onDeleteLabel,
}: LayoutEditControlsProps) {
  const [partOpen, setPartOpen] = useState(false);
  const [labelOpen, setLabelOpen] = useState(false);
  const [px, setPx] = useState("0");
  const [py, setPy] = useState("0");
  const [pz, setPz] = useState("0");
  const [pw, setPw] = useState(String(DEFAULT_PART_WIDTH));
  const [pd, setPd] = useState(String(DEFAULT_PART_DEPTH));
  const [ph, setPh] = useState(String(DEFAULT_PART_HEIGHT));
  const [pLabel, setPLabel] = useState("");
  const [lx, setLx] = useState("0");
  const [ly, setLy] = useState("0");
  const [lText, setLText] = useState("");
  const [partError, setPartError] = useState<string | null>(null);
  const [labelError, setLabelError] = useState<string | null>(null);

  const resetPartitionForm = () => {
    const center = centerPartitionXY(
      roomSize,
      DEFAULT_PART_WIDTH,
      DEFAULT_PART_DEPTH,
    );
    setPx(String(Math.round(center.x)));
    setPy(String(Math.round(center.y)));
    setPz("0");
    setPw(String(DEFAULT_PART_WIDTH));
    setPd(String(DEFAULT_PART_DEPTH));
    setPh(String(DEFAULT_PART_HEIGHT));
    setPLabel("");
  };

  const resetLabelForm = () => {
    const center = centerLabelXY(roomSize);
    setLx(String(Math.round(center.x)));
    setLy(String(Math.round(center.y)));
    setLText("");
  };

  const submitPartition = async () => {
    setPartError(null);
    try {
      await onCreatePartition({
        x: parseFloat(px),
        y: parseFloat(py),
        z: parseFloat(pz),
        width: parseFloat(pw),
        depth: parseFloat(pd),
        height: parseFloat(ph),
        label: pLabel.trim() || undefined,
      });
      setPartOpen(false);
    } catch (err) {
      setPartError(normalizeApiError(err).message);
    }
  };

  const submitLabel = async () => {
    if (!lText.trim()) return;
    setLabelError(null);
    try {
      await onCreateLabel({
        x: parseFloat(lx),
        y: parseFloat(ly),
        text: lText.trim(),
      });
      setLabelOpen(false);
      setLText("");
    } catch (err) {
      setLabelError(normalizeApiError(err).message);
    }
  };

  return (
    <div className="flex flex-wrap gap-2 items-center">
      <Dialog
        open={partOpen}
        onOpenChange={(open) => {
          setPartOpen(open);
          if (open) resetPartitionForm();
          if (!open) setPartError(null);
        }}
      >
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1">
            <Plus className="w-4 h-4" />
            Перегородка
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Новая перегородка</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-3 gap-3 py-2">
            <div>
              <Label>X (см)</Label>
              <Input value={px} onChange={(e) => setPx(e.target.value)} />
            </div>
            <div>
              <Label>Y (см)</Label>
              <Input value={py} onChange={(e) => setPy(e.target.value)} />
            </div>
            <div>
              <Label>Z (см)</Label>
              <Input value={pz} onChange={(e) => setPz(e.target.value)} />
            </div>
            <div>
              <Label>Длина</Label>
              <Input value={pw} onChange={(e) => setPw(e.target.value)} />
            </div>
            <div>
              <Label>Ширина</Label>
              <Input value={pd} onChange={(e) => setPd(e.target.value)} />
            </div>
            <div>
              <Label>Высота</Label>
              <Input value={ph} onChange={(e) => setPh(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Подпись (необязательно)</Label>
            <Input value={pLabel} onChange={(e) => setPLabel(e.target.value)} />
          </div>
          {partError && (
            <Alert variant="destructive">
              <AlertDescription>{partError}</AlertDescription>
            </Alert>
          )}
          <DialogFooter>
            <Button onClick={submitPartition}>Добавить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={labelOpen}
        onOpenChange={(open) => {
          setLabelOpen(open);
          if (open) resetLabelForm();
          if (!open) setLabelError(null);
        }}
      >
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1">
            <Plus className="w-4 h-4" />
            Текст
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Текст на плане</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            <div>
              <Label>X (см)</Label>
              <Input value={lx} onChange={(e) => setLx(e.target.value)} />
            </div>
            <div>
              <Label>Y (см)</Label>
              <Input value={ly} onChange={(e) => setLy(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Текст</Label>
            <Input value={lText} onChange={(e) => setLText(e.target.value)} />
          </div>
          {labelError && (
            <Alert variant="destructive">
              <AlertDescription>{labelError}</AlertDescription>
            </Alert>
          )}
          <DialogFooter>
            <Button onClick={submitLabel} disabled={!lText.trim()}>
              Добавить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {partitions.length > 0 && (
        <span className="text-xs text-muted-foreground">
          {partitions.length} перегородок
        </span>
      )}
      {layoutLabels.length > 0 && (
        <span className="text-xs text-muted-foreground">
          {layoutLabels.length} подписей
        </span>
      )}

      {(partitions.length > 0 || layoutLabels.length > 0) && (
        <div className="w-full flex flex-wrap gap-1 mt-1">
          {partitions.map((p) => (
            <div
              key={p.id}
              className="inline-flex items-center gap-1 h-7 px-2 rounded-md bg-muted text-xs"
            >
              <span className="truncate max-w-[140px]">
                {p.label ??
                  `Перег. ${Math.round(p.width)}×${Math.round(p.depth)}`}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-5 w-5 shrink-0"
                aria-label="Удалить перегородку"
                onClick={() => onDeletePartition(p.id)}
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          ))}
          {layoutLabels.map((l) => (
            <div
              key={l.id}
              className="inline-flex items-center gap-1 h-7 px-2 rounded-md bg-muted text-xs"
            >
              <span className="truncate max-w-[140px]">
                {l.text.slice(0, 20)}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-5 w-5 shrink-0"
                aria-label="Удалить подпись"
                onClick={() => onDeleteLabel(l.id)}
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
