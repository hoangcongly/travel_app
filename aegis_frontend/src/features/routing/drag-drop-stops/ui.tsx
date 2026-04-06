"use client";

import React, { useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, MapPin, X } from "lucide-react";
import { Place } from "@/entities/place/model/types";
import { cn } from "@/shared/lib/utils";

/**
 * Stop Card Component
 * ──────────────────
 * Thẻ hiển thị trạm dừng với khả năng kéo thả.
 */
interface StopCardProps {
  place: Place;
  index: number;
  onRemove?: (id: number) => void;
}

function StopCard({ place, index, onRemove }: StopCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: place.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative flex items-center gap-3 p-4 glass rounded-2xl border-white/5 shadow-xl transition-all",
        isDragging ? "z-50 opacity-50 scale-105 border-aegis-accent" : "hover:border-aegis-accent/30"
      )}
    >
      {/* Handle Kéo thả */}
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1 text-aegis-muted hover:text-aegis-accent transition-colors"
      >
        <GripVertical size={20} />
      </div>

      {/* Số thứ tự và Marker icon */}
      <div className="flex flex-col items-center gap-0.5">
         <span className="text-[10px] font-bold text-aegis-muted leading-none">{index + 1}</span>
         <MapPin size={18} className={cn(
            index === 0 ? "text-green-400" : "text-aegis-accent"
         )} />
      </div>

      {/* Thông tin địa danh */}
      <div className="flex-1 min-w-0 overflow-hidden">
        <h4 className="text-sm font-semibold text-aegis-text truncate">{place.name}</h4>
        <p className="text-[11px] text-aegis-muted truncate">{place.address}</p>
      </div>

      {/* Hành động xóa */}
      {onRemove && (
        <button
          onClick={() => onRemove(place.id)}
          className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-red-500/10 hover:text-red-400 rounded-lg transition-all"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}

/**
 * Drag & Drop Stops List
 * ──────────────────────
 * Component chính quản lý danh sách trạm dừng kéo thả.
 */
interface DragDropStopsProps {
  stops: Place[];
  onOrderChange: (newStops: Place[]) => void;
  onRemove?: (id: number) => void;
}

export default function DragDropStops({
  stops,
  onOrderChange,
  onRemove,
}: DragDropStopsProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = stops.findIndex((p) => p.id === active.id);
      const newIndex = stops.findIndex((p) => p.id === over.id);
      onOrderChange(arrayMove(stops, oldIndex, newIndex));
    }
  }

  return (
    <div className="space-y-3">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={stops.map((p) => p.id)}
          strategy={verticalListSortingStrategy}
        >
          {stops.map((place, index) => (
            <StopCard
              key={place.id}
              place={place}
              index={index}
              onRemove={onRemove}
            />
          ))}
        </SortableContext>
      </DndContext>
      
      {stops.length === 0 && (
        <div className="py-20 text-center glass rounded-2xl border-dashed">
            <p className="text-sm text-aegis-muted italic">Chưa có trạm dừng nào được chọn.</p>
        </div>
      )}
    </div>
  );
}
