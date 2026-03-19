"use client"
import React, { useState } from 'react'
import Input from './Input'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

const errorTranslations: Record<string, string> = {
  'Invalid JSON payload.': 'Érvénytelen kérés formátum. Kérjük, próbáld újra.',
  'Username, email and password are required.': 'A felhasználónév, email cím és jelszó megadása kötelező.',
  'Password must be at least 8 characters.': 'A jelszónak legalább 8 karakter hosszúnak kell lennie.',
  'Username or email already in use.': 'Ez a felhasználónév vagy email cím már foglalt. Kérjük, válassz másikat.',
}

function translateError(msg: string): string {
  return errorTranslations[msg] ?? msg
}

export default function RegisterForm() {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<{ username?: string; email?: string; password?: string }>({})
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  function validate(): boolean {
    const errors: { username?: string; email?: string; password?: string } = {}
    if (!username.trim()) {
      errors.username = 'Add meg a felhasználóneved'
    } else if (username.trim().length < 3) {
      errors.username = 'A felhasználónév legalább 3 karakter hosszú legyen'
    }
    if (!email.trim()) {
      errors.email = 'Add meg az email címed'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = 'Adj meg egy érvényes email címet (pl. nev@pelda.hu)'
    }
    if (!password) {
      errors.password = 'Add meg a jelszavad'
    } else if (password.length < 8) {
      errors.password = 'A jelszónak legalább 8 karakter hosszúnak kell lennie'
    }
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!validate()) return
    setLoading(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(translateError(data?.error || 'A regisztráció sikertelen. Kérjük, próbáld újra.'))
        setLoading(false)
        return
      }
      router.push('/pages/login')
    } catch (err) {
      setError('Nem sikerült csatlakozni a szerverhez. Ellenőrizd az internetkapcsolatod.')
      setLoading(false)
    }
  }

  return (
    <>
      <Link href="/pages/main" className="btn btn-ghost btn-sm mb-4 -ml-2 text-base-content/60">
        ← Vissza a főoldalra
      </Link>
      <h2 className="card-title text-2xl mb-1">Regisztráció</h2>
      <p className="text-base-content/60 mb-4">Hozz létre egy fiókot</p>
      <form onSubmit={onSubmit} noValidate>
        <Input label="Felhasználónév" name="username" value={username} onChange={(v) => { setUsername(v); setFieldErrors((p) => ({ ...p, username: undefined })) }} error={fieldErrors.username} />
        <Input label="Email" name="email" value={email} onChange={(v) => { setEmail(v); setFieldErrors((p) => ({ ...p, email: undefined })) }} type="email" error={fieldErrors.email} />
        <Input label="Jelszó" name="password" value={password} onChange={(v) => { setPassword(v); setFieldErrors((p) => ({ ...p, password: undefined })) }} type="password" error={fieldErrors.password} />
        {error && (
          <div className="alert alert-error mb-3 py-2 text-sm">
            <span>{error}</span>
          </div>
        )}
        <button type="submit" disabled={loading} className="btn btn-primary w-full mt-1">
          {loading ? <span className="loading loading-spinner loading-sm" /> : 'Regisztráció'}
        </button>
      </form>

      <div className="mt-4 text-center text-sm">
        <Link href="/pages/login" className="link link-primary">Már van fiókom</Link>
      </div>
    </>
  )
}
