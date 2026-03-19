"use client"
import { useState, type FormEvent } from 'react'
import Input from './Input'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

const errorTranslations: Record<string, string> = {
  'Invalid JSON payload.': 'Érvénytelen kérés formátum. Kérjük, próbáld újra.',
  'Login identifier and password are required.': 'Az email cím/felhasználónév és a jelszó megadása kötelező.',
  'Invalid credentials.': 'Hibás email cím/felhasználónév vagy jelszó.',
  'Account is deactivated.': 'Ez a fiók deaktiválva lett. Kérjük, vedd fel a kapcsolatot az ügyfélszolgálattal.',
}

function translateError(msg: string): string {
  return errorTranslations[msg] ?? msg
}

export default function LoginForm() {
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<{ login?: string; password?: string }>({})
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  function validate(): boolean {
    const errors: { login?: string; password?: string } = {}
    if (!login.trim()) {
      errors.login = 'Add meg az email címed vagy felhasználóneved'
    }
    if (!password) {
      errors.password = 'Add meg a jelszavad'
    }
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    if (!validate()) return
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login, password }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(translateError(data?.error || 'A bejelentkezés sikertelen. Kérjük, próbáld újra.'))
        setLoading(false)
        return
      }
      if (data?.token) {
        localStorage.setItem('token', data.token)
      }
      router.push('/pages/main')
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
      <h2 className="card-title text-2xl mb-1">Bejelentkezés</h2>
      <p className="text-base-content/60 mb-4">Lépj be a fiókodba</p>
      <form onSubmit={onSubmit} noValidate>
        <Input label="Email vagy felhasználónév" name="login" value={login} onChange={(v) => { setLogin(v); setFieldErrors((p) => ({ ...p, login: undefined })) }} placeholder="email@pelda.hu" error={fieldErrors.login} />
        <Input label="Jelszó" name="password" value={password} onChange={(v) => { setPassword(v); setFieldErrors((p) => ({ ...p, password: undefined })) }} type="password" error={fieldErrors.password} />
        {error && (
          <div className="alert alert-error mb-3 py-2 text-sm">
            <span>{error}</span>
          </div>
        )}
        <button type="submit" disabled={loading} className="btn btn-primary w-full mt-1">
          {loading ? <span className="loading loading-spinner loading-sm" /> : 'Bejelentkezés'}
        </button>
      </form>

      <div className="mt-4 text-center text-sm">
        <Link href="/pages/register" className="link link-primary">Még nincs fiókom</Link>
      </div>
    </>
  )
}
