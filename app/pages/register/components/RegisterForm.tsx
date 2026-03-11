"use client"
import React, { useState } from 'react'
import Input from './Input'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function RegisterForm() {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data?.error || 'Regisztráció sikertelen')
        setLoading(false)
        return
      }
      router.push('/pages/login')
    } catch (err) {
      setError('Hálózati hiba')
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
      <form onSubmit={onSubmit}>
        <Input label="Felhasználónév" name="username" value={username} onChange={setUsername} />
        <Input label="Email" name="email" value={email} onChange={setEmail} type="email" />
        <Input label="Jelszó" name="password" value={password} onChange={setPassword} type="password" />
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
