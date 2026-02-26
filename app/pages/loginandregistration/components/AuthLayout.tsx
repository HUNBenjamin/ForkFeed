"use client"
import React from 'react'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#f7f7fb',
      padding: 20
    }}>
      <div style={{
        width: 420,
        background: '#fff',
        padding: 28,
        borderRadius: 8,
        boxShadow: '0 6px 18px rgba(0,0,0,0.06)'
      }}>
        {children}
      </div>
    </div>
  )
}
