"use client";
import React, { useState } from "react";

interface Props {
  type: "recipe" | "avatar";
  currentUrl?: string | null;
  onUpload: (url: string) => void;
  label?: string;
}

export default function ImageUpload({ type, currentUrl, onUpload, label }: Props) {
  const [preview, setPreview] = useState<string | null>(currentUrl ?? null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAvatar = type === "avatar";

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setPreview(URL.createObjectURL(file));
    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", type);

      const res = await fetch("/api/uploads", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: formData,
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.error || "Feltöltés sikertelen");
      }

      onUpload(data.url);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Feltöltés sikertelen");
      setPreview(currentUrl ?? null);
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {label && <span className="fieldset-legend">{label}</span>}

      <div className="flex items-center gap-4">
        {/* Preview */}
        {preview ? (
          <div
            className={`shrink-0 overflow-hidden bg-base-300 ${isAvatar ? "rounded-full w-16 h-16" : "rounded-lg w-24 h-16"}`}
          >
            <img
              src={preview}
              alt="Preview"
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div
            className={`shrink-0 flex items-center justify-center bg-base-300 text-base-content/30 text-2xl ${isAvatar ? "rounded-full w-16 h-16" : "rounded-lg w-24 h-16"}`}
          >
            {isAvatar ? "👤" : "🖼️"}
          </div>
        )}

        {/* Input + state */}
        <div className="flex flex-col gap-1 flex-1">
          <label
            className={`btn btn-outline btn-sm w-full ${isUploading ? "btn-disabled" : ""}`}
          >
            {isUploading ? (
              <>
                <span className="loading loading-spinner loading-xs" />
                Feltöltés...
              </>
            ) : (
              "📁 Kép kiválasztása"
            )}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleChange}
              disabled={isUploading}
            />
          </label>

          {preview && !isUploading && (
            <button
              type="button"
              className="btn btn-ghost btn-xs text-error"
              onClick={() => {
                setPreview(null);
                onUpload("");
              }}
            >
              Eltávolítás
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="alert alert-error py-1 text-xs">
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
