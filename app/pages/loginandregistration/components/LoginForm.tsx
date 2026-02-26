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
      <h2 style={{ margin: 0, marginBottom: 8 }}>Bejelentkezés</h2>
      <p style={{ marginTop: 0, marginBottom: 18, color: '#666' }}>Lépj be a fiókodba</p>
      <form onSubmit={onSubmit}>
        <Input label="Email vagy felhasználónév" name="login" value={login} onChange={setLogin} placeholder="email@pelda.hu" />
        <Input label="Jelszó" name="password" value={password} onChange={setPassword} type="password" />
        {error && <div style={{ color: 'crimson', marginBottom: 8 }}>{error}</div>}
        <button type="submit" disabled={loading} style={{
          width: '100%',
          padding: '10px 12px',
          background: '#0b63ff',
          color: '#fff',
          border: 'none',
          borderRadius: 6,
          fontSize: 15,
          cursor: 'pointer'
        }}>
          {loading ? 'Feldolgozás...' : 'Bejelentkezés'}
        </button>
      </form>

      <div style={{ marginTop: 14, textAlign: 'center' }}>
        <Link href="/pages/loginandregistration/registration">Még nincs fiókom</Link>
      </div>
    </>
  )
}
