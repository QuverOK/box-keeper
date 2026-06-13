import QRCode from "qrcode";
const QR_SIZE = 400;
const PADDING = 24;
const TEXT_GAP = 16;
const FONT_SIZE = 20;
const LINE_HEIGHT = 26;
const MAX_TEXT_WIDTH = QR_SIZE;
const MAX_LINES = 3;
export function sanitizeBoxFilename(boxName: string): string {
    const sanitized = boxName
        .trim()
        .replace(/\s+/g, "-")
        .replace(/[<>:"/\\|?*]/g, "");
    return sanitized || "korobka";
}
function loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
    });
}
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number): string[] {
    const words = text.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0)
        return [];
    const lines: string[] = [];
    let current = "";
    for (const word of words) {
        const test = current ? `${current} ${word}` : word;
        if (ctx.measureText(test).width <= maxWidth) {
            current = test;
            continue;
        }
        if (current)
            lines.push(current);
        current = word;
        if (lines.length >= maxLines)
            break;
    }
    if (lines.length < maxLines && current) {
        lines.push(current);
    }
    if (lines.length === maxLines &&
        words.join(" ").length > lines.join(" ").length) {
        const last = lines[maxLines - 1];
        let truncated = last;
        while (truncated.length > 0 &&
            ctx.measureText(`${truncated}…`).width > maxWidth) {
            truncated = truncated.slice(0, -1);
        }
        lines[maxLines - 1] = `${truncated}…`;
    }
    return lines;
}
export async function createQrLabelDataUrl(qrToken: string, boxName: string): Promise<string> {
    const qrDataUrl = await QRCode.toDataURL(qrToken, {
        width: QR_SIZE,
        margin: 2,
    });
    const qrImage = await loadImage(qrDataUrl);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx)
        throw new Error("Canvas not supported");
    ctx.font = `600 ${FONT_SIZE}px system-ui, -apple-system, sans-serif`;
    const lines = wrapText(ctx, boxName, MAX_TEXT_WIDTH, MAX_LINES);
    const textHeight = lines.length * LINE_HEIGHT;
    const canvasWidth = QR_SIZE + PADDING * 2;
    const canvasHeight = PADDING + QR_SIZE + TEXT_GAP + textHeight + PADDING;
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    ctx.drawImage(qrImage, PADDING, PADDING, QR_SIZE, QR_SIZE);
    ctx.fillStyle = "#000000";
    ctx.font = `600 ${FONT_SIZE}px system-ui, -apple-system, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    const textY = PADDING + QR_SIZE + TEXT_GAP;
    const textX = canvasWidth / 2;
    lines.forEach((line, i) => {
        ctx.fillText(line, textX, textY + i * LINE_HEIGHT);
    });
    return canvas.toDataURL("image/png");
}
export function downloadQrLabel(dataUrl: string, boxName: string): void {
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = `${sanitizeBoxFilename(boxName)}.png`;
    link.click();
}
