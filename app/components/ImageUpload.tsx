"use client";
import React, { useState, forwardRef, useImperativeHandle } from "react";

interface Props {
  type: "recipe" | "avatar";
  currentUrl?: string | null;
  /** Called after a successful cloud upload with the final URL. */
  onUpload: (url: string) => void;
  label?: string;
}

/** Call `ref.upload()` from the parent form's submit handler to trigger the actual cloud upload. */
export interface ImageUploadHandle {
  upload(): Promise<string | null>;
  hasPendingFile: boolean;
}

const MAX_SIZE_MB = 5;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const ALLOWED_EXT = "JPG, PNG, WEBP";

const ImageUpload = forwardRef<ImageUploadHandle, Props>(function ImageUpload(
  { type, currentUrl, onUpload, label },
  ref,
) {
  const [preview, setPreview] = useState<string | null>(currentUrl ?? null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAvatar = type === "avatar";

  useImperativeHandle(ref, () => ({
    hasPendingFile: pendingFile !== null,
    async upload(): Promise<string | null> {
      if (!pendingFile) return null;

      setIsUploading(true);
      setError(null);

      try {
        const formData = new FormData();
        formData.append("file", pendingFile);
        formData.append("type", type);

        const res = await fetch("/api/uploads", {
          method: "POST",
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
          body: formData,
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          const msg: string = data?.error ?? "";
          if (res.status === 413 || msg.includes("size")) {
            throw new Error(`A fájl túl nagy. Maximum méret: ${MAX_SIZE_MB} MB.`);
          } else if (res.status === 415 || msg.includes("type")) {
            throw new Error(`Nem támogatott formátum. Engedélyezett: ${ALLOWED_EXT}`);
          } else if (res.status === 401) {
            throw new Error("Nincs jogosultságod a feltöltéshez. Jelentkezz be újra.");
          } else {
            throw new Error(msg || "Feltöltés sikertelen. Próbáld újra.");
          }
        }

        setPendingFile(null);
        onUpload(data.url);
        return data.url as string;
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Feltöltés sikertelen. Próbáld újra.");
        return null;
      } finally {
        setIsUploading(false);
      }
    },
  }));

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError(
        `Nem támogatott formátum: ${file.type || "ismeretlen"}. Engedélyezett: ${ALLOWED_EXT}`,
      );
      e.target.value = "";
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      const sizeMB = (file.size / 1024 / 1024).toFixed(1);
      setError(`A fájl túl nagy: ${sizeMB} MB. Maximum méret: ${MAX_SIZE_MB} MB.`);
      e.target.value = "";
      return;
    }

    setError(null);
    setPendingFile(file);
    setPreview(URL.createObjectURL(file));
    e.target.value = "";
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
            ) : pendingFile ? (
              "✅ Kész a mentésre"
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
                setPendingFile(null);
                onUpload("");
              }}
            >
              Eltávolítás
            </button>
          )}
        </div>
      </div>

      {pendingFile && !isUploading && (
        <p className="text-xs text-warning">⚠️ A kép mentéskor töltődik fel.</p>
      )}

      {error && (
        <div className="alert alert-error py-1 text-xs">
          <span>{error}</span>
        </div>
      )}
    </div>
  );
});

export default ImageUpload;
