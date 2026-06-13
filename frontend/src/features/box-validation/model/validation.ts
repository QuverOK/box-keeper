export const MIN_BOX_DIMENSION_CM = 1;
export interface BoxDimensions {
    sizeW: number;
    sizeD: number;
    sizeH: number;
}
export interface RoomDimensions {
    roomWidth: number;
    roomDepth: number;
    roomHeight: number;
}
export interface BoxValidationResult {
    valid: boolean;
    errors: string[];
}
export function validateBoxFitsInRoom(box: BoxDimensions, room: RoomDimensions): BoxValidationResult {
    const errors: string[] = [];
    const roomWcm = room.roomWidth * 100;
    const roomDcm = room.roomDepth * 100;
    const roomHcm = room.roomHeight * 100;
    if (box.sizeW < MIN_BOX_DIMENSION_CM) {
        errors.push(`Длина коробки не может быть меньше ${MIN_BOX_DIMENSION_CM} см`);
    }
    if (box.sizeD < MIN_BOX_DIMENSION_CM) {
        errors.push(`Ширина коробки не может быть меньше ${MIN_BOX_DIMENSION_CM} см`);
    }
    if (box.sizeH < MIN_BOX_DIMENSION_CM) {
        errors.push(`Высота коробки не может быть меньше ${MIN_BOX_DIMENSION_CM} см`);
    }
    if (box.sizeW > roomWcm) {
        errors.push(`Длина коробки (${box.sizeW} см) превышает длину комнаты (${roomWcm} см)`);
    }
    if (box.sizeD > roomDcm) {
        errors.push(`Ширина коробки (${box.sizeD} см) превышает ширину комнаты (${roomDcm} см)`);
    }
    if (box.sizeH > roomHcm) {
        errors.push(`Высота коробки (${box.sizeH} см) превышает высоту комнаты (${roomHcm} см)`);
    }
    return { valid: errors.length === 0, errors };
}
export interface NamedBoxDimensions extends BoxDimensions {
    name: string;
}
function boxExceedsRoom(box: BoxDimensions, room: RoomDimensions): boolean {
    const roomWcm = room.roomWidth * 100;
    const roomDcm = room.roomDepth * 100;
    const roomHcm = room.roomHeight * 100;
    return box.sizeW > roomWcm || box.sizeD > roomDcm || box.sizeH > roomHcm;
}
export function findBoxesExceedingRoom<T extends BoxDimensions>(boxes: T[], room: RoomDimensions): T[] {
    return boxes.filter((box) => boxExceedsRoom(box, room));
}
export function validateStorageRoomFitsAllBoxes(boxes: NamedBoxDimensions[], room: RoomDimensions): BoxValidationResult {
    const oversized = findBoxesExceedingRoom(boxes, room);
    if (oversized.length === 0) {
        return { valid: true, errors: [] };
    }
    const names = oversized.map((b) => b.name).join(", ");
    return {
        valid: false,
        errors: [
            `Невозможно изменить размеры: некоторые коробки превышают новые размеры хранилища (${names})`,
        ],
    };
}
export function isDuplicateBoxName(name: string, boxes: Array<{
    id?: string;
    name: string;
}>, excludeBoxId?: string): boolean {
    const normalized = name.trim().toLowerCase();
    if (!normalized)
        return false;
    return boxes.some((b) => b.name.trim().toLowerCase() === normalized && b.id !== excludeBoxId);
}
