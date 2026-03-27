"use client";
import { useState, type FormEvent } from "react";
import Input from "./Input";
import Link from "next/link";
import { useRouter } from "next/navigation";

const errorTranslations: Record<string, string> = {
  "Invalid JSON payload.": "Érvénytelen kérés formátum. Kérjük, próbáld újra.",
  "Login identifier and password are required.":
    "Az email cím/felhasználónév és a jelszó megadása kötelező.",
  "Invalid credentials.": "Hibás email cím/felhasználónév vagy jelszó.",
  "Account is deactivated.":
    "Ez a fiók deaktiválva lett. Kérjük, vedd fel a kapcsolatot az ügyfélszolgálattal.",
};

function translateError(msg: string): string {
  return errorTranslations[msg] ?? msg;
}

export default function LoginForm() {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ login?: string; password?: string }>({});
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Forgot password state
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotEmailError, setForgotEmailError] = useState<string | undefined>(undefined);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);

  function validate(): boolean {
    const errors: { login?: string; password?: string } = {};
    if (!login.trim()) {
      errors.login = "Add meg az email címed vagy felhasználóneved";
    }
    if (!password) {
      errors.password = "Add meg a jelszavad";
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!validate()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          translateError(data?.error || "A bejelentkezés sikertelen. Kérjük, próbáld újra."),
        );
        setLoading(false);
        return;
      }
      if (data?.token) {
        localStorage.setItem("token", data.token);
      }
      router.push("/pages/main");
    } catch (err) {
      setError("Nem sikerült csatlakozni a szerverhez. Ellenőrizd az internetkapcsolatod.");
      setLoading(false);
    }
  }

  async function onForgotSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setForgotError(null);
    setForgotEmailError(undefined);

    if (!forgotEmail.trim()) {
      setForgotEmailError("Add meg az email címedet");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(forgotEmail.trim())) {
      setForgotEmailError("Érvénytelen email cím formátum");
      return;
    }

    setForgotLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setForgotError(data?.error || "Hiba történt. Kérjük, próbáld újra.");
        setForgotLoading(false);
        return;
      }
      setForgotSuccess(true);
    } catch {
      setForgotError("Nem sikerült csatlakozni a szerverhez. Ellenőrizd az internetkapcsolatod.");
    } finally {
      setForgotLoading(false);
    }
  }

  function openForgot() {
    setShowForgot(true);
    setForgotEmail("");
    setForgotEmailError(undefined);
    setForgotSuccess(false);
    setForgotError(null);
  }

  function closeForgot() {
    setShowForgot(false);
    setForgotSuccess(false);
    setForgotError(null);
  }

  if (showForgot) {
    return (
      <>
        <button
          type="button"
          onClick={closeForgot}
          className="btn btn-ghost btn-sm mb-4 -ml-2 text-base-content/60"
        >
          ← Vissza a bejelentkezéshez
        </button>
        <h2 className="card-title text-2xl mb-1">Elfelejtett jelszó</h2>
        <p className="text-base-content/60 mb-4">
          Add meg a fiókodhoz tartozó email címet, és küldünk egy jelszó-visszaállítási linket.
        </p>

        {forgotSuccess ? (
          <div className="alert alert-success py-4 text-sm">
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
            <span>
              Ha ez az email cím regisztrálva van, hamarosan kapsz egy visszaállítási linket.
              Ellenőrizd a beérkező leveleid (és a spam mappát is).
            </span>
          </div>
        ) : (
          <form onSubmit={onForgotSubmit} noValidate>
            <Input
              label="Email cím"
              name="forgotEmail"
              type="email"
              value={forgotEmail}
              onChange={(v) => {
                setForgotEmail(v);
                setForgotEmailError(undefined);
              }}
              placeholder="email@pelda.hu"
              error={forgotEmailError}
            />
            {forgotError && (
              <div className="alert alert-error mb-3 py-2 text-sm">
                <span>{forgotError}</span>
              </div>
            )}
            <button type="submit" disabled={forgotLoading} className="btn btn-primary w-full mt-1">
              {forgotLoading ? (
                <span className="loading loading-spinner loading-sm" />
              ) : (
                "Visszaállítási link küldése"
              )}
            </button>
          </form>
        )}
      </>
    );
  }

  return (
    <>
      <Link href="/pages/main" className="btn btn-ghost btn-sm mb-4 -ml-2 text-base-content/60">
        ← Vissza a főoldalra
      </Link>
      <h2 className="card-title text-2xl mb-1">Bejelentkezés</h2>
      <p className="text-base-content/60 mb-4">Lépj be a fiókodba</p>
      <form onSubmit={onSubmit} noValidate>
        <Input
          label="Email vagy felhasználónév"
          name="login"
          value={login}
          onChange={(v) => {
            setLogin(v);
            setFieldErrors((p) => ({ ...p, login: undefined }));
          }}
          placeholder="email@pelda.hu"
          error={fieldErrors.login}
        />
        <div className="relative">
          <Input
            label="Jelszó"
            name="password"
            value={password}
            onChange={(v) => {
              setPassword(v);
              setFieldErrors((p) => ({ ...p, password: undefined }));
            }}
            type="password"
            error={fieldErrors.password}
          />
          <button
            type="button"
            onClick={openForgot}
            className="absolute top-1 right-0 text-xs link link-primary"
          >
            Elfelejtett jelszó?
          </button>
        </div>
        {error && (
          <div className="alert alert-error mb-3 py-2 text-sm">
            <span>{error}</span>
          </div>
        )}
        <button type="submit" disabled={loading} className="btn btn-primary w-full mt-1">
          {loading ? <span className="loading loading-spinner loading-sm" /> : "Bejelentkezés"}
        </button>
      </form>

      <div className="mt-4 text-center text-sm">
        <Link href="/pages/register" className="link link-primary">
          Még nincs fiókom
        </Link>
      </div>
    </>
  );
}
