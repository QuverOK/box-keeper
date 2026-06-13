import React from "react";
import { Card } from "@/shared/ui/card";
import { cn } from "@/shared/lib/cn";
import { darkenColor, getBorderColor } from "../lib/color";
export interface DraggableBoxProps {
    id: string;
    color: string;
    editMode: boolean;
    isDragging: boolean;
    isHovered: boolean;
    anyDragActive: boolean;
    style?: React.CSSProperties;
    className?: string;
    draggable?: boolean;
    onDragStart?: (e: React.DragEvent) => void;
    onDragEnd?: (e: React.DragEvent) => void;
    onMouseEnter?: () => void;
    onMouseLeave?: () => void;
    onClick?: () => void;
    children?: React.ReactNode;
}
export function DraggableBox({ color, editMode, isDragging, isHovered, anyDragActive, style, className, draggable, onDragStart, onDragEnd, onMouseEnter, onMouseLeave, onClick, children, }: DraggableBoxProps) {
    const hoverShadow = editMode && isHovered && !isDragging
        ? `inset 0 0 0 2px ${darkenColor(color, 0.35)}`
        : undefined;
    return (<Card className={cn("w-full h-full transition-all relative overflow-hidden select-none border shadow-sm", editMode
            ? isDragging
                ? "cursor-grabbing"
                : "cursor-grab"
            : "cursor-pointer hover:brightness-95", anyDragActive && !isDragging && "pointer-events-none", className)} style={{
            backgroundColor: color,
            borderColor: getBorderColor(color),
            opacity: isDragging ? 0.4 : 1,
            boxShadow: hoverShadow,
            ...style,
        }} draggable={draggable} onDragStart={onDragStart} onDragEnd={onDragEnd} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} onClick={onClick}>
      {children}
    </Card>);
}
