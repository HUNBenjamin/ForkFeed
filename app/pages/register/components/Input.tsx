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
    <div className="form-control mb-3">
      <label htmlFor={name} className="label">
        <span className="label-text">{label}</span>
      </label>
      <input
        id={name}
        name={name}
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="input input-bordered w-full"
      />
    </div>
  )
}
