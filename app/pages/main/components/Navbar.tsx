"use client"
import React, { useEffect, useState } from 'react'
import Link from 'next/link'

type User = {
  id: number
  username: string
}

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) return

    fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user) setUser(data.user)
      })
      .catch(() => {})
  }, [])

  async function handleLogout() {
    const token = localStorage.getItem('token')
    if (token) {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {})
    }
    localStorage.removeItem('token')
    setUser(null)
  }

  return (
    <nav style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12px 24px',
      background: '#fff',
      borderBottom: '1px solid #eee',
    }}>
      <Link href="/pages/main" style={{ textDecoration: 'none', color: '#0b63ff', fontSize: 22, fontWeight: 700 }}>
        🍴 ForkFeed
      </Link>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {user ? (
          <>
            <span style={{ fontSize: 14, color: '#333' }}>Szia, <strong>{user.username}</strong>!</span>
            <button
              onClick={handleLogout}
              style={{
                padding: '6px 14px',
                background: 'transparent',
                border: '1px solid #ddd',
                borderRadius: 6,
                cursor: 'pointer',
                fontSize: 14,
              }}
            >
              Kijelentkezés
            </button>
          </>
        ) : (
          <>
            <Link href="/pages/loginandregistration/login" style={{
              padding: '6px 14px',
              background: '#0b63ff',
              color: '#fff',
              borderRadius: 6,
              textDecoration: 'none',
              fontSize: 14,
            }}>
              Bejelentkezés
            </Link>
            <Link href="/pages/loginandregistration/registration" style={{
              padding: '6px 14px',
              background: 'transparent',
              border: '1px solid #0b63ff',
              color: '#0b63ff',
              borderRadius: 6,
              textDecoration: 'none',
              fontSize: 14,
            }}>
              Regisztráció
            </Link>
          </>
        )}
      </div>
    </nav>
  )
}
