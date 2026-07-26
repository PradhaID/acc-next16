"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";

interface CropModalProps {
  isOpen: boolean;
  imageSrc: string;
  onConfirm: (offsetX: number, offsetY: number, zoom: number) => void;
  onCancel: () => void;
}

export default function CropModal({ isOpen, imageSrc, onConfirm, onCancel }: CropModalProps) {
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, ox: 0, oy: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setZoom(1);
      setOffset({ x: 0, y: 0 });
    }
  }, [isOpen]);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      setDragging(true);
      dragStart.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
    },
    [offset]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging) return;
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      const containerSize = containerRef.current?.offsetWidth || 224;
      const maxOffset = (containerSize * (zoom - 1)) / 2;
      const clampedX = Math.max(-maxOffset, Math.min(maxOffset, dragStart.current.ox + dx));
      const clampedY = Math.max(-maxOffset, Math.min(maxOffset, dragStart.current.oy + dy));
      setOffset({ x: clampedX, y: clampedY });
    },
    [dragging, zoom]
  );

  const onPointerUp = useCallback(() => {
    setDragging(false);
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onCancel}>
      <div
        className="relative w-full max-w-md rounded-2xl border border-stone-200 bg-white p-6 shadow-2xl dark:border-stone-700 dark:bg-stone-900 mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-stone-900 dark:text-white">Adjust Profile Photo</h3>
          <button onClick={onCancel} className="rounded-lg p-1 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors">
            <XMarkIcon className="h-5 w-5 text-stone-400" />
          </button>
        </div>

        {/* Crop preview */}
        <div className="flex justify-center mb-5">
          <div
            ref={containerRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            className="relative h-56 w-56 overflow-hidden rounded-full border-4 border-stone-200 bg-stone-100 dark:border-stone-700 dark:bg-stone-800 select-none"
            style={{ cursor: dragging ? "grabbing" : "grab", touchAction: "none" }}
          >
            <img
              src={imageSrc}
              alt="Crop preview"
              draggable={false}
              className="absolute top-0 left-0 w-full h-full pointer-events-none"
              style={{
                objectFit: "contain",
                transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
                transition: dragging ? "none" : "transform 0.15s ease-out",
              }}
            />
            {/* Grid lines */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute left-1/3 top-0 h-full w-px bg-white/30" />
              <div className="absolute left-2/3 top-0 h-full w-px bg-white/30" />
              <div className="absolute top-1/3 left-0 w-full h-px bg-white/30" />
              <div className="absolute top-2/3 left-0 w-full h-px bg-white/30" />
            </div>
          </div>
        </div>

        {/* Zoom slider */}
        <div className="flex items-center gap-3 mb-5">
          <svg className="h-4 w-4 text-stone-400 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM10.5 7.5v6m3-3h-6" />
          </svg>
          <input
            type="range"
            min={1}
            max={3}
            step={0.05}
            value={zoom}
            onChange={(e) => {
              const newZoom = parseFloat(e.target.value);
              const containerSize = containerRef.current?.offsetWidth || 224;
              const newMaxOffset = (containerSize * (newZoom - 1)) / 2;
              setOffset((prev) => ({
                x: Math.max(-newMaxOffset, Math.min(newMaxOffset, prev.x)),
                y: Math.max(-newMaxOffset, Math.min(newMaxOffset, prev.y)),
              }));
              setZoom(newZoom);
            }}
            className="flex-1 h-1.5 bg-stone-200 rounded-full appearance-none cursor-pointer accent-orange-500 dark:bg-stone-700"
          />
          <svg className="h-5 w-5 text-stone-400 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM10.5 7.5v6m3-3h-6" />
          </svg>
          <span className="text-[10px] font-bold text-stone-400 w-8 text-right tabular-nums">{zoom.toFixed(1)}x</span>
        </div>

        <p className="text-[10px] text-stone-400 text-center mb-4">Drag to reposition. Use the slider to zoom.</p>

        {/* Actions */}
        <div className="flex gap-2">
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 text-sm font-bold text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors">
            Cancel
          </button>
          <button
            onClick={() => onConfirm(offset.x, offset.y, zoom)}
            className="flex-1 py-2.5 rounded-xl bg-orange-600 text-sm font-bold text-white hover:bg-orange-500 transition-colors shadow-sm"
          >
            Apply Crop
          </button>
        </div>
      </div>
    </div>
  );
}
