# ForkFeed — Backend Documentation

This document provides a comprehensive reference for the ForkFeed REST API backend, covering architecture, authentication, database schema, every API endpoint, error handling, and utility libraries.

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Technology Stack](#technology-stack)
- [Authentication & Authorization](#authentication--authorization)
- [Database Schema](#database-schema)
- [Utility Libraries](#utility-libraries)
- [API Endpoints](#api-endpoints)
  - [Health](#health)
  - [Authentication](#authentication)
  - [Recipes](#recipes)
  - [Recipe Sub-Resources](#recipe-sub-resources)
  - [Categories](#categories)
  - [Tags](#tags)
  - [Comments](#comments)
  - [Users (Public)](#users-public)
  - [Users (Authenticated — /me)](#users-authenticated--me)
  - [Recipe Books](#recipe-books)
  - [Reports](#reports)
  - [Admin](#admin)
  - [Uploads](#uploads)
  - [Search](#search)
  - [Meta](#meta)
- [Error Handling](#error-handling)
- [Endpoint Summary Table](#endpoint-summary-table)

---

## Architecture Overview

ForkFeed's backend is built entirely with **Next.js 16 App Router** using **Route Handlers** (`route.ts` files). There is no separate backend server — all API routes live under `app/api/` and are deployed as serverless functions alongside the frontend.

### Key Design Decisions

- **Runtime**: All API routes explicitly set `export const runtime = "nodejs"` to ensure Node.js APIs (crypto, Buffer) are available (as opposed to the Edge runtime).
- **No middleware file**: Authentication is handled per-route by calling helper functions from `lib/auth.ts`. There is no global `middleware.ts`.
- **Soft deletes**: Recipes and comments use an `is_deleted` boolean flag rather than being permanently removed. Admin endpoints exist for hard deletion.
- **Sequential IDs**: User, Recipe, and other primary models use sequential integer IDs (auto-incremented by finding the max existing ID + 1) instead of MongoDB's default ObjectId. Join tables (`RecipeCategory`, `RecipeTag`, `RecipeBookRecipe`, `PasswordResetToken`, `DenylistedToken`) use auto-generated ObjectIds.
- **Pagination**: All list endpoints support `page` and `limit` query parameters (defaults: `page=1`, `limit=20`). Responses include a `pagination` object with `page`, `limit`, `total`, and `totalPages`.

### Request/Response Format

- All request bodies are **JSON** (except file uploads which use `multipart/form-data`).
- All responses are **JSON** (`application/json`).
- Successful responses return the resource or a `{ message: "..." }` confirmation.
- Error responses return `{ error: "Human-readable message." }`.

---

## Technology Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Runtime | Node.js 18+ | Server-side JavaScript execution |
| Framework | Next.js 16 (App Router) | Route handlers, SSR, static generation |
| Language | TypeScript 5 | Type safety |
| Database | MongoDB | Document database |
| ORM | Prisma 6 | Type-safe database access, schema management |
| Auth | jsonwebtoken (JWT) | Stateless authentication |
| Password Hashing | Node.js `crypto.scryptSync` | Secure password hashing with random salt |
| Image Storage | Cloudinary SDK v2 | Image upload, transformation, and CDN |
| Email | Nodemailer | SMTP email delivery (password reset) |

---

## Authentication & Authorization

### JWT-Based Authentication

ForkFeed uses **JWT (JSON Web Tokens)** for stateless authentication. Tokens are issued on login/register and must be sent in the `Authorization` header for protected endpoints.

#### Token Structure

```
Authorization: Bearer <jwt-token>
```

The JWT payload contains:

| Field | Type | Description |
|-------|------|-------------|
| `sub` | `number` | User ID |
| `username` | `string` | Username |
| `role` | `string` | `"user"` or `"admin"` |
| `jti` | `string` | Unique token identifier (UUID v4) |
| `iat` | `number` | Issued-at timestamp (Unix) |
| `exp` | `number` | Expiration timestamp (Unix) |

- **Expiration**: Tokens expire after **1 day** (`1d`).
- **Secret**: Configured via the `JWT_SECRET` environment variable.

#### Token Denylist

When a user logs out, the token's `jti` is added to the `DenylistedToken` collection in the database, effectively invalidating it before its natural expiration. Every authenticated request checks the denylist.

### Authorization Levels

The API has four authorization levels:

| Level | Description | Implementation |
|-------|-------------|----------------|
| **None** | No authentication required | No auth check |
| **Optional Auth** | Works without auth, but returns extra data if authenticated | `optionalAuth(request)` — returns `JwtPayload \| null` |
| **Authenticated** | Requires a valid, non-denylisted JWT | `authenticateRequest(request)` — returns payload or `{error, status}` |
| **Admin** | Requires authenticated user with `role: "admin"` | `requireAdmin(request)` — checks auth + role |

### Owner-or-Admin Pattern

Many write operations (update/delete) check that the requester is either the **resource owner** or an **admin**. This is implemented inline in each route handler:

```typescript
if (recipe.author_id !== auth.sub && auth.role !== "admin") {
  return NextResponse.json({ error: "Forbidden." }, { status: 403 });
}
```

### Password Hashing

Passwords are hashed using **scrypt** (Node.js built-in `crypto.scryptSync`) with:
- A **random 16-byte salt** (hex-encoded)
- **64-byte key length**
- Stored format: `scrypt$<salt>$<hash>`

Verification uses `timingSafeEqual` to prevent timing attacks.

---

## Database Schema

The database is **MongoDB**, accessed through **Prisma ORM**. The schema is defined in `prisma/schema.prisma`.

### Entity-Relationship Overview

```
User ──┬── Recipe ──┬── Ingredient
       │            ├── Step
       │            ├── Comment ←── User
       │            ├── Rating ←── User
       │            ├── Favorite ←── User
       │            ├── RecipeCategory ──── Category
       │            ├── RecipeTag ──── Tag
       │            └── RecipeBookRecipe ──── RecipeBook ←── User
       ├── Report
       ├── PasswordResetToken
       └── DenylistedToken (standalone)
```

### Models

#### User

Represents a registered user account.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `id` | `Int` | — | Primary key (sequential) |
| `username` | `String` | — | Unique username |
| `email` | `String` | — | Unique email (stored lowercase) |
| `password_hash` | `String` | — | Scrypt hash (`scrypt$salt$hash`) |
| `role` | `Role` | `user` | Enum: `user` \| `admin` |
| `profile_image_url` | `String?` | `null` | Cloudinary avatar URL |
| `bio` | `String?` | `null` | User bio text |
| `is_active` | `Boolean` | `true` | `false` = deactivated account |
| `created_at` | `DateTime` | `now()` | Account creation timestamp |
| `updated_at` | `DateTime?` | `null` | Last profile update |
| `last_login` | `DateTime?` | `null` | Last successful login |

**Relations**: recipes, comments, ratings, favorites, recipe_books, reported_reports, reviewed_reports, password_reset_tokens

#### Recipe

A user-created recipe with metadata, ingredients, and steps.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `id` | `Int` | — | Primary key (sequential) |
| `title` | `String` | — | Recipe title |
| `description` | `String?` | `null` | Recipe description |
| `image_url` | `String?` | `null` | Cloudinary image URL |
| `preparation_time` | `Int` | — | Prep time in minutes (> 0) |
| `difficulty` | `String` | — | `"easy"` \| `"medium"` \| `"hard"` |
| `average_rating` | `Float` | `0` | Cached average (recalculated on rating change) |
| `rating_count` | `Int` | `0` | Cached total ratings |
| `author_id` | `Int` | — | FK → User.id |
| `created_at` | `DateTime` | `now()` | Creation timestamp |
| `updated_at` | `DateTime?` | `null` | Last update timestamp |
| `is_deleted` | `Boolean` | `false` | Soft-delete flag |

**Relations**: author (User), ingredients, steps, comments, ratings, favorites, recipe_categories, recipe_tags, recipe_book_recipes

#### Ingredient

An ingredient belonging to a recipe.

| Field | Type | Description |
|-------|------|-------------|
| `id` | `Int` | Primary key (sequential) |
| `recipe_id` | `Int` | FK → Recipe.id |
| `name` | `String` | Ingredient name |
| `quantity` | `Float?` | Numeric quantity (optional) |
| `unit` | `String?` | Unit of measurement (optional) |

#### Step

An ordered preparation step belonging to a recipe.

| Field | Type | Description |
|-------|------|-------------|
| `id` | `Int` | Primary key (sequential) |
| `recipe_id` | `Int` | FK → Recipe.id |
| `step_number` | `Int` | Order index (1-based) |
| `description` | `String` | Step instruction text |

#### Category

A recipe classification category (e.g., "Dessert", "Soup").

| Field | Type | Description |
|-------|------|-------------|
| `id` | `Int` | Primary key (sequential) |
| `name` | `String` | Unique category name |
| `description` | `String?` | Category description |
| `created_at` | `DateTime` | Creation timestamp |

#### Tag

A lightweight label for recipes (e.g., "vegan", "gluten-free").

| Field | Type | Description |
|-------|------|-------------|
| `id` | `Int` | Primary key (sequential) |
| `name` | `String` | Unique tag name |
| `created_at` | `DateTime` | Creation timestamp |

#### RecipeCategory (Join Table)

Many-to-many link between Recipe and Category.

| Field | Type | Description |
|-------|------|-------------|
| `id` | `ObjectId` | Auto-generated |
| `recipe_id` | `Int` | FK → Recipe.id |
| `category_id` | `Int` | FK → Category.id |

**Unique constraint**: `(recipe_id, category_id)`

#### RecipeTag (Join Table)

Many-to-many link between Recipe and Tag.

| Field | Type | Description |
|-------|------|-------------|
| `id` | `ObjectId` | Auto-generated |
| `recipe_id` | `Int` | FK → Recipe.id |
| `tag_id` | `Int` | FK → Tag.id |

**Unique constraint**: `(recipe_id, tag_id)`

#### Comment

A user comment on a recipe.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `id` | `Int` | — | Primary key (sequential) |
| `recipe_id` | `Int` | — | FK → Recipe.id |
| `user_id` | `Int` | — | FK → User.id |
| `content` | `String` | — | Comment text |
| `created_at` | `DateTime` | `now()` | Creation timestamp |
| `updated_at` | `DateTime?` | `null` | Last edit timestamp |
| `is_deleted` | `Boolean` | `false` | Soft-delete flag |

#### Rating

A user's star rating (1–5) for a recipe. One rating per user per recipe.

| Field | Type | Description |
|-------|------|-------------|
| `id` | `Int` | Primary key (sequential) |
| `recipe_id` | `Int` | FK → Recipe.id |
| `user_id` | `Int` | FK → User.id |
| `rating` | `Int` | 1–5 |
| `created_at` | `DateTime` | Creation timestamp |

**Unique constraint**: `(recipe_id, user_id)`

#### Favorite

A user's bookmark of a recipe.

| Field | Type | Description |
|-------|------|-------------|
| `id` | `Int` | Primary key (sequential) |
| `user_id` | `Int` | FK → User.id |
| `recipe_id` | `Int` | FK → Recipe.id |
| `created_at` | `DateTime` | Creation timestamp |

**Unique constraint**: `(user_id, recipe_id)`

#### RecipeBook

A user-created collection of recipes.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `id` | `Int` | — | Primary key (sequential) |
| `name` | `String` | — | Book title |
| `description` | `String?` | `null` | Book description |
| `owner_id` | `Int` | — | FK → User.id |
| `is_public` | `Boolean` | `false` | Public visibility |
| `created_at` | `DateTime` | `now()` | Creation timestamp |
| `updated_at` | `DateTime?` | `null` | Last update |

#### RecipeBookRecipe (Join Table)

Many-to-many link between RecipeBook and Recipe.

| Field | Type | Description |
|-------|------|-------------|
| `id` | `ObjectId` | Auto-generated |
| `recipe_book_id` | `Int` | FK → RecipeBook.id |
| `recipe_id` | `Int` | FK → Recipe.id |

**Unique constraint**: `(recipe_book_id, recipe_id)`

#### Report

A report filed by a user against a recipe or comment.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `id` | `Int` | — | Primary key (sequential) |
| `reported_by` | `Int` | — | FK → User.id (reporter) |
| `target_type` | `String` | — | `"recipe"` \| `"comment"` |
| `target_id` | `Int` | — | ID of the reported recipe/comment |
| `reason` | `String` | — | Report reason text |
| `status` | `String` | `"pending"` | `"pending"` \| `"accepted"` \| `"rejected"` |
| `reviewed_by` | `Int?` | `null` | FK → User.id (reviewing admin) |
| `created_at` | `DateTime` | `now()` | Creation timestamp |
| `reviewed_at` | `DateTime?` | `null` | Review timestamp |

#### PasswordResetToken

Time-limited token for the password reset flow.

| Field | Type | Description |
|-------|------|-------------|
| `id` | `ObjectId` | Auto-generated |
| `user_id` | `Int` | FK → User.id |
| `token` | `String` | Unique 32-byte random hex token |
| `expires_at` | `DateTime` | Token expiration (1 hour after creation) |
| `used_at` | `DateTime?` | When the token was consumed |
| `created_at` | `DateTime` | Creation timestamp |

#### DenylistedToken

Stores invalidated JWT token identifiers (from logout).

| Field | Type | Description |
|-------|------|-------------|
| `id` | `ObjectId` | Auto-generated |
| `jti` | `String` | Unique JWT ID (from the token's `jti` claim) |
| `expires_at` | `DateTime` | When the original token would have expired |
| `created_at` | `DateTime` | When it was denylisted |

---

## Utility Libraries

### `lib/auth.ts` — Authentication Helpers

This module centralizes all JWT and authentication logic.

| Function | Signature | Description |
|----------|-----------|-------------|
| `signToken` | `(user: {id, username, role}) → string` | Creates a signed JWT with `sub`, `username`, `role`, `jti` (random UUID). Expires in 1 day. |
| `verifyToken` | `(token: string) → JwtPayload \| null` | Verifies and decodes a JWT. Returns `null` on any error (expired, invalid signature, etc.). |
| `isTokenDenylisted` | `(jti: string) → Promise<boolean>` | Checks if a JTI exists in the `DenylistedToken` collection. |
| `denylistToken` | `(jti: string, expiresAt: Date) → Promise<void>` | Adds a JTI to the denylist with its original expiry. |
| `extractBearerToken` | `(authHeader: string \| null) → string \| null` | Extracts the token string from a `"Bearer <token>"` header. Returns `null` if missing/malformed. |
| `authenticateRequest` | `(request: Request) → Promise<JwtPayload \| {error, status}>` | Full authentication pipeline: extract token → verify → check denylist. Returns the payload on success or an error object. |
| `requireAdmin` | `(request: Request) → Promise<JwtPayload \| {error, status}>` | Same as `authenticateRequest` but additionally checks `role === "admin"`. Returns 403 if not admin. |
| `optionalAuth` | `(request: Request) → Promise<JwtPayload \| null>` | Attempts auth but returns `null` instead of an error if no token / invalid token. Used for endpoints that behave differently for logged-in users. |

### `lib/prisma.ts` — Database Client Singleton

Creates a single `PrismaClient` instance and attaches it to the Node.js `global` object to prevent multiple instances during development hot-reloading. In production, a fresh client is used.

```typescript
const globalForPrisma = global as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
export default prisma;
```

### `lib/cloudinary.ts` — Image Upload/Delete

Manages image interactions with Cloudinary CDN.

| Function | Signature | Description |
|----------|-----------|-------------|
| `uploadToCloudinary` | `(buffer: Buffer, folder: UploadFolder) → Promise<{url, public_id}>` | Uploads an image buffer to Cloudinary. Applies automatic transformations based on folder type. |
| `deleteFromCloudinary` | `(publicIdOrUrl: string) → Promise<void>` | Deletes an image from Cloudinary. Accepts a public_id or full URL (extracts public_id automatically). Fails silently if the image doesn't exist. |

**Upload Folders & Transformations**:

| Folder | Resize | Crop |
|--------|--------|------|
| `forkfeed/avatars` | 256×256 | `fill` with `gravity: "face"` |
| `forkfeed/recipes` | 1200×800 | `limit` (no upscaling) |

Both apply `quality: "auto"` and `fetch_format: "auto"` for optimal delivery.

---

## API Endpoints

### Health

#### `GET /api/health`

Health check endpoint that verifies database connectivity.

- **Auth**: None
- **Response (200)**:
  ```json
  { "status": "ok", "db": "ok", "timestamp": "2026-01-01T00:00:00.000Z" }
  ```
- **Response (503)**:
  ```json
  { "status": "error", "db": "unavailable", "message": "...", "timestamp": "..." }
  ```

---

### Authentication

#### `POST /api/auth/register`

Registers a new user account.

- **Auth**: None
- **Request Body**:
  ```json
  {
    "username": "john_doe",
    "email": "john@example.com",
    "password": "securepassword123"
  }
  ```
- **Validation**:
  - All three fields are required
  - Password must be ≥ 8 characters
  - Username and email must be unique (case-insensitive email check)
- **Response (201)**:
  ```json
  {
    "token": "eyJhbGci...",
    "user": {
      "id": 1,
      "username": "john_doe",
      "email": "john@example.com",
      "role": "user",
      "created_at": "2026-01-01T00:00:00.000Z"
    }
  }
  ```
- **Errors**: `400` (missing/invalid fields), `409` (duplicate username/email)

---

#### `POST /api/auth/login`

Authenticates a user and returns a JWT token.

- **Auth**: None
- **Request Body**:
  ```json
  {
    "login": "john_doe",
    "password": "securepassword123"
  }
  ```
  The `login` field accepts either a **username** or **email**. Alternatively, you can use `email` or `username` fields explicitly.
- **Behavior**: Updates the user's `last_login` timestamp on success.
- **Response (200)**:
  ```json
  {
    "token": "eyJhbGci...",
    "user": {
      "id": 1,
      "username": "john_doe",
      "email": "john@example.com",
      "role": "user"
    }
  }
  ```
- **Errors**: `400` (missing fields), `401` (invalid credentials), `403` (account deactivated)

---

#### `POST /api/auth/logout`

Invalidates the current JWT by adding its JTI to the denylist.

- **Auth**: Bearer token (required)
- **Request Body**: None
- **Response (200)**:
  ```json
  { "message": "Successfully logged out." }
  ```
- **Errors**: `401` (missing/invalid/already-invalidated token)

---

#### `GET /api/auth/me`

Returns the authenticated user's profile.

- **Auth**: Bearer token (required)
- **Response (200)**:
  ```json
  {
    "user": {
      "id": 1,
      "username": "john_doe",
      "email": "john@example.com",
      "role": "user",
      "profile_image_url": "https://res.cloudinary.com/...",
      "bio": "I love cooking!",
      "is_active": true,
      "created_at": "2026-01-01T00:00:00.000Z",
      "last_login": "2026-01-15T12:00:00.000Z"
    }
  }
  ```
- **Errors**: `401` (not authenticated), `404` (user not found/deactivated)

---

#### `POST /api/auth/change-password`

Changes the authenticated user's password.

- **Auth**: Bearer token (required)
- **Request Body**:
  ```json
  {
    "old_password": "currentpassword123",
    "new_password": "newsecurepassword456"
  }
  ```
- **Validation**:
  - Both fields required
  - New password ≥ 8 characters
  - New password must differ from old password
  - Old password must match the stored hash
- **Response (200)**:
  ```json
  { "message": "Password changed successfully." }
  ```
- **Errors**: `400` (missing fields, too short, same password, wrong old password), `401` (not authenticated), `404` (user not found)

---

#### `POST /api/auth/forgot-password`

Initiates the password reset flow by sending a reset email.

- **Auth**: None
- **Request Body**:
  ```json
  { "email": "john@example.com" }
  ```
- **Behavior**:
  - Finds user by email
  - Invalidates any existing unused reset tokens for this user
  - Creates a new token (32-byte random hex, 1-hour TTL)
  - Sends an email with a reset link: `{APP_URL}/pages/reset-password?token=<token>`
  - **Always returns 200** to prevent email enumeration attacks
- **Response (200)**:
  ```json
  { "message": "Ha ez az e-mail cím regisztrálva van, küldtünk egy jelszó-visszaállító linket." }
  ```
- **SMTP Configuration**: Uses Nodemailer with configurable SMTP settings (host, port, secure, user, pass). Defaults to Gmail SMTP.

---

#### `POST /api/auth/reset-password`

Completes the password reset using the token from the email.

- **Auth**: None
- **Request Body**:
  ```json
  {
    "token": "a1b2c3d4e5f6...",
    "new_password": "newsecurepassword456"
  }
  ```
- **Validation**:
  - Token must exist, not be used, and not be expired
  - New password ≥ 8 characters
- **Behavior**: Updates the password and marks the token as used in a **database transaction**.
- **Response (200)**:
  ```json
  { "message": "Password has been reset successfully." }
  ```
- **Errors**: `400` (missing fields, invalid/used/expired token, password too short)

---

### Recipes

#### `GET /api/recipes`

Lists recipes with filtering, sorting, and pagination.

- **Auth**: Optional (adds `is_favorite` and `my_rating` fields if authenticated)
- **Query Parameters**:

  | Parameter | Type | Default | Description |
  |-----------|------|---------|-------------|
  | `page` | `int` | `1` | Page number |
  | `limit` | `int` | `20` | Items per page (max varies) |
  | `query` | `string` | — | Search by title (case-insensitive contains) |
  | `difficulty` | `string` | — | Filter: `easy`, `medium`, or `hard` |
  | `category_ids` | `string` | — | Comma-separated category IDs to filter by |
  | `sort` | `string` | `created_at` | Sort field: `created_at`, `average_rating`, `preparation_time`, `rating_count` |
  | `order` | `string` | `desc` | Sort direction: `asc` or `desc` |

- **Response (200)**:
  ```json
  {
    "recipes": [
      {
        "id": 1,
        "title": "Chocolate Cake",
        "description": "Rich and moist",
        "image_url": "https://...",
        "preparation_time": 60,
        "difficulty": "medium",
        "average_rating": 4.5,
        "rating_count": 12,
        "created_at": "2026-01-01T00:00:00.000Z",
        "author": { "id": 1, "username": "john_doe", "profile_image_url": "..." },
        "recipe_categories": [{ "category": { "id": 1, "name": "Dessert" } }],
        "recipe_tags": [{ "tag": { "id": 1, "name": "chocolate" } }],
        "is_favorite": true,
        "my_rating": 5
      }
    ],
    "pagination": { "page": 1, "limit": 20, "total": 42, "totalPages": 3 }
  }
  ```

---

#### `POST /api/recipes`

Creates a new recipe.

- **Auth**: Bearer token (required)
- **Request Body**:
  ```json
  {
    "title": "Chocolate Cake",
    "description": "Rich and moist chocolate cake",
    "preparation_time": 60,
    "difficulty": "medium",
    "image_url": "https://...",
    "ingredients": [
      { "name": "Flour", "quantity": 200, "unit": "g" },
      { "name": "Sugar", "quantity": 150, "unit": "g" }
    ],
    "steps": [
      { "step_number": 1, "description": "Preheat oven to 180°C" },
      { "step_number": 2, "description": "Mix dry ingredients" }
    ],
    "category_ids": [1, 3],
    "tag_ids": [2, 5]
  }
  ```
- **Validation**:
  - `title` and `preparation_time` are required
  - `difficulty` must be one of: `easy`, `medium`, `hard`
  - `preparation_time` must be > 0
- **Response (201)**: The full created recipe with all nested relations.
- **Errors**: `400` (validation), `401` (not authenticated)

---

#### `GET /api/recipes/:recipeId`

Gets a single recipe with all details.

- **Auth**: Optional (adds `is_favorite` and `my_rating`)
- **Response (200)**:
  ```json
  {
    "recipe": {
      "id": 1,
      "title": "Chocolate Cake",
      "description": "...",
      "image_url": "...",
      "preparation_time": 60,
      "difficulty": "medium",
      "average_rating": 4.5,
      "rating_count": 12,
      "author_id": 1,
      "created_at": "...",
      "updated_at": null,
      "author": { "id": 1, "username": "john_doe", "profile_image_url": "..." },
      "ingredients": [...],
      "steps": [...],
      "recipe_categories": [{ "category": { "id": 1, "name": "Dessert" } }],
      "recipe_tags": [{ "tag": { "id": 1, "name": "chocolate" } }],
      "is_favorite": false,
      "my_rating": null
    }
  }
  ```
- **Errors**: `404` (not found or soft-deleted)

---

#### `PATCH /api/recipes/:recipeId`

Updates a recipe. Supports partial updates.

- **Auth**: Bearer token (owner or admin)
- **Request Body** (all fields optional):
  ```json
  {
    "title": "Updated Title",
    "description": "New description",
    "preparation_time": 45,
    "difficulty": "easy",
    "image_url": "https://...",
    "ingredients": [...],
    "steps": [...],
    "category_ids": [1, 2],
    "tag_ids": [3]
  }
  ```
- **Behavior**:
  - When `ingredients` is provided: deletes all existing ingredients, creates new ones
  - When `steps` is provided: deletes all existing steps, creates new ones
  - When `category_ids` is provided: replaces all category associations
  - When `tag_ids` is provided: replaces all tag associations
  - Sets `updated_at` to current timestamp
- **Response (200)**: The full updated recipe.
- **Errors**: `400` (validation), `401` (not authenticated), `403` (not owner/admin), `404` (not found)

---

#### `DELETE /api/recipes/:recipeId`

Soft-deletes a recipe (sets `is_deleted: true`).

- **Auth**: Bearer token (owner or admin)
- **Response (200)**:
  ```json
  { "message": "Recipe deleted successfully." }
  ```
- **Errors**: `401`, `403`, `404`

---

### Recipe Sub-Resources

#### `GET /api/recipes/:recipeId/summary`

Returns a lightweight summary of a recipe.

- **Auth**: None
- **Response (200)**:
  ```json
  {
    "summary": {
      "id": 1,
      "title": "Chocolate Cake",
      "average_rating": 4.5,
      "rating_count": 12,
      "preparation_time": 60,
      "difficulty": "medium"
    }
  }
  ```

---

#### Ratings

##### `GET /api/recipes/:recipeId/ratings`

Lists all ratings for a recipe with pagination.

- **Auth**: None
- **Query Parameters**: `page`, `limit`
- **Response (200)**:
  ```json
  {
    "ratings": [
      { "id": 1, "rating": 5, "created_at": "...", "user": { "id": 1, "username": "john_doe" } }
    ],
    "summary": { "average_rating": 4.5, "rating_count": 12 },
    "pagination": { "page": 1, "limit": 20, "total": 12, "totalPages": 1 }
  }
  ```

##### `GET /api/recipes/:recipeId/ratings/me`

Returns the authenticated user's rating for this recipe.

- **Auth**: Bearer token (required)
- **Response (200)**:
  ```json
  { "rating": { "id": 1, "rating": 5, "created_at": "..." } }
  ```
  or `{ "rating": null }` if not rated.

##### `PUT /api/recipes/:recipeId/ratings/me`

Creates or updates the user's rating for this recipe.

- **Auth**: Bearer token (required)
- **Request Body**:
  ```json
  { "rating": 5 }
  ```
- **Validation**: Rating must be an integer between 1 and 5 inclusive.
- **Behavior**: Creates a new rating or updates existing (upsert). Recalculates the recipe's `average_rating` and `rating_count` using an aggregation query.
- **Response (200)**:
  ```json
  {
    "rating": { "id": 1, "rating": 5, "created_at": "..." },
    "recipe_stats": { "average_rating": 4.5, "rating_count": 13 }
  }
  ```

##### `DELETE /api/recipes/:recipeId/ratings/me`

Removes the user's rating from this recipe.

- **Auth**: Bearer token (required)
- **Behavior**: Deletes the rating and recalculates recipe stats.
- **Response (200)**:
  ```json
  {
    "message": "Rating removed.",
    "recipe_stats": { "average_rating": 4.3, "rating_count": 11 }
  }
  ```

---

#### Comments

##### `GET /api/recipes/:recipeId/comments`

Lists non-deleted comments for a recipe with pagination.

- **Auth**: None
- **Query Parameters**: `page`, `limit`
- **Response (200)**:
  ```json
  {
    "comments": [
      {
        "id": 1,
        "content": "Great recipe!",
        "created_at": "...",
        "updated_at": null,
        "user": { "id": 1, "username": "john_doe", "profile_image_url": "..." }
      }
    ],
    "pagination": { ... }
  }
  ```

##### `POST /api/recipes/:recipeId/comments`

Creates a new comment on a recipe.

- **Auth**: Bearer token (required)
- **Request Body**:
  ```json
  { "content": "This looks delicious!" }
  ```
- **Validation**: `content` is required and must be a non-empty string.
- **Response (201)**: The created comment with user info.

---

#### Steps

##### `GET /api/recipes/:recipeId/steps`

Lists all steps for a recipe, ordered by `step_number`.

- **Auth**: None
- **Response (200)**:
  ```json
  {
    "steps": [
      { "id": 1, "step_number": 1, "description": "Preheat oven to 180°C" },
      { "id": 2, "step_number": 2, "description": "Mix dry ingredients" }
    ]
  }
  ```

##### `POST /api/recipes/:recipeId/steps`

Adds a new step to a recipe.

- **Auth**: Bearer token (owner or admin)
- **Request Body**:
  ```json
  { "description": "Add eggs and mix well", "step_number": 3 }
  ```
  `step_number` is optional — auto-assigned as max + 1 if omitted.
- **Response (201)**: The created step.

##### `PUT /api/recipes/:recipeId/steps/reorder`

Reorders all steps of a recipe.

- **Auth**: Bearer token (owner or admin)
- **Request Body**:
  ```json
  { "order": [3, 1, 2] }
  ```
  The `order` array contains step IDs in the desired order. All step IDs must belong to the recipe.
- **Behavior**: Renumbers steps sequentially (1, 2, 3, ...) based on the provided order.
- **Response (200)**: The reordered steps array.

##### `PATCH /api/recipes/:recipeId/steps/:stepId`

Updates a specific step's description or step_number.

- **Auth**: Bearer token (owner or admin)
- **Request Body** (partial):
  ```json
  { "description": "Updated instruction", "step_number": 2 }
  ```
- **Response (200)**: The updated step.

##### `DELETE /api/recipes/:recipeId/steps/:stepId`

Deletes a specific step.

- **Auth**: Bearer token (owner or admin)
- **Response (200)**: `{ "message": "Step deleted." }`

---

#### Ingredients

##### `GET /api/recipes/:recipeId/ingredients`

Lists all ingredients for a recipe.

- **Auth**: None
- **Response (200)**:
  ```json
  {
    "ingredients": [
      { "id": 1, "name": "Flour", "quantity": 200, "unit": "g" },
      { "id": 2, "name": "Sugar", "quantity": 150, "unit": "g" }
    ]
  }
  ```

##### `POST /api/recipes/:recipeId/ingredients`

Adds an ingredient to a recipe.

- **Auth**: Bearer token (owner or admin)
- **Request Body**:
  ```json
  { "name": "Butter", "quantity": 100, "unit": "g" }
  ```
  `quantity` and `unit` are optional.
- **Response (201)**: The created ingredient.

##### `PATCH /api/recipes/:recipeId/ingredients/:ingredientId`

Updates a specific ingredient.

- **Auth**: Bearer token (owner or admin)
- **Request Body** (partial):
  ```json
  { "name": "Unsalted Butter", "quantity": 120 }
  ```
- **Response (200)**: The updated ingredient.

##### `DELETE /api/recipes/:recipeId/ingredients/:ingredientId`

Deletes a specific ingredient.

- **Auth**: Bearer token (owner or admin)
- **Response (200)**: `{ "message": "Ingredient deleted." }`

---

#### Categories (Recipe-Level)

##### `PUT /api/recipes/:recipeId/categories`

Replaces all category associations for a recipe.

- **Auth**: Bearer token (owner or admin)
- **Request Body**:
  ```json
  { "categoryIds": [1, 3, 5] }
  ```
- **Behavior**: Validates all category IDs exist, deletes all existing `RecipeCategory` links for this recipe, creates new ones.
- **Response (200)**: Updated categories list.

---

#### Tags (Recipe-Level)

##### `PUT /api/recipes/:recipeId/tags`

Replaces all tag associations for a recipe.

- **Auth**: Bearer token (owner or admin)
- **Request Body**:
  ```json
  { "tagIds": [2, 4] }
  ```
- **Behavior**: Same pattern as categories — validate, delete old, create new.
- **Response (200)**: Updated tags list.

---

#### Favorites

##### `GET /api/recipes/:recipeId/favorite`

Checks if the authenticated user has favorited this recipe.

- **Auth**: Bearer token (required)
- **Response (200)**:
  ```json
  { "is_favorite": true }
  ```

##### `POST /api/recipes/:recipeId/favorite`

Adds the recipe to the user's favorites.

- **Auth**: Bearer token (required)
- **Response (201)**:
  ```json
  { "message": "Recipe added to favorites.", "favorite": { "id": 1, "created_at": "..." } }
  ```
- **Errors**: `409` (already favorited)

##### `DELETE /api/recipes/:recipeId/favorite`

Removes the recipe from the user's favorites.

- **Auth**: Bearer token (required)
- **Response (200)**:
  ```json
  { "message": "Recipe removed from favorites." }
  ```

---

#### Recipe Image

##### `POST /api/recipes/:recipeId/image`

Uploads or updates the recipe's image.

- **Auth**: Bearer token (owner or admin)
- **Content Types**:
  - `multipart/form-data` — Upload a file (field name: `file`)
    - Max size: **5 MB**
    - Allowed types: `image/jpeg`, `image/png`, `image/webp`
    - Uploaded to Cloudinary folder `forkfeed/recipes` with auto-resize (1200×800 limit)
  - `application/json` — Provide a direct URL
    ```json
    { "image_url": "https://example.com/image.jpg" }
    ```
- **Behavior**: If the recipe already has an image on Cloudinary, the old image is deleted.
- **Response (200)**:
  ```json
  { "image_url": "https://res.cloudinary.com/..." }
  ```

---

### Categories

#### `GET /api/categories`

Lists all categories.

- **Auth**: None
- **Query Parameters**:
  | Parameter | Description |
  |-----------|-------------|
  | `query` | Filter by name or description (case-insensitive contains) |
- **Response (200)**:
  ```json
  {
    "categories": [
      { "id": 1, "name": "Dessert", "description": "Sweet treats", "created_at": "..." }
    ]
  }
  ```

#### `POST /api/categories`

Creates a new category.

- **Auth**: Admin only
- **Request Body**:
  ```json
  { "name": "Appetizer", "description": "Small dishes served before the main course" }
  ```
- **Response (201)**: The created category.
- **Errors**: `409` (duplicate name)

#### `GET /api/categories/:categoryId`

Gets a single category with its recipe count.

- **Auth**: None
- **Response (200)**:
  ```json
  {
    "category": { "id": 1, "name": "Dessert", "description": "...", "created_at": "..." },
    "recipe_count": 15
  }
  ```

#### `PATCH /api/categories/:categoryId`

Updates a category's name and/or description.

- **Auth**: Admin only
- **Request Body** (partial):
  ```json
  { "name": "Desserts & Sweets" }
  ```
- **Response (200)**: The updated category.
- **Errors**: `409` (duplicate name)

#### `DELETE /api/categories/:categoryId`

Deletes a category and all associated `RecipeCategory` links.

- **Auth**: Admin only
- **Response (200)**: `{ "message": "Category deleted." }`

---

### Tags

#### `GET /api/tags`

Lists all tags.

- **Auth**: None
- **Query Parameters**: `query` (filter by name)
- **Response (200)**:
  ```json
  { "tags": [{ "id": 1, "name": "vegan", "created_at": "..." }] }
  ```

#### `POST /api/tags`

Creates a new tag.

- **Auth**: Admin only
- **Request Body**: `{ "name": "gluten-free" }`
- **Response (201)**: The created tag.
- **Errors**: `409` (duplicate name)

#### `GET /api/tags/:tagId`

Gets a single tag with its recipe count.

- **Auth**: None
- **Response (200)**:
  ```json
  { "tag": { "id": 1, "name": "vegan", "created_at": "..." }, "recipe_count": 8 }
  ```

#### `PATCH /api/tags/:tagId`

Renames a tag.

- **Auth**: Admin only
- **Request Body**: `{ "name": "plant-based" }`
- **Response (200)**: The updated tag.
- **Errors**: `409` (duplicate name)

#### `DELETE /api/tags/:tagId`

Deletes a tag and all associated `RecipeTag` links.

- **Auth**: Admin only
- **Response (200)**: `{ "message": "Tag deleted." }`

---

### Comments

#### `PATCH /api/comments/:commentId`

Edits a comment's content.

- **Auth**: Bearer token (comment owner or admin)
- **Request Body**: `{ "content": "Updated comment text" }`
- **Behavior**: Sets `updated_at` to current timestamp.
- **Response (200)**: The updated comment.
- **Errors**: `403` (not owner/admin), `404` (not found or already deleted)

#### `DELETE /api/comments/:commentId`

Soft-deletes a comment (sets `is_deleted: true`).

- **Auth**: Bearer token (comment owner or admin)
- **Response (200)**: `{ "message": "Comment deleted." }`

---

### Users (Public)

#### `GET /api/users/:userId`

Returns a public user profile.

- **Auth**: None
- **Response (200)**:
  ```json
  {
    "user": {
      "id": 1,
      "username": "john_doe",
      "profile_image_url": "https://...",
      "bio": "I love cooking!",
      "created_at": "2026-01-01T00:00:00.000Z"
    }
  }
  ```
- **Errors**: `404` (user not found or inactive)

#### `GET /api/users/:userId/stats`

Returns public statistics for a user.

- **Auth**: None
- **Response (200)**:
  ```json
  {
    "stats": {
      "recipes_count": 15,
      "recipe_books_count": 3,
      "average_recipe_rating": 4.2
    }
  }
  ```
  Note: `recipe_books_count` only counts **public** books.

#### `GET /api/users/:userId/recipes`

Lists recipes authored by the user. Paginated.

- **Auth**: None
- **Query Parameters**: `page`, `limit`
- **Response (200)**: `{ "recipes": [...], "pagination": {...} }`

#### `GET /api/users/:userId/recipe-books`

Lists public recipe books owned by the user. Paginated. Includes `recipe_count` per book.

- **Auth**: None
- **Query Parameters**: `page`, `limit`
- **Response (200)**: `{ "recipe_books": [...], "pagination": {...} }`

#### `GET /api/users/:userId/ratings`

Lists recipes the user has rated, with each recipe including the user's `my_rating`. Paginated.

- **Auth**: None
- **Query Parameters**: `page`, `limit`
- **Response (200)**: `{ "recipes": [...], "pagination": {...} }`

#### `GET /api/users/:userId/comments`

Lists distinct recipes the user has commented on (non-deleted comments only). Paginated.

- **Auth**: None
- **Query Parameters**: `page`, `limit`
- **Response (200)**: `{ "recipes": [...], "pagination": {...} }`

---

### Users (Authenticated — /me)

#### `GET /api/users/me`

Returns the authenticated user's full profile. Identical to `GET /api/auth/me`.

- **Auth**: Bearer token (required)
- **Response (200)**: `{ "user": { ... } }`

#### `PATCH /api/users/me`

Updates the authenticated user's profile.

- **Auth**: Bearer token (required)
- **Request Body** (all optional):
  ```json
  {
    "username": "new_username",
    "profile_image_url": "https://...",
    "bio": "Updated bio"
  }
  ```
- **Validation**: New username must be unique.
- **Response (200)**: The updated user object.
- **Errors**: `409` (username taken)

#### `GET /api/users/me/stats`

Returns the authenticated user's detailed statistics.

- **Auth**: Bearer token (required)
- **Response (200)**:
  ```json
  {
    "stats": {
      "recipes_count": 15,
      "comments_count": 42,
      "ratings_given_count": 30,
      "favorites_count": 25,
      "recipe_books_count": 5,
      "average_recipe_rating": 4.2
    }
  }
  ```

#### `GET /api/users/me/favorites`

Lists the authenticated user's favorited recipes. Paginated.

- **Auth**: Bearer token (required)
- **Query Parameters**: `page`, `limit`, `expanded` (`true` for full recipe details, otherwise just IDs)
- **Response (200)**: `{ "favorites": [...], "pagination": {...} }`

#### `PATCH /api/users/me/deactivate`

Deactivates the authenticated user's account.

- **Auth**: Bearer token (required)
- **Behavior**: Sets `is_active: false`. The user can no longer log in.
- **Response (200)**:
  ```json
  { "message": "Account deactivated." }
  ```

---

### Recipe Books

#### `GET /api/recipe-books`

Lists recipe books based on scope.

- **Auth**: Optional
- **Query Parameters**:
  | Parameter | Description |
  |-----------|-------------|
  | `scope` | `"mine"` (own books, auth required), `"public"` (all public), `"all"` (own + public, default) |
  | `page` | Page number |
  | `limit` | Items per page |
- **Response (200)**: `{ "recipe_books": [...], "pagination": {...} }`

#### `POST /api/recipe-books`

Creates a new recipe book.

- **Auth**: Bearer token (required)
- **Request Body**:
  ```json
  {
    "name": "My Italian Favorites",
    "description": "Best Italian recipes I've found",
    "is_public": false
  }
  ```
  `is_public` defaults to `false`.
- **Response (201)**: The created recipe book.

#### `GET /api/recipe-books/:bookId`

Gets a single recipe book with details.

- **Auth**: Optional (private books visible only to owner/admin)
- **Response (200)**: `{ "recipe_book": { ... } }`
- **Errors**: `403` (private book, not owner/admin), `404` (not found)

#### `PATCH /api/recipe-books/:bookId`

Updates a recipe book's name, description, or visibility.

- **Auth**: Bearer token (owner or admin)
- **Request Body** (partial):
  ```json
  { "name": "Updated Name", "is_public": true }
  ```
- **Response (200)**: The updated recipe book.

#### `DELETE /api/recipe-books/:bookId`

**Hard-deletes** a recipe book and all its recipe entries.

- **Auth**: Bearer token (owner or admin)
- **Response (200)**: `{ "message": "Recipe book deleted." }`

#### `POST /api/recipe-books/:bookId/clone`

Clones a public recipe book to the authenticated user's collection.

- **Auth**: Bearer token (required)
- **Behavior**:
  - Creates a copy of the book with `"(copy)"` appended to the name
  - Sets `is_public: false`
  - Copies all recipe entries
  - Cannot clone your own book
- **Response (201)**: The cloned recipe book.
- **Errors**: `400` (own book), `403`/`404` (not public/not found)

#### `GET /api/recipe-books/:bookId/recipes`

Lists recipes in a recipe book. Paginated.

- **Auth**: Optional (private books require owner/admin)
- **Query Parameters**: `page`, `limit`
- **Response (200)**: `{ "recipes": [...], "pagination": {...} }`

#### `POST /api/recipe-books/:bookId/recipes`

Adds recipe(s) to a recipe book.

- **Auth**: Bearer token (owner or admin)
- **Request Body**:
  ```json
  { "recipeId": 5 }
  ```
  or:
  ```json
  { "recipeIds": [5, 8, 12] }
  ```
- **Behavior**: Skips already-existing entries gracefully (no error on duplicates).
- **Response (200/201)**: Confirmation with count of added recipes.

#### `DELETE /api/recipe-books/:bookId/recipes/:recipeId`

Removes a specific recipe from a recipe book.

- **Auth**: Bearer token (owner or admin)
- **Response (200)**: `{ "message": "Recipe removed from book." }`

---

### Reports

#### `POST /api/reports`

Files a report against a recipe or comment.

- **Auth**: Bearer token (required)
- **Request Body**:
  ```json
  {
    "target_type": "recipe",
    "target_id": 5,
    "reason": "Contains inappropriate content"
  }
  ```
- **Validation**:
  - `target_type` must be `"recipe"` or `"comment"`
  - `target_id` must reference an existing, non-deleted recipe or comment
  - `reason` is required
- **Response (201)**: The created report.

#### `GET /api/reports`

Lists the authenticated user's own reports with pagination.

- **Auth**: Bearer token (required)
- **Query Parameters**: `page`, `limit`
- **Response (200)**: `{ "reports": [...], "pagination": {...} }`

---

### Admin

All admin endpoints require `role: "admin"`. Non-admin users receive `403 Forbidden`.

#### `GET /api/admin/users`

Lists all users with filtering and pagination.

- **Auth**: Admin only
- **Query Parameters**:
  | Parameter | Description |
  |-----------|-------------|
  | `query` | Filter by username or email (case-insensitive) |
  | `role` | Filter by role: `"user"` or `"admin"` |
  | `is_active` | Filter by status: `"true"` or `"false"` |
  | `page` | Page number |
  | `limit` | Items per page |
- **Response (200)**: `{ "users": [...], "pagination": {...} }`

#### `PATCH /api/admin/users/:userId`

Updates a user's role and/or active status.

- **Auth**: Admin only
- **Request Body** (partial):
  ```json
  { "role": "admin", "is_active": true }
  ```
- **Validation**:
  - `role` must be `"user"` or `"admin"` (if provided)
  - Cannot deactivate your own admin account
- **Response (200)**: The updated user.
- **Errors**: `400` (self-deactivation, invalid role)

---

#### `GET /api/admin/reports`

Lists all reports with filtering and pagination.

- **Auth**: Admin only
- **Query Parameters**:
  | Parameter | Description |
  |-----------|-------------|
  | `status` | `"pending"`, `"accepted"`, or `"rejected"` |
  | `target_type` | `"recipe"` or `"comment"` |
  | `reported_by` | Filter by reporter's user ID |
  | `page` | Page number |
  | `limit` | Items per page |
- **Response (200)**:
  ```json
  {
    "reports": [
      {
        "id": 1,
        "target_type": "recipe",
        "target_id": 5,
        "reason": "Inappropriate content",
        "status": "pending",
        "created_at": "...",
        "reviewed_at": null,
        "reporter": { "id": 2, "username": "jane_doe" },
        "reviewer": null
      }
    ],
    "pagination": { ... }
  }
  ```

#### `GET /api/admin/reports/:reportId`

Gets a single report with full details.

- **Auth**: Admin only
- **Response (200)**: `{ "report": { ... } }` including reporter and reviewer info.

#### `PATCH /api/admin/reports/:reportId`

Updates a report's status.

- **Auth**: Admin only
- **Request Body**:
  ```json
  { "status": "accepted" }
  ```
  Valid statuses: `"pending"`, `"accepted"`, `"rejected"`.
- **Behavior**: Sets `reviewed_by` to the admin's user ID and `reviewed_at` to current timestamp.
- **Response (200)**: The updated report.

#### `POST /api/admin/reports/:reportId/actions`

Executes an administrative action based on a report.

- **Auth**: Admin only
- **Request Body**:
  ```json
  { "action": "delete_target" }
  ```
  Available actions:
  | Action | Effect |
  |--------|--------|
  | `delete_target` | Soft-deletes the reported recipe or comment (sets `is_deleted: true`) |
  | `warn_user` | Placeholder — logs the action but takes no destructive action |

- **Behavior**: Also auto-sets the report status to `"accepted"`.
- **Response (200)**: Confirmation with the action taken.

---

#### `DELETE /api/admin/comments/:commentId/hard`

Permanently hard-deletes a comment from the database.

- **Auth**: Admin only
- **Response (200)**:
  ```json
  { "message": "Comment permanently deleted." }
  ```
- **Note**: This is the only endpoint that permanently removes data. Use with care.

---

### Uploads

#### `POST /api/uploads`

Generic image upload to Cloudinary.

- **Auth**: Bearer token (required)
- **Content-Type**: `multipart/form-data`
- **Form Fields**:
  | Field | Type | Required | Description |
  |-------|------|----------|-------------|
  | `file` | `File` | Yes | Image file to upload |
  | `type` | `string` | No | `"recipe"` (default) or `"avatar"` |
- **Constraints**:
  - Max file size: **5 MB**
  - Allowed MIME types: `image/jpeg`, `image/png`, `image/webp`
- **Response (200)**:
  ```json
  {
    "url": "https://res.cloudinary.com/your-cloud/image/upload/v.../forkfeed/recipes/abc123.webp",
    "public_id": "forkfeed/recipes/abc123"
  }
  ```
- **Errors**: `400` (missing file, wrong type, too large)

---

### Search

#### `GET /api/search/suggestions`

Returns autocomplete suggestions for a search query.

- **Auth**: None
- **Query Parameters**:
  | Parameter | Description |
  |-----------|-------------|
  | `q` | Search query string |
- **Behavior**:
  - Returns empty arrays if `q` is empty or < 1 character
  - Searches up to **5 results per type** (recipes, categories, tags)
  - Recipe matches: by `title` (case-insensitive contains), excludes soft-deleted
  - Category matches: by `name`
  - Tag matches: by `name`
  - All three queries run in parallel (`Promise.all`)
- **Response (200)**:
  ```json
  {
    "recipes": [
      { "id": 1, "title": "Chocolate Cake" },
      { "id": 5, "title": "Chocolate Mousse" }
    ],
    "categories": [
      { "id": 1, "name": "Chocolate" }
    ],
    "tags": [
      { "id": 3, "name": "chocolate" }
    ]
  }
  ```

---

### Meta

#### `GET /api/meta/difficulties`

Returns the list of valid difficulty levels.

- **Auth**: None
- **Response (200)**:
  ```json
  { "difficulties": ["easy", "medium", "hard"] }
  ```

#### `GET /api/meta/roles`

Returns the list of user roles.

- **Auth**: Admin only
- **Response (200)**:
  ```json
  { "roles": ["user", "admin"] }
  ```

---

## Error Handling

### Standard Error Format

All error responses follow this format:

```json
{ "error": "Human-readable error message." }
```

### HTTP Status Codes Used

| Code | Meaning | Used When |
|------|---------|-----------|
| `200` | OK | Successful GET, PATCH, DELETE, or confirmed action |
| `201` | Created | Successful POST (resource created) |
| `400` | Bad Request | Invalid JSON, missing required fields, validation failure |
| `401` | Unauthorized | Missing/invalid/expired/denylisted token |
| `403` | Forbidden | Authenticated but insufficient permissions (not owner/admin) |
| `404` | Not Found | Resource doesn't exist or is soft-deleted |
| `409` | Conflict | Duplicate resource (username, email, category name, already favorited) |
| `500` | Internal Server Error | Unexpected server-side failure (caught by try/catch blocks) |
| `503` | Service Unavailable | Database unreachable (health check) |

### JSON Parse Errors

All POST/PATCH/PUT endpoints wrap `request.json()` in a try/catch to return a clean `400` error if the request body is not valid JSON:

```json
{ "error": "Invalid JSON payload." }
```

### Pagination Object

All paginated responses include:

```json
{
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 42,
    "totalPages": 3
  }
}
```

---

## Endpoint Summary Table

| # | Method | Endpoint | Auth | Description |
|---|--------|----------|------|-------------|
| 1 | `POST` | `/api/auth/register` | None | Register new user |
| 2 | `POST` | `/api/auth/login` | None | Log in |
| 3 | `POST` | `/api/auth/logout` | Bearer | Log out (denylist token) |
| 4 | `GET` | `/api/auth/me` | Bearer | Get own profile |
| 5 | `POST` | `/api/auth/change-password` | Bearer | Change password |
| 6 | `POST` | `/api/auth/forgot-password` | None | Request password reset email |
| 7 | `POST` | `/api/auth/reset-password` | None | Reset password with token |
| 8 | `GET` | `/api/recipes` | Optional | List recipes (filter, sort, paginate) |
| 9 | `POST` | `/api/recipes` | Bearer | Create recipe |
| 10 | `GET` | `/api/recipes/:id` | Optional | Get recipe details |
| 11 | `PATCH` | `/api/recipes/:id` | Owner/Admin | Update recipe |
| 12 | `DELETE` | `/api/recipes/:id` | Owner/Admin | Soft-delete recipe |
| 13 | `GET` | `/api/recipes/:id/summary` | None | Get recipe summary |
| 14 | `GET` | `/api/recipes/:id/ratings` | None | List recipe ratings |
| 15 | `GET` | `/api/recipes/:id/ratings/me` | Bearer | Get my rating |
| 16 | `PUT` | `/api/recipes/:id/ratings/me` | Bearer | Create/update my rating |
| 17 | `DELETE` | `/api/recipes/:id/ratings/me` | Bearer | Remove my rating |
| 18 | `GET` | `/api/recipes/:id/comments` | None | List recipe comments |
| 19 | `POST` | `/api/recipes/:id/comments` | Bearer | Add comment |
| 20 | `GET` | `/api/recipes/:id/steps` | None | List recipe steps |
| 21 | `POST` | `/api/recipes/:id/steps` | Owner/Admin | Add step |
| 22 | `PUT` | `/api/recipes/:id/steps/reorder` | Owner/Admin | Reorder steps |
| 23 | `PATCH` | `/api/recipes/:id/steps/:stepId` | Owner/Admin | Update step |
| 24 | `DELETE` | `/api/recipes/:id/steps/:stepId` | Owner/Admin | Delete step |
| 25 | `GET` | `/api/recipes/:id/ingredients` | None | List ingredients |
| 26 | `POST` | `/api/recipes/:id/ingredients` | Owner/Admin | Add ingredient |
| 27 | `PATCH` | `/api/recipes/:id/ingredients/:iid` | Owner/Admin | Update ingredient |
| 28 | `DELETE` | `/api/recipes/:id/ingredients/:iid` | Owner/Admin | Delete ingredient |
| 29 | `PUT` | `/api/recipes/:id/categories` | Owner/Admin | Replace recipe categories |
| 30 | `PUT` | `/api/recipes/:id/tags` | Owner/Admin | Replace recipe tags |
| 31 | `GET` | `/api/recipes/:id/favorite` | Bearer | Check if favorited |
| 32 | `POST` | `/api/recipes/:id/favorite` | Bearer | Add to favorites |
| 33 | `DELETE` | `/api/recipes/:id/favorite` | Bearer | Remove from favorites |
| 34 | `POST` | `/api/recipes/:id/image` | Owner/Admin | Upload recipe image |
| 35 | `GET` | `/api/categories` | None | List categories |
| 36 | `POST` | `/api/categories` | Admin | Create category |
| 37 | `GET` | `/api/categories/:id` | None | Get category |
| 38 | `PATCH` | `/api/categories/:id` | Admin | Update category |
| 39 | `DELETE` | `/api/categories/:id` | Admin | Delete category |
| 40 | `GET` | `/api/tags` | None | List tags |
| 41 | `POST` | `/api/tags` | Admin | Create tag |
| 42 | `GET` | `/api/tags/:id` | None | Get tag |
| 43 | `PATCH` | `/api/tags/:id` | Admin | Update tag |
| 44 | `DELETE` | `/api/tags/:id` | Admin | Delete tag |
| 45 | `PATCH` | `/api/comments/:id` | Owner/Admin | Edit comment |
| 46 | `DELETE` | `/api/comments/:id` | Owner/Admin | Soft-delete comment |
| 47 | `GET` | `/api/users/:id` | None | Get public profile |
| 48 | `GET` | `/api/users/:id/stats` | None | Get user stats |
| 49 | `GET` | `/api/users/:id/recipes` | None | List user's recipes |
| 50 | `GET` | `/api/users/:id/recipe-books` | None | List user's public books |
| 51 | `GET` | `/api/users/:id/ratings` | None | List user's ratings |
| 52 | `GET` | `/api/users/:id/comments` | None | List user's commented recipes |
| 53 | `GET` | `/api/users/me` | Bearer | Get own profile |
| 54 | `PATCH` | `/api/users/me` | Bearer | Update own profile |
| 55 | `GET` | `/api/users/me/stats` | Bearer | Get own stats (detailed) |
| 56 | `GET` | `/api/users/me/favorites` | Bearer | List own favorites |
| 57 | `PATCH` | `/api/users/me/deactivate` | Bearer | Deactivate own account |
| 58 | `GET` | `/api/recipe-books` | Optional | List recipe books |
| 59 | `POST` | `/api/recipe-books` | Bearer | Create recipe book |
| 60 | `GET` | `/api/recipe-books/:id` | Optional | Get recipe book |
| 61 | `PATCH` | `/api/recipe-books/:id` | Owner/Admin | Update recipe book |
| 62 | `DELETE` | `/api/recipe-books/:id` | Owner/Admin | Delete recipe book |
| 63 | `POST` | `/api/recipe-books/:id/clone` | Bearer | Clone a public book |
| 64 | `GET` | `/api/recipe-books/:id/recipes` | Optional | List book's recipes |
| 65 | `POST` | `/api/recipe-books/:id/recipes` | Owner/Admin | Add recipe(s) to book |
| 66 | `DELETE` | `/api/recipe-books/:id/recipes/:rid` | Owner/Admin | Remove recipe from book |
| 67 | `POST` | `/api/reports` | Bearer | File a report |
| 68 | `GET` | `/api/reports` | Bearer | List own reports |
| 69 | `GET` | `/api/admin/users` | Admin | List all users |
| 70 | `PATCH` | `/api/admin/users/:id` | Admin | Update user role/status |
| 71 | `GET` | `/api/admin/reports` | Admin | List all reports |
| 72 | `GET` | `/api/admin/reports/:id` | Admin | Get report details |
| 73 | `PATCH` | `/api/admin/reports/:id` | Admin | Update report status |
| 74 | `POST` | `/api/admin/reports/:id/actions` | Admin | Execute moderation action |
| 75 | `DELETE` | `/api/admin/comments/:id/hard` | Admin | Hard-delete comment |
| 76 | `POST` | `/api/uploads` | Bearer | Upload image to Cloudinary |
| 77 | `GET` | `/api/health` | None | Health check |
| 78 | `GET` | `/api/meta/difficulties` | None | List difficulty levels |
| 79 | `GET` | `/api/meta/roles` | Admin | List user roles |
| 80 | `GET` | `/api/search/suggestions` | None | Autocomplete suggestions |
