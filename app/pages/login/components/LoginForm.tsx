"use client"
import React, { useState } from 'react'
import Input from './Input'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function LoginForm() {
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login, password }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data?.error || 'Bejelentkezés sikertelen')
        setLoading(false)
        return
      }
      if (data?.token) {
        localStorage.setItem('token', data.token)
      }
      router.push('/pages/main')
    } catch (err) {
      setError('Hálózati hiba')
      setLoading(false)
    }
  }

  return (
    <>
      <h2 className="card-title text-2xl mb-1">Bejelentkezés</h2>
      <p className="text-base-content/60 mb-4">Lépj be a fiókodba</p>
      <form onSubmit={onSubmit}>
        <Input label="Email vagy felhasználónév" name="login" value={login} onChange={setLogin} placeholder="email@pelda.hu" />
        <Input label="Jelszó" name="password" value={password} onChange={setPassword} type="password" />
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
