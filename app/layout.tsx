import React from 'react'

export const metadata = {
  title: 'ForkFeed',
  description: 'Receptmegosztó közösség',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="hu">
      <body style={{ margin: 0, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
        {children}
      </body>
    </html>
  )
}
