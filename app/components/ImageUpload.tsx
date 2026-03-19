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

  const MAX_SIZE_MB = 5;
  const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;
  const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
  const ALLOWED_EXT = "JPG, PNG, WEBP";

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // --- Client-side pre-validation (no network request wasted) ---
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError(
        `Nem támogatott formátum: ${file.type || "ismeretlen"}. Engedélyezett: ${ALLOWED_EXT}`,
      );
      return;
    }

    if (file.size > MAX_SIZE_BYTES) {
      const sizeMB = (file.size / 1024 / 1024).toFixed(1);
      setError(`A fájl túl nagy: ${sizeMB} MB. Maximum méret: ${MAX_SIZE_MB} MB.`);
      return;
    }

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
        // Map backend error codes to friendly messages
        const msg: string = data?.error ?? "";
        if (msg.includes("5 MB") || msg.includes("size")) {
          throw new Error(`A fájl túl nagy. Maximum méret: ${MAX_SIZE_MB} MB.`);
        } else if (msg.includes("file type") || msg.includes("Invalid")) {
          throw new Error(`Nem támogatott formátum. Engedélyezett: ${ALLOWED_EXT}`);
        } else if (msg.includes("Unauthorized") || msg.includes("401")) {
          throw new Error("Nincs jogosultságod a feltöltéshez. Jelentkezz be újra.");
        } else if (msg.includes("upload failed") || msg.includes("500")) {
          throw new Error("A szerver nem tudta feldolgozni a képet. Próbáld újra.");
        } else {
          throw new Error(msg || "Feltöltés sikertelen. Próbáld újra.");
        }
      }

      onUpload(data.url);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Feltöltés sikertelen. Próbáld újra.");
      setPreview(currentUrl ?? null);
    } finally {
      setIsUploading(false);
      // Reset the input so the same file can be retried if needed
      e.target.value = "";
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
            <img src={preview} alt="Preview" className="w-full h-full object-cover" />
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
          <label className={`btn btn-outline btn-sm w-full ${isUploading ? "btn-disabled" : ""}`}>
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
