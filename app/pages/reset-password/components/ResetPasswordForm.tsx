"use client";
import { useState, useEffect, type FormEvent } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import Input from "../../login/components/Input";

const errorTranslations: Record<string, string> = {
  "Invalid JSON payload.": "Érvénytelen kérés formátum. Kérjük, próbáld újra.",
  "token and new_password are required.": "A token és az új jelszó megadása kötelező.",
  "new_password must be at least 8 characters.":
    "Az új jelszónak legalább 8 karakterből kell állnia.",
  "Invalid or already used reset token.": "Érvénytelen vagy már felhasznált visszaállítási link.",
  "Reset token has expired.": "A visszaállítási link lejárt. Kérj újat.",
};

function translateError(msg: string): string {
  return errorTranslations[msg] ?? msg;
}

export default function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [token, setToken] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{
    newPassword?: string;
    confirmPassword?: string;
  }>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const t = searchParams.get("token");
    setToken(t);
  }, [searchParams]);

  function validate(): boolean {
    const errors: { newPassword?: string; confirmPassword?: string } = {};
    if (!newPassword) {
      errors.newPassword = "Add meg az új jelszavad";
    } else if (newPassword.length < 8) {
      errors.newPassword = "A jelszónak legalább 8 karakterből kell állnia";
    }
    if (!confirmPassword) {
      errors.confirmPassword = "Erősítsd meg az új jelszavad";
    } else if (newPassword !== confirmPassword) {
      errors.confirmPassword = "A két jelszó nem egyezik meg";
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!validate()) return;

    if (!token) {
      setError("Hiányzó visszaállítási token. Kérj új visszaállítási linket.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, new_password: newPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(translateError(data?.error || "Hiba történt. Kérjük, próbáld újra."));
        setLoading(false);
        return;
      }
      setSuccess(true);
      setTimeout(() => router.push("/pages/login"), 3000);
    } catch {
      setError("Nem sikerült csatlakozni a szerverhez. Ellenőrizd az internetkapcsolatod.");
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <>
        <h2 className="card-title text-2xl mb-1">Jelszó visszaállítása</h2>
        <div className="alert alert-error mt-4 text-sm">
          <span>
            Érvénytelen vagy hiányzó visszaállítási link. Kérj új linket az elfelejtett jelszó
            funkcióval.
          </span>
        </div>
        <div className="mt-4 text-center text-sm">
          <Link href="/pages/login" className="link link-primary">
            Vissza a bejelentkezéshez
          </Link>
        </div>
      </>
    );
  }

  if (success) {
    return (
      <>
        <h2 className="card-title text-2xl mb-1">Jelszó visszaállítva!</h2>
        <div className="alert alert-success mt-4 py-4 text-sm">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span>A jelszavad sikeresen megváltozott. Átirányítunk a bejelentkezési oldalra...</span>
        </div>
        <div className="mt-4 text-center text-sm">
          <Link href="/pages/login" className="link link-primary">
            Bejelentkezés most
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <Link href="/pages/login" className="btn btn-ghost btn-sm mb-4 -ml-2 text-base-content/60">
        ← Vissza a bejelentkezéshez
      </Link>
      <h2 className="card-title text-2xl mb-1">Jelszó visszaállítása</h2>
      <p className="text-base-content/60 mb-4">Add meg az új jelszavadat.</p>

      <form onSubmit={onSubmit} noValidate>
        <Input
          label="Új jelszó"
          name="newPassword"
          type="password"
          value={newPassword}
          onChange={(v) => {
            setNewPassword(v);
            setFieldErrors((p) => ({ ...p, newPassword: undefined }));
          }}
          placeholder="Legalább 8 karakter"
          error={fieldErrors.newPassword}
        />
        <Input
          label="Jelszó megerősítése"
          name="confirmPassword"
          type="password"
          value={confirmPassword}
          onChange={(v) => {
            setConfirmPassword(v);
            setFieldErrors((p) => ({ ...p, confirmPassword: undefined }));
          }}
          placeholder="Írd be újra az új jelszavad"
          error={fieldErrors.confirmPassword}
        />
        {error && (
          <div className="alert alert-error mb-3 py-2 text-sm">
            <span>{error}</span>
          </div>
        )}
        <button type="submit" disabled={loading} className="btn btn-primary w-full mt-1">
          {loading ? <span className="loading loading-spinner loading-sm" /> : "Jelszó mentése"}
        </button>
      </form>
    </>
  );
}
