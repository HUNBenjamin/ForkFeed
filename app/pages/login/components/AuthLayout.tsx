"use client"
import type { ReactNode } from 'react'

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-base-200 p-5">
      <div className="card w-full max-w-md bg-base-100 shadow-xl">
        <div className="card-body">
          {children}
        </div>
      </div>
    </div>
  )
}
