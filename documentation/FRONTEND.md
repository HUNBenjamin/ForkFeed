# ForkFeed — Frontend Documentation

This document provides a comprehensive reference for the ForkFeed frontend application, covering architecture, page structure, components, navigation, theming, and user interactions.

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Global Layout & Theming](#global-layout--theming)
- [Navigation](#navigation)
- [Authentication Flow](#authentication-flow)
- [Pages](#pages)
  - [Home / Recipe Feed](#home--recipe-feed)
  - [Login](#login)
  - [Registration](#registration)
  - [Password Reset](#password-reset)
  - [Recipe Detail](#recipe-detail)
  - [New Recipe](#new-recipe)
  - [Profile](#profile)
  - [My Recipes](#my-recipes)
  - [Recipe Edit](#recipe-edit)
  - [Favorites](#favorites)
  - [Recipe Books](#recipe-books)
  - [Recipe Book Detail](#recipe-book-detail)
  - [My Comments](#my-comments)
  - [My Ratings](#my-ratings)
  - [Public User Profile](#public-user-profile)
- [Shared Components](#shared-components)
- [Image Upload System](#image-upload-system)
- [Comment System](#comment-system)
- [Recipe Books & Save Flow](#recipe-books--save-flow)
- [Reporting System](#reporting-system)
- [Responsive Design](#responsive-design)
- [API Endpoint Reference](#api-endpoint-reference)

---

## Architecture Overview

ForkFeed's frontend is a **Next.js 16 App Router** application. All user-facing pages live under `app/pages/` and use the `"use client"` directive — the application is predominantly **client-side rendered** with data fetching via `useEffect` and `fetch()`.

### Key Design Decisions

- **No global state library** — Each page manages its own state with React's `useState` and `useEffect` hooks. There are no context providers, Redux stores, or similar.
- **JWT in localStorage** — Authentication tokens are stored in `localStorage` and sent as `Authorization: Bearer <token>` headers. There are no HTTP-only cookies.
- **Hungarian UI** — All user-facing text (labels, buttons, error messages, placeholders) is in Hungarian. The `<html>` element has `lang="hu"`.
- **Page-level data fetching** — Every page independently fetches the data it needs on mount. There is no shared data cache or SWR/React Query layer.
- **Component colocation** — Page-specific components live in `components/` subdirectories next to their parent page. Only truly shared components are in `app/components/`.

### Rendering Pattern

```
app/layout.tsx          → Root HTML shell (server-rendered)
  └── app/page.tsx      → Redirect to /pages/main
  └── app/pages/
       ├── main/        → Client component (useEffect + fetch)
       ├── login/       → Client component
       ├── profile/     → Client component (auth-guarded)
       ├── admin/       → Client component (admin-guarded, own layout)
       └── ...
```

---

## Technology Stack

| Component         | Technology              | Purpose                                               |
| ----------------- | ----------------------- | ----------------------------------------------------- |
| Framework         | Next.js 16 (App Router) | Routing, SSR shell, API routes                        |
| Language          | TypeScript 5            | Type-safe development                                 |
| UI Library        | React 19                | Component architecture                                |
| CSS Framework     | Tailwind CSS 4          | Utility-first styling                                 |
| Component Library | DaisyUI 5               | Pre-built UI components (cards, modals, badges, etc.) |
| Theming           | DaisyUI themes          | Light/dark mode with `data-theme` attribute           |
| Icons             | Heroicons (inline SVG)  | All icons are inlined as SVG paths                    |
| Image Cropping    | Custom canvas-based     | Built-in `ImageCropModal` component                   |

---

## Project Structure

```
app/
├── layout.tsx                    # Root layout: <html lang="hu">, font, globals.css
├── page.tsx                      # Redirects → /pages/main
├── globals.css                   # Tailwind imports, DaisyUI config, custom animations
│
├── components/                   # Shared components
│   ├── Pagination.tsx            # Reusable pagination control
│   ├── ReportModal.tsx           # Report content/user modal
│   ├── ImageUpload.tsx           # Image upload with crop support
│   └── ImageCropModal.tsx        # Canvas-based image cropping
│
└── pages/
    ├── main/                     # Home page + recipe feed
    │   ├── page.tsx
    │   └── components/
    │       ├── Navbar.tsx         # Global navigation bar
    │       ├── ThemeToggle.tsx    # Light/dark mode switch
    │       ├── RecipeList.tsx     # Recipe browser with filters
    │       ├── RecipeCard.tsx     # Recipe card in feed
    │       └── NewRecipeButton.tsx
    │
    ├── login/                    # Login page
    │   ├── page.tsx
    │   ├── layout.tsx            # Auth layout wrapper
    │   └── components/
    │       ├── AuthLayout.tsx
    │       ├── LoginForm.tsx
    │       └── Input.tsx
    │
    ├── register/                 # Registration page
    │   ├── page.tsx
    │   ├── layout.tsx
    │   └── components/
    │       ├── AuthLayout.tsx
    │       ├── RegisterForm.tsx
    │       └── Input.tsx
    │
    ├── reset-password/           # Password reset page
    │   ├── page.tsx
    │   └── components/
    │       └── ResetPasswordForm.tsx
    │
    ├── recipe/
    │   ├── [recipeId]/           # Recipe detail page
    │   │   ├── page.tsx
    │   │   └── components/
    │   │       ├── HeroImage.tsx
    │   │       ├── BadgeRow.tsx
    │   │       ├── AuthorCard.tsx
    │   │       ├── UserAvatar.tsx
    │   │       ├── IngredientList.tsx
    │   │       ├── StepList.tsx
    │   │       ├── StarRating.tsx
    │   │       ├── ShareButton.tsx
    │   │       ├── PrintButton.tsx
    │   │       ├── ScrollToTop.tsx
    │   │       ├── SectionNav.tsx
    │   │       ├── SaveToBookButton.tsx
    │   │       └── comments/
    │   │           ├── CommentSection.tsx
    │   │           ├── CommentForm.tsx
    │   │           ├── CommentCard.tsx
    │   │           ├── CommentPagination.tsx
    │   │           └── commentTypes.ts
    │   └── new/                  # New recipe page
    │       └── page.tsx
    │
    ├── profile/                  # Authenticated user's profile area
    │   ├── page.tsx              # Profile overview
    │   ├── components/
    │   │   ├── ProfileTabs.tsx   # Tab navigation (6 tabs)
    │   │   ├── ProfileCard.tsx
    │   │   ├── StatsCard.tsx
    │   │   ├── EditProfileModal.tsx
    │   │   └── DeactivateAccountModal.tsx
    │   ├── recipes/              # My recipes
    │   │   ├── page.tsx
    │   │   ├── components/
    │   │   │   └── MyRecipeCard.tsx
    │   │   └── [recipeId]/edit/  # Recipe editor
    │   │       ├── page.tsx
    │   │       ├── types.ts
    │   │       └── components/
    │   │           ├── BasicFields.tsx
    │   │           ├── IngredientsEditor.tsx
    │   │           ├── StepsEditor.tsx
    │   │           └── TagCategoryPicker.tsx
    │   ├── favorites/            # Favorite recipes
    │   │   ├── page.tsx
    │   │   └── components/
    │   │       └── FavoriteRecipeCard.tsx
    │   ├── recipe-books/         # Recipe book collections
    │   │   ├── page.tsx
    │   │   ├── components/
    │   │   │   ├── RecipeBookCard.tsx
    │   │   │   └── CreateBookModal.tsx
    │   │   └── [bookId]/         # Book detail
    │   │       ├── page.tsx
    │   │       └── components/
    │   │           ├── BookRecipeCard.tsx
    │   │           └── EditBookModal.tsx
    │   ├── comments/             # My comments
    │   │   ├── page.tsx
    │   │   └── components/
    │   │       └── CommentedRecipeCard.tsx
    │   └── ratings/              # My ratings
    │       ├── page.tsx
    │       └── components/
    │           └── RatedRecipeCard.tsx
    │
    ├── user/
    │   └── [userId]/             # Public user profile
    │       └── page.tsx
    │
    └── admin/                    # Admin panel (separate layout)
        ├── layout.tsx            # Sidebar layout + auth guard
        ├── page.tsx              # Dashboard overview
        ├── reports/
        │   └── page.tsx          # Report management
        └── users/
            └── page.tsx          # User management
```

---

## Global Layout & Theming

### Root Layout (`app/layout.tsx`)

The root layout renders the HTML shell with `lang="hu"`, imports global CSS, and sets metadata:

```
Title: "ForkFeed"
Description: "Receptmegosztó közösség" (Recipe-sharing community)
```

### Theming (`app/globals.css` + `ThemeToggle`)

DaisyUI is configured with two themes:

| Theme   | Activation                                                    |
| ------- | ------------------------------------------------------------- |
| `light` | Default theme                                                 |
| `dark`  | Applied when `prefers-color-scheme: dark` or manually toggled |

The `ThemeToggle` component:

- Toggles the `data-theme` attribute on `<html>` between `light` and `dark`
- Persists the choice in `localStorage.theme`
- Respects system preference on first load (if no stored preference)
- Renders a sun icon (light mode) or moon icon (dark mode)

### Custom CSS Animations

| Animation          | Purpose                                   |
| ------------------ | ----------------------------------------- |
| `slideText`        | Sort label transition in recipe list      |
| `fadeIn`           | Tooltip fade-in effect                    |
| `highlightComment` | Pulsing glow effect on user's own comment |

---

## Navigation

### Navbar (`app/pages/main/components/Navbar.tsx`)

The navbar is the primary navigation component, used on all pages except the admin panel (which has its own sidebar layout).

#### Desktop Layout

```
┌──────────────────────────────────────────────────────────────┐
│ 🍴 ForkFeed  │  Receptek  Kedvencek*  Receptkönyvek*  │  🌙  👤 ▾  │
└──────────────────────────────────────────────────────────────┘
                                                     * = auth only
```

- **Logo**: Links to `/pages/main`
- **Nav links**: `Receptek`, `Kedvencek` (auth), `Receptkönyvek` (auth)
- **Active state**: Current page link highlighted with `bg-primary/10 text-primary`
- **Right side**: Theme toggle + user dropdown (or login/register buttons)

#### User Dropdown Menu

| Item          | Link                          | Condition               |
| ------------- | ----------------------------- | ----------------------- |
| Profilom      | `/pages/profile`              | Always                  |
| Receptjeim    | `/pages/profile/recipes`      | Always                  |
| Receptkönyvek | `/pages/profile/recipe-books` | Always                  |
| Admin panel   | `/pages/admin`                | `role === "admin"` only |
| Kijelentkezés | Logout action                 | Always                  |

#### Mobile Layout

- Hamburger menu button + theme toggle (right-aligned via `ml-auto`)
- Full-screen dropdown with all navigation links and user menu items
- Same active state highlighting as desktop

---

## Authentication Flow

### Token Management

1. **Login** → `POST /api/auth/login` → receives JWT token → stored in `localStorage("token")`
2. **Every authenticated request** → reads token from `localStorage` → sends as `Authorization: Bearer <token>`
3. **Logout** → `POST /api/auth/logout` (server-side token deny-listing) → removes token from `localStorage`
4. **Auth check** → `GET /api/auth/me` → returns user object or 401

### Page-Level Auth Guards

| Pattern           | Implementation                                                                  |
| ----------------- | ------------------------------------------------------------------------------- |
| **Required auth** | `useEffect` checks `localStorage.token`, redirects to `/pages/login` if missing |
| **Optional auth** | Fetches `/api/auth/me`, shows extra features if authenticated                   |
| **Admin guard**   | Fetches `/api/auth/me`, checks `role === "admin"`, redirects if not             |

### Password Reset Flow

1. User clicks "Elfelejtett jelszó" on login page
2. Enters email → `POST /api/auth/forgot-password` → server sends email with reset link
3. User clicks link → `/pages/reset-password?token=<token>`
4. Enters new password → `POST /api/auth/reset-password` → success → auto-redirect to login (3s delay)

---

## Pages

### Home / Recipe Feed

**Route**: `/pages/main`
**Auth**: Public

The landing page and primary recipe discovery interface.

#### Hero Section

- Emoji-decorated heading with app name and tagline
- "Recept feltöltése" CTA button (links to `/pages/recipe/new` if logged in, shows tooltip if not)

#### Recipe Browser (`RecipeList`)

The recipe list is a complex filtering component with URL query parameter synchronization.

**Search**:

- Text search by recipe title (default) or author username (togglable)
- 400ms debounce on keystroke
- Autocomplete suggestions from `/api/search/suggestions`

**Filters**:
| Filter | Type | Interaction |
|--------|------|-------------|
| Difficulty | Single select | `easy` / `medium` / `hard` |
| Categories | Multi-select (3-state) | Neutral → Include → Exclude → Neutral |
| Tags | Multi-select (3-state) | Same as categories |
| Ingredients | Include/Exclude text list | Comma-separated ingredient names |

**Sorting**:
| Sort | Options |
|------|---------|
| Date | Newest first / Oldest first |
| Rating | Highest first / Lowest first |
| Prep time | Shortest first / Longest first |

**URL Sync**: All filter/sort state is synchronized with URL query parameters via `useSearchParams`, enabling shareable filtered views.

#### Recipe Card (`RecipeCard`)

Each recipe displays:

- Color-coded difficulty strip (green = easy, yellow = medium, red = hard)
- Recipe image (or placeholder)
- Title, description (2-line clamp)
- Difficulty badge, preparation time, star rating
- Author avatar and username (clickable → user profile)

---

### Login

**Route**: `/pages/login`
**Auth**: Public

- Email or username + password form
- Client-side validation (required fields)
- Server error messages translated to Hungarian
- Inline "Elfelejtett jelszó" (forgot password) flow with email input
- On success: stores JWT → redirects to `/pages/main`

---

### Registration

**Route**: `/pages/register`
**Auth**: Public

- Username (min 3 chars), email (valid format), password (min 8 chars)
- Client-side validation with Hungarian error messages
- On success: redirects to `/pages/login`

---

### Password Reset

**Route**: `/pages/reset-password?token=<token>`
**Auth**: Token-based

- New password + confirmation inputs
- Validates token presence from URL
- Shows appropriate errors for invalid/expired tokens
- Auto-redirects to login after 3 seconds on success

---

### Recipe Detail

**Route**: `/pages/recipe/{recipeId}`
**Auth**: Optional (more features when logged in)

The most feature-rich page in the application.

#### Content Sections

| Section     | Description                                    |
| ----------- | ---------------------------------------------- |
| Hero Image  | Full-width recipe image with gradient overlay  |
| Badge Row   | Difficulty badge + category badges             |
| Author Card | Avatar, username (link), creation/update dates |
| Description | Recipe description text                        |
| Ingredients | Bulleted list with quantities and units        |
| Steps       | Numbered preparation steps                     |
| Tags        | Tag badges at the bottom                       |

#### Interactive Features (Authenticated Users)

| Feature      | Component          | Description                                                        |
| ------------ | ------------------ | ------------------------------------------------------------------ |
| Favorite     | Heart toggle       | `POST`/`DELETE /api/recipes/{id}/favorite`                         |
| Save to Book | `SaveToBookButton` | Modal to add recipe to a recipe book (with inline book creation)   |
| Rate         | `StarRating`       | 1-5 star rating with hover preview, click to set, option to delete |
| Comment      | `CommentSection`   | Full comment CRUD (see [Comment System](#comment-system))          |
| Report       | `ReportModal`      | Report recipe for moderation                                       |
| Share        | `ShareButton`      | Copies recipe URL to clipboard                                     |
| Print        | `PrintButton`      | Generates print-friendly HTML and triggers browser print           |

#### Admin Features

- **Delete recipe** button (red, with confirmation dialog)

#### Section Navigation (`SectionNav`)

Quick-jump buttons that smooth-scroll to each section (ingredients, steps, comments).

#### Scroll to Top (`ScrollToTop`)

Floating arrow button that appears after scrolling 400px.

---

### New Recipe

**Route**: `/pages/recipe/new`
**Auth**: Required

Full recipe creation form using the same editor components as the edit page.

**Form Fields**:
| Field | Component | Required |
|-------|-----------|----------|
| Title | `BasicFields` | Yes |
| Description | `BasicFields` | No |
| Preparation time | `BasicFields` | Yes (positive integer) |
| Difficulty | `BasicFields` | Yes (easy/medium/hard) |
| Image | `ImageUpload` | No |
| Ingredients | `IngredientsEditor` | No |
| Steps | `StepsEditor` | No |
| Categories | `TagCategoryPicker` | No |
| Tags | `TagCategoryPicker` | No |

On success: redirects to the newly created recipe's detail page.

---

### Profile

**Route**: `/pages/profile`
**Auth**: Required

#### Profile Card

Displays avatar (uploaded image or initial letter), username, email, role badge, bio, and join date.

#### Statistics Card

| Stat         | Description             | Clickable                           |
| ------------ | ----------------------- | ----------------------------------- |
| Recipes      | Total recipes created   | Yes → `/pages/profile/recipes`      |
| Comments     | Total comments          | Yes → `/pages/profile/comments`     |
| Ratings      | Ratings given           | Yes → `/pages/profile/ratings`      |
| Favorites    | Saved favorites         | Yes → `/pages/profile/favorites`    |
| Recipe Books | Created collections     | Yes → `/pages/profile/recipe-books` |
| Avg. Rating  | Average rating received | No                                  |

#### Edit Profile Modal

Update username, bio, and profile image (with crop support).

#### Account Deactivation

"Fiók deaktiválása" button at the bottom → opens modal with:

- Warning alert explaining consequences
- Password confirmation field
- Deactivates account → clears token → redirects to login
- Reversible by admin only

#### Profile Tabs

Horizontal tab bar present on all profile sub-pages with 6 tabs:

```
┌───────────────────────────────────────────────────────────────┐
│  Profil  │  Receptjeim  │  Kedvencek  │  Receptkönyvek  │  Kommentek  │  Értékelések  │
└───────────────────────────────────────────────────────────────┘
```

Active tab is highlighted based on current `pathname`.

---

### My Recipes

**Route**: `/pages/profile/recipes`
**Auth**: Required

- Grid of user's own recipes (3 columns on desktop)
- Each card shows: image, title, difficulty, description, prep time, rating, creation date
- **Edit** button → navigates to `/pages/profile/recipes/{id}/edit`
- **Delete** button → confirmation dialog → `DELETE /api/recipes/{id}`
- Pagination

---

### Recipe Edit

**Route**: `/pages/profile/recipes/{recipeId}/edit`
**Auth**: Required (must be recipe owner)

Same editor UI as the new recipe page, pre-populated with existing data. Uses shared components:

| Component           | Purpose                                            |
| ------------------- | -------------------------------------------------- |
| `BasicFields`       | Title, description, prep time, difficulty selector |
| `IngredientsEditor` | Dynamic ingredient list (add/remove/reorder)       |
| `StepsEditor`       | Ordered step list (add/remove/reorder)             |
| `TagCategoryPicker` | Multi-select from available categories and tags    |
| `ImageUpload`       | Image upload with crop (deferred until save)       |

---

### Favorites

**Route**: `/pages/profile/favorites`
**Auth**: Required

- Lists favorited recipes with image, author avatar, "favorited at" timestamp
- Remove from favorites button per card
- Pagination

---

### Recipe Books

**Route**: `/pages/profile/recipe-books`
**Auth**: Required

- Lists user's recipe book collections
- Each card: name, description, public/private badge, recipe count
- **Create** button → modal with name (required), description, public toggle
- **Delete** button → confirmation dialog
- Pagination

---

### Recipe Book Detail

**Route**: `/pages/profile/recipe-books/{bookId}`
**Auth**: Optional (ownership-aware)

#### Stacked Card Layout

Recipes are displayed in a vertically stacked layout where cards overlap each other:

- Cards use negative margin (`-10rem`) to stack on top of each other
- Only the top portion (title, difficulty, prep time) peeks out from under the card above
- **Hover** expands the hovered card — the card below slides down to reveal full content
- **Click** navigates to the recipe detail page
- Cards feature full-bleed background images with gradient overlays

#### Card Content

Each `BookRecipeCard` shows:

- Background image with dark gradient overlay
- Title, difficulty badge, preparation time, rating (top area — always visible)
- Ingredient badges (up to 8, with "+N" overflow indicator)
- Author avatar and username
- Remove button (owner only, appears on hover)

#### Owner vs. Visitor

| Feature        | Owner               | Visitor                   |
| -------------- | ------------------- | ------------------------- |
| Edit book      | ✅                  | ❌                        |
| Remove recipes | ✅                  | ❌                        |
| Back link      | → Recipe books list | → Owner's profile         |
| Owner info     | Hidden              | Shown (avatar + username) |

---

### My Comments

**Route**: `/pages/profile/comments`
**Auth**: Required

- Lists recipes that the user has commented on
- Clicking a card navigates to `/pages/recipe/{id}#my-comment` (auto-scrolls to their comment)
- Pagination

---

### My Ratings

**Route**: `/pages/profile/ratings`
**Auth**: Required

- Lists recipes the user has rated
- Shows user's rating alongside the recipe's average rating
- Pagination

---

### Public User Profile

**Route**: `/pages/user/{userId}`
**Auth**: Optional

- Profile header: avatar, username, bio, join date
- Stats: recipe count, recipe book count, average rating
- Two tabs: **Recipes** and **Recipe Books** (public only)
- Report user button (visible to logged-in users, hidden for own profile)
- Paginated content in both tabs

---

## Shared Components

### Pagination (`app/components/Pagination.tsx`)

Reusable pagination control used across all list pages.

- "Előző" (Previous) / "Következő" (Next) buttons
- Smart page number display with ellipsis for large page counts
- Active page highlighted
- Props: `page`, `totalPages`, `onPageChange`

### ReportModal (`app/components/ReportModal.tsx`)

Universal reporting modal for recipes, comments, and users.

- Text area for reason (max 500 characters)
- Submits to `POST /api/reports`
- Shows success confirmation after submission
- Props: `open`, `onClose`, `targetType`, `targetId`, `targetLabel`

### ImageUpload (`app/components/ImageUpload.tsx`)

Reusable image upload component with integrated cropping.

- Supports two modes: `"recipe"` (16:9 aspect ratio) and `"avatar"` (1:1)
- File validation: JPEG, PNG, or WEBP only, max 5 MB
- **Deferred upload pattern** — the component exposes an imperative `upload()` method via `ref`. The actual upload to the server only happens when the parent form is saved.
- Integrates `ImageCropModal` for interactive cropping

### ImageCropModal (`app/components/ImageCropModal.tsx`)

Canvas-based image cropping interface.

- Draggable crop box with corner resize handles
- Locked aspect ratio (16:9 or 1:1 depending on mode)
- Outputs cropped image as JPEG blob
- Interactive preview of the crop result

---

## Image Upload System

The image upload flow follows a deferred pattern:

```
1. User selects file
2. ImageCropModal opens → user crops image
3. Cropped image stored locally in component state (as Blob)
4. User fills out the rest of the form
5. User clicks "Save"
6. Parent calls ref.upload() → POST /api/uploads (multipart/form-data)
7. Server uploads to Cloudinary → returns URL
8. Parent includes URL in the main save request (recipe/profile)
```

This ensures images are only uploaded when the user commits to saving, avoiding orphaned uploads.

---

## Comment System

### Architecture

The comment system is built from several components located in `app/pages/recipe/[recipeId]/components/comments/`:

| Component           | Purpose                                                    |
| ------------------- | ---------------------------------------------------------- |
| `CommentSection`    | Container: loads comments, manages state, handles CRUD     |
| `CommentForm`       | Textarea + submit button for new comments                  |
| `CommentCard`       | Individual comment display with edit/delete/report actions |
| `CommentPagination` | Pagination specific to comments                            |
| `commentTypes.ts`   | Shared TypeScript types and helper functions               |

### Features

- **One comment per user** — if the user has already commented, the form shows an info alert instead
- **Edit in place** — clicking edit turns the comment into an editable textarea
- **Soft delete** — deleted comments are marked `is_deleted` but can be seen by admins
- **Auto-scroll** — navigating with `#my-comment` hash auto-scrolls to and highlights the user's comment
- **Highlight animation** — the user's own comment gets a pulsing glow effect via `highlightComment` CSS animation
- **Report** — each comment has a report button opening the `ReportModal`
- **Ordering** — comments are loaded newest-first (`order=desc`)

---

## Recipe Books & Save Flow

### YouTube-Style Inline Creation

The `SaveToBookButton` on the recipe detail page provides a YouTube playlist-style save experience:

1. Click the save button → modal opens listing user's recipe books
2. Click "Hozzáadás" next to any book → recipe is added
3. Click "+ Új receptkönyv létrehozása" → inline form appears (no page navigation)
4. Fill in name, toggle public/private → "Létrehozás és mentés"
5. New book is created AND recipe is saved in a single flow

### Book Visibility

| Type                         | Visible to |
| ---------------------------- | ---------- |
| Public (`is_public: true`)   | Everyone   |
| Private (`is_public: false`) | Owner only |

Books on other users' profiles show only public books. The API enforces visibility rules — private books return 404 for non-owners.

---

## Reporting System

Users can report three types of content:

| Target  | Reported from            | Link provided                   |
| ------- | ------------------------ | ------------------------------- |
| Recipe  | Recipe detail page       | Recipe page link                |
| Comment | Comment card (in recipe) | Recipe page with comment anchor |
| User    | Public user profile      | User profile link               |

Reports are submitted via `POST /api/reports` with a reason text (max 500 chars). The admin panel provides the review interface (see [ADMIN.md](ADMIN.md)).

---

## Responsive Design

The application uses Tailwind CSS responsive prefixes throughout:

| Breakpoint    | Prefix    | Typical Behavior                                |
| ------------- | --------- | ----------------------------------------------- |
| Mobile        | (default) | Single column, hamburger menu, full-width cards |
| Tablet        | `sm:`     | 2-column grids                                  |
| Desktop       | `md:`     | Desktop navbar visible, hamburger hidden        |
| Large desktop | `lg:`     | 3-column grids, admin sidebar visible           |

### Key Responsive Patterns

- **Navbar**: Desktop links hidden below `md:`, hamburger menu shown instead
- **Recipe grid**: 1 column → 2 columns (`sm:`) → 3 columns (`lg:`)
- **Profile tabs**: Horizontally scrollable on mobile (`overflow-x-auto`)
- **Admin layout**: Sidebar hidden below `lg:`, replaced by mobile top bar + slide-out drawer
- **Forms**: Full-width on mobile, max-width constrained on desktop

---

## API Endpoint Reference

Every API endpoint consumed by the frontend, organized by feature area.

### Authentication

| Endpoint                    | Method | Used by                                           |
| --------------------------- | ------ | ------------------------------------------------- |
| `/api/auth/me`              | GET    | Navbar, Profile, Recipe Detail, Admin, many pages |
| `/api/auth/login`           | POST   | Login page                                        |
| `/api/auth/register`        | POST   | Register page                                     |
| `/api/auth/logout`          | POST   | Navbar                                            |
| `/api/auth/forgot-password` | POST   | Login page (forgot flow)                          |
| `/api/auth/reset-password`  | POST   | Reset Password page                               |

### Recipes

| Endpoint                       | Method       | Used by                                |
| ------------------------------ | ------------ | -------------------------------------- |
| `/api/recipes`                 | GET          | Main page (recipe list)                |
| `/api/recipes`                 | POST         | New Recipe page                        |
| `/api/recipes/{id}`            | GET          | Recipe Detail page                     |
| `/api/recipes/{id}`            | PATCH        | Recipe Edit page                       |
| `/api/recipes/{id}`            | DELETE       | My Recipes page, Recipe Detail (admin) |
| `/api/recipes/{id}/favorite`   | POST, DELETE | Recipe Detail page                     |
| `/api/recipes/{id}/ratings/me` | PUT, DELETE  | Recipe Detail page                     |
| `/api/recipes/{id}/comments`   | GET, POST    | Comment Section                        |

### Comments

| Endpoint             | Method | Used by                  |
| -------------------- | ------ | ------------------------ |
| `/api/comments/{id}` | PATCH  | Comment editing (inline) |
| `/api/comments/{id}` | DELETE | Comment deletion         |

### Categories & Tags

| Endpoint          | Method | Used by                               |
| ----------------- | ------ | ------------------------------------- |
| `/api/categories` | GET    | RecipeList filters, TagCategoryPicker |
| `/api/tags`       | GET    | RecipeList filters, TagCategoryPicker |

### Users

| Endpoint                       | Method     | Used by                         |
| ------------------------------ | ---------- | ------------------------------- |
| `/api/users/{id}`              | GET        | Public User Profile             |
| `/api/users/{id}/stats`        | GET        | Public User Profile             |
| `/api/users/{id}/recipes`      | GET        | Public User Profile, My Recipes |
| `/api/users/{id}/recipe-books` | GET        | Public User Profile             |
| `/api/users/{id}/comments`     | GET        | My Comments                     |
| `/api/users/{id}/ratings`      | GET        | My Ratings                      |
| `/api/users/me`                | GET, PATCH | Profile page                    |
| `/api/users/me/stats`          | GET        | Profile page                    |
| `/api/users/me/favorites`      | GET        | Favorites page                  |
| `/api/users/me/deactivate`     | PATCH      | DeactivateAccountModal          |

### Recipe Books

| Endpoint                                    | Method             | Used by                           |
| ------------------------------------------- | ------------------ | --------------------------------- |
| `/api/recipe-books`                         | GET                | Recipe Books page                 |
| `/api/recipe-books`                         | POST               | CreateBookModal, SaveToBookButton |
| `/api/recipe-books/{id}`                    | GET, PATCH, DELETE | Book Detail page                  |
| `/api/recipe-books/{id}/recipes`            | GET, POST          | Book Detail, SaveToBookButton     |
| `/api/recipe-books/{id}/recipes/{recipeId}` | DELETE             | Book Detail (remove recipe)       |

### Reports & Uploads

| Endpoint                  | Method | Used by                        |
| ------------------------- | ------ | ------------------------------ |
| `/api/reports`            | POST   | ReportModal                    |
| `/api/uploads`            | POST   | ImageUpload                    |
| `/api/search/suggestions` | GET    | RecipeList search autocomplete |

### Admin

| Endpoint                          | Method | Used by                        |
| --------------------------------- | ------ | ------------------------------ |
| `/api/admin/reports`              | GET    | Admin Dashboard, Admin Reports |
| `/api/admin/reports/{id}`         | PATCH  | Admin Reports                  |
| `/api/admin/reports/{id}/actions` | POST   | Admin Reports                  |
| `/api/admin/users`                | GET    | Admin Dashboard, Admin Users   |
| `/api/admin/users/{id}`           | PATCH  | Admin Users                    |
