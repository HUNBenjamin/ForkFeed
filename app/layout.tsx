import React from 'react'
import './globals.css'

export const metadata = {
  title: 'ForkFeed',
  description: 'Receptmegosztó közösség',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="hu" data-theme="light">
      <body>
        {children}
      </body>
    </html>
  )
}
