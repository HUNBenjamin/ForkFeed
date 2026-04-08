# 🍴 ForkFeed

**ForkFeed** is a full-stack recipe-sharing community platform built as a _Szakvizsgaremek_ (senior thesis project). Users can discover, create, rate, and organize recipes — while admins moderate content through a built-in reporting system.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Available Scripts](#available-scripts)
- [Database](#database)
- [API Overview](#api-overview)
- [Backend Documentation](#backend-documentation)
- [Frontend Documentation](#frontend-documentation)
- [Admin Panel Documentation](#admin-panel-documentation)

---

## Features

### For Users
- **Authentication** — Register, log in, log out, change password, and reset forgotten passwords via email
- **Recipe Management** — Create, edit, and delete your own recipes with ingredients, steps, categories, and tags
- **Image Uploads** — Upload recipe and avatar images (stored on Cloudinary with automatic resizing)
- **Ratings & Comments** — Rate recipes (1–5 stars) and leave comments
- **Favorites** — Save recipes to your personal favorites list
- **Recipe Books** — Organize recipes into custom collections (public or private), clone other users' public books
- **Search & Discovery** — Browse recipes with filtering (difficulty, category), sorting (rating, date, prep time), and autocomplete suggestions
- **User Profiles** — View profiles, stats, recipes, and activity of any user
- **Account Management** — Update profile info (username, bio, avatar), deactivate account

### For Admins
- **User Management** — List, filter, activate/deactivate users, promote/demote roles
- **Report System** — Review user-submitted reports on recipes/comments, take action (delete content, warn users)
- **Content Moderation** — Hard-delete comments, manage categories and tags

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | [Next.js 16](https://nextjs.org/) (App Router) |
| **Language** | [TypeScript 5](https://www.typescriptlang.org/) |
| **Database** | [MongoDB](https://www.mongodb.com/) |
| **ORM** | [Prisma 6](https://www.prisma.io/) |
| **Styling** | [Tailwind CSS 4](https://tailwindcss.com/) + [DaisyUI 5](https://daisyui.com/) |
| **Image Storage** | [Cloudinary](https://cloudinary.com/) |
| **Auth** | JWT (jsonwebtoken) with token denylist |
| **Email** | [Nodemailer](https://nodemailer.com/) (SMTP) |
| **Linting** | ESLint 9 + typescript-eslint |
| **Formatting** | Prettier 3 |

---

## Project Structure

```
ForkFeed/
├── app/
│   ├── layout.tsx              # Root layout (HTML shell, lang="hu")
│   ├── page.tsx                # Root page → redirects to /pages/main
│   ├── globals.css             # Global Tailwind styles
│   ├── api/                    # ← REST API (Next.js Route Handlers)
│   │   ├── auth/               #   Authentication endpoints
│   │   ├── recipes/            #   Recipe CRUD + sub-resources
│   │   ├── categories/         #   Category management
│   │   ├── tags/               #   Tag management
│   │   ├── comments/           #   Comment editing/deletion
│   │   ├── users/              #   Public profiles + authenticated user
│   │   ├── recipe-books/       #   Recipe book collections
│   │   ├── reports/            #   User reports
│   │   ├── admin/              #   Admin-only moderation
│   │   ├── uploads/            #   Image upload
│   │   ├── search/             #   Autocomplete suggestions
│   │   ├── meta/               #   Enum values (difficulties, roles)
│   │   └── health/             #   Health check
│   ├── pages/                  # ← Frontend pages
│   │   ├── main/               #   Home / recipe feed
│   │   ├── login/              #   Login page
│   │   ├── register/           #   Registration page
│   │   ├── reset-password/     #   Password reset page
│   │   ├── recipe/             #   Recipe detail + create new
│   │   ├── profile/            #   Authenticated user's profile
│   │   └── user/               #   Public user profile
│   ├── components/             # Shared UI components
│   └── prisma/                 # Generated Prisma client (auto-generated)
├── lib/
│   ├── auth.ts                 # JWT sign/verify, token denylist, auth helpers
│   ├── prisma.ts               # Singleton Prisma client
│   └── cloudinary.ts           # Cloudinary upload/delete helpers
├── prisma/
│   └── schema.prisma           # Database schema definition
├── data/                       # Seed data (JSON) + test files
├── dataPlans/                  # Sample data plans
├── documentation/              # Detailed backend documentation
├── package.json
├── next.config.ts
├── tsconfig.json
├── eslint.config.mjs
├── prettier.config.cjs
└── postcss.config.mjs
```

---

## Getting Started

### Prerequisites

- **Node.js** ≥ 18
- **MongoDB** instance (local or cloud — e.g. MongoDB Atlas)
- **Cloudinary** account (for image uploads)
- _(Optional)_ SMTP credentials for password reset emails

### Installation

```bash
# 1. Clone the repository
git clone <repository-url>
cd ForkFeed

# 2. Install dependencies
npm install

# 3. Copy and configure environment variables
#    (see Environment Variables section below)

# 4. Generate Prisma client
npx prisma generate

# 5. Start the development server
npm run dev
```

The app will be available at **http://localhost:8080**.

---

## Environment Variables

Create a `.env` file in the project root:

```env
# Database
DATABASE_URL="mongodb+srv://<user>:<password>@<cluster>/<database>?retryWrites=true&w=majority"

# JWT
JWT_SECRET="your-secret-key-here"

# Cloudinary
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"

# SMTP (for password reset emails)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
SMTP_FROM="\"ForkFeed\" <your-email@gmail.com>"

# App URL (used in password reset emails)
NEXT_PUBLIC_APP_URL="http://localhost:8080"
```

---

## Available Scripts

| Script | Command | Description |
|--------|---------|-------------|
| **dev** | `npm run dev` | Start dev server on port 8080 |
| **build** | `npm run build` | Generate Prisma client + build for production |
| **start** | `npm start` | Start production server |
| **lint** | `npm run lint` | Run ESLint |
| **format** | `npm run format` | Check formatting with Prettier |
| **format:fix** | `npm run format:fix` | Auto-fix formatting |
| **postinstall** | _(automatic)_ | Generates Prisma client after `npm install` |

---

## Database

ForkFeed uses **MongoDB** with **Prisma ORM**. The schema defines 14 models:

| Model | Description |
|-------|-------------|
| `User` | User accounts with roles (user/admin) |
| `Recipe` | Recipes with soft-delete support |
| `Ingredient` | Recipe ingredients (name, quantity, unit) |
| `Step` | Ordered preparation steps |
| `Category` | Recipe categories |
| `Tag` | Recipe tags |
| `RecipeCategory` | Many-to-many: Recipe ↔ Category |
| `RecipeTag` | Many-to-many: Recipe ↔ Tag |
| `RecipeBook` | User-created recipe collections |
| `RecipeBookRecipe` | Many-to-many: RecipeBook ↔ Recipe |
| `Comment` | Recipe comments with soft-delete |
| `Rating` | User ratings (1–5, one per user per recipe) |
| `Favorite` | User favorites (one per user per recipe) |
| `Report` | Content reports (recipe/comment) |
| `PasswordResetToken` | Time-limited password reset tokens |
| `DenylistedToken` | Invalidated JWT tokens |

---

## API Overview

The backend exposes **54 API endpoints** organized as Next.js Route Handlers under `/app/api/`. All endpoints return JSON.

| Domain | Base Path | Endpoints |
|--------|-----------|-----------|
| Authentication | `/api/auth/*` | Login, register, logout, me, change/reset password |
| Recipes | `/api/recipes/*` | Full CRUD + ratings, comments, steps, ingredients, favorites, image, categories, tags |
| Categories | `/api/categories/*` | List, create, update, delete |
| Tags | `/api/tags/*` | List, create, update, delete |
| Comments | `/api/comments/*` | Edit, delete |
| Users | `/api/users/*` | Public profiles, stats, activity |
| Current User | `/api/users/me/*` | Profile, stats, favorites, deactivation |
| Recipe Books | `/api/recipe-books/*` | CRUD, clone, manage recipes |
| Reports | `/api/reports/*` | Create and list own reports |
| Admin | `/api/admin/*` | User management, report review, content moderation |
| Uploads | `/api/uploads` | Image upload to Cloudinary |
| Search | `/api/search/*` | Autocomplete suggestions |
| Meta | `/api/meta/*` | Difficulty levels, user roles |
| Health | `/api/health` | Database health check |

> **For the complete API reference with request/response details, see [documentation/BACKEND.md](documentation/BACKEND.md).**

---

## Backend Documentation

The full backend documentation — including every endpoint's method, URL, request body, query parameters, response format, authentication requirements, and error codes — is available in:

📄 **[documentation/BACKEND.md](documentation/BACKEND.md)**

---

## Frontend Documentation

The full frontend documentation — covering page structure, components, navigation, theming, authentication flow, image upload system, comment system, recipe books, and responsive design — is available in:

📄 **[documentation/FRONTEND.md](documentation/FRONTEND.md)**

---

## Admin Panel Documentation

The admin panel documentation — covering the dashboard, report management, user management, moderation workflows, self-protection mechanisms, and all admin API endpoints — is available in:

📄 **[documentation/ADMIN.md](documentation/ADMIN.md)**
