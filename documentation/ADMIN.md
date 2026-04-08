# ForkFeed — Admin Panel Documentation

This document provides a comprehensive reference for the ForkFeed admin panel, covering architecture, access control, all admin pages, moderation workflows, and the underlying API endpoints.

---

## Table of Contents

- [Overview](#overview)
- [Access Control](#access-control)
- [Layout & Navigation](#layout--navigation)
- [Dashboard](#dashboard)
- [Report Management](#report-management)
  - [Report Lifecycle](#report-lifecycle)
  - [Comment Preview](#comment-preview)
  - [Available Actions](#available-actions)
- [User Management](#user-management)
  - [Filtering & Search](#filtering--search)
  - [User Actions](#user-actions)
  - [Self-Protection](#self-protection)
- [Admin API Endpoints](#admin-api-endpoints)
  - [Reports API](#reports-api)
  - [Users API](#users-api)
- [Moderation Workflows](#moderation-workflows)

---

## Overview

The ForkFeed admin panel is a dedicated interface for platform administrators to moderate content and manage users. It is accessible at `/pages/admin` and provides three main sections:

| Section | Route | Purpose |
|---------|-------|---------|
| Dashboard | `/pages/admin` | Overview statistics and recent activity |
| Reports | `/pages/admin/reports` | Review and act on user-submitted reports |
| Users | `/pages/admin/users` | Search, filter, and manage user accounts |

The admin panel uses a **separate layout** from the main application, with its own sidebar navigation and mobile drawer — completely independent from the main navbar.

---

## Access Control

### Authentication Guard

The admin layout (`app/pages/admin/layout.tsx`) implements a strict access control flow:

```
1. On mount, check localStorage for JWT token
2. If no token → redirect to /pages/login
3. Fetch GET /api/auth/me with the token
4. If response fails or user.role !== "admin" → redirect to /pages/main
5. If admin → render the admin interface
```

A loading spinner is shown while the auth check is in progress.

### Server-Side Enforcement

All admin API endpoints use the `requireAdmin()` helper from `lib/auth.ts`, which:
1. Validates the JWT token
2. Checks that the token is not deny-listed
3. Verifies that the user's role is `"admin"`
4. Returns `401` (no token), `403` (not admin), or the authenticated payload

Both client-side and server-side checks are applied — the client-side guard prevents UI access, while the server-side guard prevents unauthorized API calls.

### Admin Role Assignment

Admin roles are managed through the admin users page. The first admin must be assigned directly in the database. After that, existing admins can promote other users to admin role.

---

## Layout & Navigation

### Desktop Layout

```
┌──────────────────────────────────────────────────────────────────┐
│ ┌──────────┐ ┌─────────────────────────────────────────────────┐ │
│ │          │ │                                                 │ │
│ │  🍴      │ │                                                 │ │
│ │ ForkFeed │ │              Page Content                       │ │
│ │ Admin    │ │                                                 │ │
│ │          │ │                                                 │ │
│ │ ■ Átteki │ │                                                 │ │
│ │ ■ Jelent │ │                                                 │ │
│ │ ■ Felhas │ │                                                 │ │
│ │          │ │                                                 │ │
│ │          │ │                                                 │ │
│ │──────────│ │                                                 │ │
│ │ 🌙 👤    │ │                                                 │ │
│ └──────────┘ └─────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

- **Sidebar** (264px wide): Fixed left panel with logo, nav links, theme toggle, and user avatar
- **Content area**: Flexible main content region
- **Active nav link**: Highlighted with primary color background

### Mobile Layout

- **Top bar**: Hamburger button (left), "🍴 Admin" title (center), theme toggle (right)
- **Slide-out drawer**: Same sidebar content, opens from left with dark overlay backdrop
- **Content**: Full-width below the top bar (with `pt-14` padding for the fixed header)

### Sidebar Navigation Links

| Icon | Label | Route | Active Matching |
|------|-------|-------|-----------------|
| Grid | Áttekintés | `/pages/admin` | Exact match only |
| Flag | Jelentések | `/pages/admin/reports` | Prefix match |
| Users | Felhasználók | `/pages/admin/users` | Prefix match |

### Sidebar Footer

- Theme toggle (light/dark mode switcher)
- User profile link with avatar (image or initial letter) and username
- Links to `/pages/profile`

---

## Dashboard

**Route**: `/pages/admin`

The dashboard provides a quick overview of platform activity.

### Statistics Cards

Four stat cards displayed in a 2×2 grid (4 columns on large screens):

| Card | Color | Value Source | Clickable |
|------|-------|-------------|-----------|
| Függő jelentések (Pending reports) | Warning (yellow) | `GET /api/admin/reports?status=pending&limit=1` → `pagination.total` | Yes → `/pages/admin/reports?status=pending` |
| Összes jelentés (Total reports) | Primary (blue) | `GET /api/admin/reports?limit=1` → `pagination.total` | No |
| Összes felhasználó (Total users) | Primary (blue) | `GET /api/admin/users?limit=1` → `pagination.total` | No |
| Aktív felhasználó (Active users) | Success (green) | `GET /api/admin/users?is_active=true&limit=1` → `pagination.total` | No |

> **Note**: The dashboard uses `limit=1` requests intentionally — it only needs the `pagination.total` count from each response, not the actual data.

### Recent Reports Table

A table showing the 5 most recent reports with columns:

| Column | Description |
|--------|-------------|
| ID | Report ID (links to reports page) |
| Típus | Target type badge (Recept/Komment/Felhasználó) |
| Indok | Report reason text (truncated) |
| Bejelentő | Reporter username (links to reports page) |
| Státusz | Color-coded status badge |
| Dátum | Submission date (Hungarian locale) |

If no reports exist, a "Nincsenek jelentések." empty state is shown.

---

## Report Management

**Route**: `/pages/admin/reports`

The reports page is the primary moderation interface for reviewing user-submitted content reports.

### Filtering

Two filter dropdowns at the top:

| Filter | Options | Default |
|--------|---------|---------|
| Status | Minden státusz, Függőben, Elfogadva, Elutasítva | Függőben (pending) |
| Type | Minden típus, Recept, Komment, Felhasználó | All types |

Changing filters immediately refreshes the list (resets to page 1).

### Report Cards

Each report is rendered as a card with a color-coded left border:

| Status | Border Color |
|--------|-------------|
| Pending | Warning (yellow) |
| Accepted | Success (green) |
| Rejected | Base-300 (gray) |

#### Card Header Content

- **Report ID** — mono-styled `#123`
- **Status badge** — color-coded (warning/success/ghost)
- **Target type badge** — outlined (Recept/Komment/Felhasználó)
- **Target link** — for recipes: link to recipe page; for comments: link to recipe page with comment; for users: no direct link here (available in actions)
- **Reason text** — the full report reason
- **Metadata row** — Reporter username (clickable to user profile), submission date, reviewer name (if reviewed)
- **Expand/collapse chevron** — toggles the action panel

### Comment Preview

When a report targets a comment (`target_type === "comment"`), the card displays an inline preview:

```
┌─────────────────────────────────────────────────┐
│  [username]                        [Törölve]    │
│  "The actual comment content text here..."      │
└─────────────────────────────────────────────────┘
```

- Displayed in a rounded box with `bg-base-200` background
- If the comment is already deleted (`is_deleted: true`): red-tinted background with "Törölve" (Deleted) badge
- Author username is clickable (links to user profile)
- Comment text shown in italics with quotation marks

The comment data is fetched server-side by the API — the reports endpoint enriches comment-type reports with the actual comment content, author info, recipe ID, and deletion status.

### Report Lifecycle

```
                    ┌─────────┐
                    │ Pending │  ← Initial state
                    └────┬────┘
                    ╱         ╲
              ┌────▼───┐  ┌───▼─────┐
              │Accepted│  │Rejected │
              └────┬───┘  └───┬─────┘
                   │          │
                   └──────────┘
                        │
                   ↩ Újranyitás
                   (Reopen → Pending)
```

Any closed report can be reopened back to "Pending" status.

### Available Actions

The action panel is revealed by clicking the expand chevron on each report card.

| Action | Button | Availability | Description |
|--------|--------|-------------|-------------|
| Elfogadás (Accept) | ✓ green | Pending only | Sets status to `accepted` |
| Elutasítás (Reject) | ✕ ghost | Pending only | Sets status to `rejected` |
| Tartalom törlése (Delete content) | 🗑️ red outline | Recipe & Comment reports | Soft-deletes the target (sets `is_deleted: true`) |
| Felhasználó kezelése (Manage user) | 👤 outline | User reports | Links to `/pages/admin/users?highlight={userId}` |
| Újranyitás (Reopen) | ↩ ghost | Accepted/Rejected only | Resets status to `pending` |

#### Content Deletion Flow

1. Admin clicks "Tartalom törlése"
2. Browser `confirm()` dialog: "Biztosan törlöd a bejelentett tartalmat?"
3. If confirmed: `POST /api/admin/reports/{id}/actions` with `{ action: "delete_target" }`
4. Server soft-deletes the comment or recipe (`is_deleted: true`)
5. Report list is refreshed

---

## User Management

**Route**: `/pages/admin/users`

The users page provides a searchable, filterable table of all registered users.

### Filtering & Search

Three filter controls:

| Control | Type | Options |
|---------|------|---------|
| Search | Text input | Searches username and email (case-insensitive) |
| Role | Dropdown | Minden szerep, Felhasználó (user), Admin |
| Status | Dropdown | Minden státusz, Aktív, Inaktív |

Changing any filter resets to page 1 and refreshes the list.

### User Table

| Column | Content |
|--------|---------|
| Felhasználó | Avatar (image or initial letter) + username + `#id` |
| Email | Email address |
| Szerep | Role badge — `admin` (primary color) or `user` (ghost) |
| Státusz | Active badge (success = "Aktív") or inactive badge (error = "Inaktív") |
| Regisztráció | Registration date (Hungarian locale) |
| Utolsó belépés | Last login date or "—" if never logged in |
| Műveletek | Action controls (see below) |

### User Actions

Each user row has two action controls:

#### Role Change

- **Dropdown select** with options: `user`, `admin`
- Selecting a different role triggers a `confirm()` dialog
- On confirmation: `PATCH /api/admin/users/{userId}` with `{ role: "newRole" }`
- Table refreshes after successful change

#### Ban/Unban Toggle

- **Active users**: Red "Tiltás" (Ban) button → sets `is_active: false`
- **Inactive users**: Green "Aktiválás" (Activate) button → sets `is_active: true`
- Both trigger `confirm()` dialogs before execution
- On confirmation: `PATCH /api/admin/users/{userId}` with `{ is_active: true/false }`

### Self-Protection

The admin panel implements safeguards to prevent administrators from accidentally locking themselves out:

| Protection | Implementation |
|-----------|---------------|
| Cannot change own role | Role dropdown is **disabled** for the current admin's row |
| Cannot ban self | Ban button is **disabled** for the current admin's row |
| Server-side check | API returns `400: "Cannot deactivate your own account."` if attempted |

The current admin's user ID is fetched on mount via `GET /api/auth/me` and compared against each row's ID. Matching rows show disabled controls with reduced opacity.

---

## Admin API Endpoints

### Reports API

#### List Reports

```
GET /api/admin/reports
```

**Query Parameters**:

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | integer | 1 | Page number |
| `limit` | integer | 20 | Items per page (max 50) |
| `status` | string | — | Filter by status: `pending`, `accepted`, `rejected` |
| `target_type` | string | — | Filter by type: `recipe`, `comment`, `user` |
| `reported_by` | integer | — | Filter by reporter user ID |

**Response**:

```json
{
  "reports": [
    {
      "id": 1,
      "target_type": "comment",
      "target_id": 42,
      "reason": "Spam content",
      "status": "pending",
      "created_at": "2026-04-09T12:00:00.000Z",
      "reviewed_at": null,
      "reporter": { "id": 5, "username": "john" },
      "reviewer": null,
      "comment": {
        "content": "The actual comment text...",
        "user": { "id": 10, "username": "spammer" },
        "recipe_id": 7,
        "is_deleted": false
      }
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 45, "total_pages": 3 }
}
```

> **Note**: The `comment` field is only present for reports where `target_type === "comment"`. It is enriched server-side by batch-fetching the referenced comments.

#### Get Single Report

```
GET /api/admin/reports/{reportId}
```

Returns a single report with reporter and reviewer details.

#### Update Report Status

```
PATCH /api/admin/reports/{reportId}
```

**Request Body**:

```json
{
  "status": "accepted"  // "pending" | "accepted" | "rejected"
}
```

Sets `reviewed_by` to the current admin's ID and `reviewed_at` to the current timestamp.

#### Execute Report Action

```
POST /api/admin/reports/{reportId}/actions
```

**Request Body**:

```json
{
  "action": "delete_target"  // "delete_target" | "warn_user"
}
```

**Actions**:

| Action | `target_type` | Effect |
|--------|--------------|--------|
| `delete_target` | `comment` | Sets `is_deleted: true` on the comment |
| `delete_target` | `recipe` | Sets `is_deleted: true` on the recipe |
| `delete_target` | `user` | Not supported (returns 422) |
| `warn_user` | any | Placeholder — acknowledged but no action taken |

### Users API

#### List Users

```
GET /api/admin/users
```

**Query Parameters**:

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | integer | 1 | Page number |
| `limit` | integer | 20 | Items per page (max 50) |
| `query` | string | — | Search in username and email (case-insensitive) |
| `role` | string | — | Filter by role: `user`, `admin` |
| `is_active` | string | — | Filter by status: `true`, `false` |

**Response**:

```json
{
  "users": [
    {
      "id": 1,
      "username": "admin",
      "email": "admin@example.com",
      "role": "admin",
      "profile_image_url": "https://...",
      "bio": "Platform administrator",
      "is_active": true,
      "created_at": "2026-01-01T00:00:00.000Z",
      "updated_at": "2026-04-09T00:00:00.000Z",
      "last_login": "2026-04-09T10:30:00.000Z"
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 150, "total_pages": 8 }
}
```

#### Update User

```
PATCH /api/admin/users/{userId}
```

**Request Body** (all fields optional, at least one required):

```json
{
  "role": "admin",       // "user" | "admin"
  "is_active": false     // true | false
}
```

**Server-side protections**:
- Cannot set `is_active: false` on your own account (returns 400)
- Invalid roles return 400
- Non-boolean `is_active` returns 400

---

## Moderation Workflows

### Handling a Reported Comment

```
1. Navigate to /pages/admin/reports (default filter: Pending)
2. Find comment report → read the reason and inline comment preview
3. Decide:
   a. Legitimate report:
      - Click expand → "Elfogadás" (Accept)
      - If content violates rules: "Tartalom törlése" (Delete content)
   b. False report:
      - Click expand → "Elutasítás" (Reject)
4. Report is moved to accepted/rejected list
```

### Handling a Reported Recipe

```
1. Find recipe report → click "megtekintése ↗" to view the recipe in a new tab
2. Review the recipe content
3. Accept/reject the report
4. Optionally delete the recipe via "Tartalom törlése"
```

### Handling a Reported User

```
1. Find user report → read the reason
2. Click expand → "Felhasználó kezelése" → navigates to user management page
3. Find the user in the table
4. Take action: change role or ban the user
5. Return to reports → accept/reject the report
```

### Banning a User

```
1. Navigate to /pages/admin/users
2. Search for the user by name or email
3. Click "Tiltás" (Ban) in the user's row
4. Confirm in the dialog
5. User is immediately banned (is_active: false)
6. Banned users cannot log in (login returns 403)
```

### Promoting a User to Admin

```
1. Navigate to /pages/admin/users
2. Find the user
3. Change role dropdown from "user" to "admin"
4. Confirm in the dialog
5. User now has admin access (effective on next page load)
```
