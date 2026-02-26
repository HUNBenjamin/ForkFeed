import React from 'react'

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

const difficultyLabels: Record<string, string> = {
  easy: 'Könnyű',
  medium: 'Közepes',
  hard: 'Nehéz',
}

const difficultyColors: Record<string, string> = {
  easy: '#22c55e',
  medium: '#f59e0b',
  hard: '#ef4444',
}

export default function RecipeCard({ recipe }: { recipe: Recipe }) {
  return (
    <div style={{
      background: '#fff',
      borderRadius: 10,
      boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      transition: 'box-shadow 0.2s',
    }}>
      {/* Color strip based on difficulty */}
      <div style={{
        height: 6,
        background: difficultyColors[recipe.difficulty] ?? '#ccc',
      }} />

      <div style={{ padding: 18, flex: 1, display: 'flex', flexDirection: 'column' }}>
        <h3 style={{ margin: 0, marginBottom: 6, fontSize: 17 }}>{recipe.title}</h3>

        {recipe.description && (
          <p style={{
            margin: 0,
            marginBottom: 12,
            color: '#666',
            fontSize: 13,
            lineHeight: 1.4,
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          }}>
            {recipe.description}
          </p>
        )}

        <div style={{ marginTop: 'auto', display: 'flex', flexWrap: 'wrap', gap: 8, fontSize: 13 }}>
          <span style={{
            padding: '2px 8px',
            borderRadius: 4,
            background: difficultyColors[recipe.difficulty] + '20',
            color: difficultyColors[recipe.difficulty],
            fontWeight: 600,
          }}>
            {difficultyLabels[recipe.difficulty] ?? recipe.difficulty}
          </span>

          <span style={{ color: '#888' }}>
            ⏱ {recipe.preparation_time} perc
          </span>

          {recipe.rating_count > 0 && (
            <span style={{ color: '#f59e0b' }}>
              ⭐ {recipe.average_rating.toFixed(1)} ({recipe.rating_count})
            </span>
          )}
        </div>

        <div style={{ marginTop: 10, fontSize: 12, color: '#999' }}>
          {recipe.author.username}
        </div>
      </div>
    </div>
  )
}
