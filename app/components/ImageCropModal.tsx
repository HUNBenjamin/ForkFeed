"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Box = { x: number; y: number; w: number; h: number };
type Corner = "tl" | "tr" | "bl" | "br";

type DragAction =
  | { kind: "move"; orig: Box; mx: number; my: number }
  | { kind: "corner"; corner: Corner; orig: Box; mx: number; my: number };

interface Props {
  /** Object URL of the selected image */
  src: string;
  /** Width / height aspect ratio — 16/9 for recipes, 1 for avatars */
  aspect: number;
  onConfirm: (blob: Blob) => void;
  onCancel: () => void;
}

const MIN_SIZE = 80;
const HANDLE = 14;

const CORNER_CURSOR: Record<Corner, string> = {
  tl: "nwse-resize",
  br: "nwse-resize",
  tr: "nesw-resize",
  bl: "nesw-resize",
};

export default function ImageCropModal({ src, aspect, onConfirm, onCancel }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const dragRef = useRef<DragAction | null>(null);

  const [imgBounds, setImgBounds] = useState<Box | null>(null);
  const [crop, setCrop] = useState<Box | null>(null);

  // Compute where the image is actually rendered inside the container
  // (object-contain can leave letterbox bars)
  const computeBounds = useCallback(() => {
    const container = containerRef.current;
    const img = imgRef.current;
    if (!container || !img || !img.naturalWidth) return;

    const cW = container.clientWidth;
    const cH = container.clientHeight;
    const imgRatio = img.naturalWidth / img.naturalHeight;
    const cRatio = cW / cH;

    let iW: number, iH: number, iX: number, iY: number;
    if (imgRatio > cRatio) {
      iW = cW;
      iH = cW / imgRatio;
      iX = 0;
      iY = (cH - iH) / 2;
    } else {
      iH = cH;
      iW = cH * imgRatio;
      iX = (cW - iW) / 2;
      iY = 0;
    }

    const bounds: Box = { x: iX, y: iY, w: iW, h: iH };
    setImgBounds(bounds);

    // Initial crop box: 85 % of the image, centered, locked to aspect ratio
    const maxW = iW * 0.85;
    const maxH = iH * 0.85;
    let cw = maxW;
    let ch = maxW / aspect;
    if (ch > maxH) {
      ch = maxH;
      cw = ch * aspect;
    }
    setCrop({
      x: iX + (iW - cw) / 2,
      y: iY + (iH - ch) / 2,
      w: cw,
      h: ch,
    });
  }, [aspect]);

  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;
    if (img.complete && img.naturalWidth) {
      computeBounds();
    } else {
      img.onload = computeBounds;
    }
    window.addEventListener("resize", computeBounds);
    return () => window.removeEventListener("resize", computeBounds);
  }, [computeBounds]);

  // Clamp a box so it stays completely inside imgBounds, maintaining aspect ratio
  const clampBox = useCallback(
    (box: Box, bounds: Box): Box => {
      let { x, y, w, h } = box;
      w = Math.max(MIN_SIZE, Math.min(w, bounds.w));
      h = w / aspect;
      if (h > bounds.h) {
        h = bounds.h;
        w = h * aspect;
        w = Math.max(MIN_SIZE, w);
        h = w / aspect;
      }
      x = Math.max(bounds.x, Math.min(x, bounds.x + bounds.w - w));
      y = Math.max(bounds.y, Math.min(y, bounds.y + bounds.h - h));
      return { x, y, w, h };
    },
    [aspect],
  );

  // Global mouse move / up — attached once, reads from dragRef so no stale closure issue
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const act = dragRef.current;
      if (!act) return;
      const container = containerRef.current;
      const bounds = imgBounds;
      if (!container || !bounds) return;

      const rect = container.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const dx = mx - act.mx;
      const orig = act.orig;

      if (act.kind === "move") {
        setCrop(clampBox({ ...orig, x: orig.x + dx, y: orig.y + (my - act.my) }, bounds));
        return;
      }

      // Corner resize — maintain aspect ratio, anchor is the opposite corner
      const c = act.corner;
      let newW: number;
      if (c === "tl" || c === "bl") {
        newW = Math.max(MIN_SIZE, orig.w - dx);
      } else {
        newW = Math.max(MIN_SIZE, orig.w + dx);
      }
      const newH = newW / aspect;

      let nx = orig.x;
      let ny = orig.y;
      if (c === "tl") {
        nx = orig.x + orig.w - newW;
        ny = orig.y + orig.h - newH;
      } else if (c === "tr") {
        ny = orig.y + orig.h - newH;
      } else if (c === "bl") {
        nx = orig.x + orig.w - newW;
      }
      // br: anchor is TL → x and y stay

      setCrop(clampBox({ x: nx, y: ny, w: newW, h: newH }, bounds));
    };

    const onUp = () => {
      dragRef.current = null;
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [imgBounds, aspect, clampBox]);

  const startDrag = useCallback(
    (e: React.MouseEvent, kind: "move" | "corner", corner?: Corner) => {
      e.preventDefault();
      e.stopPropagation();
      if (!crop) return;
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      if (kind === "move") {
        dragRef.current = { kind: "move", orig: { ...crop }, mx, my };
      } else {
        dragRef.current = { kind: "corner", corner: corner!, orig: { ...crop }, mx, my };
      }
    },
    [crop],
  );

  const handleConfirm = useCallback(() => {
    const img = imgRef.current;
    if (!img || !crop || !imgBounds) return;

    const scaleX = img.naturalWidth / imgBounds.w;
    const scaleY = img.naturalHeight / imgBounds.h;
    const sx = Math.round((crop.x - imgBounds.x) * scaleX);
    const sy = Math.round((crop.y - imgBounds.y) * scaleY);
    const sw = Math.round(crop.w * scaleX);
    const sh = Math.round(crop.h * scaleY);

    const canvas = document.createElement("canvas");
    canvas.width = sw;
    canvas.height = sh;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
    canvas.toBlob(
      (blob) => {
        if (blob) onConfirm(blob);
      },
      "image/jpeg",
      0.92,
    );
  }, [crop, imgBounds, onConfirm]);

  const CORNERS: Corner[] = ["tl", "tr", "bl", "br"];

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80 p-4"
      onMouseDown={(e) => e.preventDefault()}
    >
      <div className="flex flex-col gap-4 w-full max-w-3xl">
        <p className="text-white/60 text-sm text-center">
          Húzd a keretet a kívánt területre · sarkakkal méretezd
        </p>

        {/* Container holding the image + crop overlay */}
        <div
          ref={containerRef}
          className="relative w-full bg-black overflow-hidden select-none"
          style={{ height: "min(65vh, 500px)" }}
        >
          <img
            ref={imgRef}
            src={src}
            alt="Crop preview"
            className="absolute inset-0 w-full h-full object-contain"
            draggable={false}
          />

          {crop && imgBounds && (
            <>
              {/* Dark overlay — 4 strips around the crop box */}
              <div
                className="absolute inset-x-0 top-0 bg-black/65 pointer-events-none"
                style={{ height: crop.y }}
              />
              <div
                className="absolute inset-x-0 bottom-0 bg-black/65 pointer-events-none"
                style={{ top: crop.y + crop.h }}
              />
              <div
                className="absolute bg-black/65 pointer-events-none"
                style={{ left: 0, top: crop.y, width: crop.x, height: crop.h }}
              />
              <div
                className="absolute bg-black/65 pointer-events-none"
                style={{ left: crop.x + crop.w, top: crop.y, right: 0, height: crop.h }}
              />

              {/* The crop box itself */}
              <div
                className="absolute border-2 border-white cursor-move"
                style={{ left: crop.x, top: crop.y, width: crop.w, height: crop.h }}
                onMouseDown={(e) => startDrag(e, "move")}
              >
                {/* Rule-of-thirds grid */}
                <div className="absolute inset-0 pointer-events-none">
                  <div
                    className="absolute top-0 bottom-0 border-r border-white/30"
                    style={{ left: "33.33%" }}
                  />
                  <div
                    className="absolute top-0 bottom-0 border-r border-white/30"
                    style={{ left: "66.66%" }}
                  />
                  <div
                    className="absolute left-0 right-0 border-b border-white/30"
                    style={{ top: "33.33%" }}
                  />
                  <div
                    className="absolute left-0 right-0 border-b border-white/30"
                    style={{ top: "66.66%" }}
                  />
                </div>

                {/* Corner handles */}
                {CORNERS.map((c) => (
                  <div
                    key={c}
                    className="absolute bg-white z-10"
                    style={{
                      width: HANDLE,
                      height: HANDLE,
                      cursor: CORNER_CURSOR[c],
                      top: c.startsWith("t") ? -HANDLE / 2 : undefined,
                      bottom: c.startsWith("b") ? -HANDLE / 2 : undefined,
                      left: c.endsWith("l") ? -HANDLE / 2 : undefined,
                      right: c.endsWith("r") ? -HANDLE / 2 : undefined,
                    }}
                    onMouseDown={(e) => startDrag(e, "corner", c)}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end gap-3">
          <button type="button" className="btn btn-ghost text-white/80" onClick={onCancel}>
            Mégse
          </button>
          <button type="button" className="btn btn-primary" onClick={handleConfirm}>
            ✂️ Vágás alkalmazása
          </button>
        </div>
      </div>
    </div>
  );
}
