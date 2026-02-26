"use client"
import React from 'react'

type Props = {
  label: string
  name: string
  type?: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
}

export default function Input({ label, name, type = 'text', value, onChange, placeholder }: Props) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label htmlFor={name} style={{ display: 'block', fontSize: 14, marginBottom: 6 }}>{label}</label>
      <input
        id={name}
        name={name}
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: '100%',
          padding: '8px 10px',
          borderRadius: 6,
          border: '1px solid #ddd',
          fontSize: 14,
        }}
      />
    </div>
  )
}
