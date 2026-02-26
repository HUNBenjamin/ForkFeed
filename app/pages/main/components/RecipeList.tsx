"use client"
import React, { useEffect, useState } from 'react'
import RecipeCard from './RecipeCard'

type Recipe = {
  id: number
  title: string
  description: string | null
  preparation_time: number
  difficulty: string
  average_rating: number
  rating_count: number
  author: {
    id: number
    username: string
    profile_image_url: string | null
  }
}

type Pagination = {
  page: number
  limit: number
  total: number
  total_pages: number
}

export default function RecipeList() {
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [query, setQuery] = useState('')
  const [difficulty, setDifficulty] = useState('')
  const [sort, setSort] = useState('created_at')

  useEffect(() => {
    setLoading(true)
    setError(null)

    const params = new URLSearchParams({
      page: String(page),
      limit: '12',
      sort,
      order: 'desc',
    })
    if (query) params.set('query', query)
    if (difficulty) params.set('difficulty', difficulty)

    fetch(`/api/recipes?${params}`)
      .then((res) => {
        if (!res.ok) throw new Error('Nem sikerült betölteni a recepteket')
        return res.json()
      })
      .then((data) => {
        setRecipes(data.recipes)
        setPagination(data.pagination)
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [page, query, difficulty, sort])

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setPage(1)
  }

  return (
    <div>
      {/* Filters */}
      <form onSubmit={handleSearch} style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 10,
        marginBottom: 24,
        alignItems: 'center',
      }}>
        <input
          type="text"
          placeholder="Keresés receptek között..."
          value={query}
          onChange={(e) => { setQuery(e.target.value); setPage(1) }}
          style={{
            flex: 1,
            minWidth: 200,
            padding: '8px 12px',
            borderRadius: 6,
            border: '1px solid #ddd',
            fontSize: 14,
          }}
        />

        <select
          value={difficulty}
          onChange={(e) => { setDifficulty(e.target.value); setPage(1) }}
          style={{
            padding: '8px 12px',
            borderRadius: 6,
            border: '1px solid #ddd',
            fontSize: 14,
          }}
        >
          <option value="">Minden nehézség</option>
          <option value="easy">Könnyű</option>
          <option value="medium">Közepes</option>
          <option value="hard">Nehéz</option>
        </select>

        <select
          value={sort}
          onChange={(e) => { setSort(e.target.value); setPage(1) }}
          style={{
            padding: '8px 12px',
            borderRadius: 6,
            border: '1px solid #ddd',
            fontSize: 14,
          }}
        >
          <option value="created_at">Legújabb</option>
          <option value="average_rating">Legjobb értékelés</option>
          <option value="preparation_time">Elkészítési idő</option>
        </select>
      </form>

      {/* Content */}
      {loading && <p style={{ textAlign: 'center', color: '#888' }}>Betöltés...</p>}

      {error && <p style={{ textAlign: 'center', color: 'crimson' }}>{error}</p>}

      {!loading && !error && recipes.length === 0 && (
        <p style={{ textAlign: 'center', color: '#888' }}>Nem található recept.</p>
      )}

      {!loading && !error && recipes.length > 0 && (
        <>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 20,
          }}>
            {recipes.map((recipe) => (
              <RecipeCard key={recipe.id} recipe={recipe} />
            ))}
          </div>

          {/* Pagination */}
          {pagination && pagination.total_pages > 1 && (
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 12,
              marginTop: 32,
            }}>
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 6,
                  border: '1px solid #ddd',
                  background: page <= 1 ? '#f5f5f5' : '#fff',
                  cursor: page <= 1 ? 'default' : 'pointer',
                  fontSize: 14,
                }}
              >
                ← Előző
              </button>
              <span style={{ fontSize: 14, color: '#666' }}>
                {page} / {pagination.total_pages}
              </span>
              <button
                disabled={page >= pagination.total_pages}
                onClick={() => setPage((p) => p + 1)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 6,
                  border: '1px solid #ddd',
                  background: page >= pagination.total_pages ? '#f5f5f5' : '#fff',
                  cursor: page >= pagination.total_pages ? 'default' : 'pointer',
                  fontSize: 14,
                }}
              >
                Következő →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
