import React from 'react'
import Navbar from './components/Navbar'
import RecipeList from './components/RecipeList'

export default function Page() {
  return (
    <div style={{ minHeight: '100vh', background: '#f7f7fb' }}>
      <Navbar />

      {/* Hero */}
      <div style={{
        textAlign: 'center',
        padding: '48px 20px 32px',
      }}>
        <h1 style={{ margin: 0, fontSize: 32, fontWeight: 700 }}>
          🍴 ForkFeed
        </h1>
        <p style={{ margin: '8px 0 0', color: '#666', fontSize: 16 }}>
          Fedezd fel a közösség legjobb receptjeit
        </p>
      </div>

      {/* Recipe listing */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 20px 48px' }}>
        <RecipeList />
      </div>
    </div>
  )
}
