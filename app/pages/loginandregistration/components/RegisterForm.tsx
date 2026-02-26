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
      router.push('/pages/loginandregistration/login')
    } catch (err) {
      setError('Hálózati hiba')
      setLoading(false)
    }
  }

  return (
    <>
      <h2 style={{ margin: 0, marginBottom: 8 }}>Regisztráció</h2>
      <p style={{ marginTop: 0, marginBottom: 18, color: '#666' }}>Hozz létre egy fiókot</p>
      <form onSubmit={onSubmit}>
        <Input label="Felhasználónév" name="username" value={username} onChange={setUsername} />
        <Input label="Email" name="email" value={email} onChange={setEmail} type="email" />
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
          {loading ? 'Feldolgozás...' : 'Regisztráció'}
        </button>
      </form>

      <div style={{ marginTop: 14, textAlign: 'center' }}>
        <Link href="/pages/loginandregistration/login">Már van fiókom</Link>
      </div>
    </>
  )
}
