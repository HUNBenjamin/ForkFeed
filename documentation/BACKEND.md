# ForkFeed — Backend dokumentáció

Ez a dokumentum átfogó referenciát nyújt a ForkFeed REST API backendhez, beleértve az architektúrát, hitelesítést, adatbázissémát, minden API végpontot, hibakezelést és segédkönyvtárakat.

---

## Tartalomjegyzék

- [Architektúra áttekintés](#architektúra-áttekintés)
- [Technológiai stack](#technológiai-stack)
- [Hitelesítés és jogosultságkezelés](#hitelesítés-és-jogosultságkezelés)
- [Adatbázisséma](#adatbázisséma)
- [Segédkönyvtárak](#segédkönyvtárak)
- [API végpontok](#api-végpontok)
  - [Állapotjelző](#állapotjelző)
  - [Hitelesítés](#hitelesítés)
  - [Receptek](#receptek)
  - [Recept al-erőforrások](#recept-al-erőforrások)
  - [Kategóriák](#kategóriák)
  - [Címkék](#címkék)
  - [Hozzászólások](#hozzászólások)
  - [Felhasználók (nyilvános)](#felhasználók-nyilvános)
  - [Felhasználók (hitelesített — /me)](#felhasználók-hitelesített--me)
  - [Receptkönyvek](#receptkönyvek)
  - [Jelentések](#jelentések)
  - [Admin](#admin)
  - [Feltöltések](#feltöltések)
  - [Keresés](#keresés)
  - [Meta](#meta)
- [Hibakezelés](#hibakezelés)
- [Végpont összefoglaló táblázat](#végpont-összefoglaló-táblázat)

---

## Architektúra áttekintés

A ForkFeed backendje teljes egészében **Next.js 16 App Router** használatával készült, **Route Handler**-ek (`route.ts` fájlok) segítségével. Nincs külön backend szerver — minden API útvonal az `app/api/` könyvtár alatt található, és a frontenddel együtt serverless függvényekként kerülnek telepítésre.

### Fő tervezési döntések

- **Futtatókörnyezet**: Minden API útvonal explicit módon beállítja az `export const runtime = "nodejs"` értéket, hogy biztosítsa a Node.js API-k (crypto, Buffer) elérhetőségét (az Edge futtatókörnyezettel szemben).
- **Nincs middleware fájl**: A hitelesítést útvonalonként kezelik a `lib/auth.ts` segédfüggvényeinek hívásával. Nincs globális `middleware.ts`.
- **Lágy törlés**: A receptek és hozzászólások `is_deleted` logikai jelzőt használnak a végleges eltávolítás helyett. Admin végpontok léteznek a végleges törléshez.
- **Szekvenciális azonosítók**: A felhasználó, recept és más fő modellek szekvenciális egész szám azonosítókat használnak (automatikusan növekszik a meglévő maximum ID + 1 megtalálásával) a MongoDB alapértelmezett ObjectId-ja helyett. A kapcsolótáblák (`RecipeCategory`, `RecipeTag`, `RecipeBookRecipe`, `PasswordResetToken`, `DenylistedToken`) automatikusan generált ObjectId-kat használnak.
- **Lapozás**: Minden listázó végpont támogatja a `page` és `limit` lekérdezési paramétereket (alapértékek: `page=1`, `limit=20`). A válaszok tartalmaznak egy `pagination` objektumot a `page`, `limit`, `total` és `totalPages` mezőkkel.

### Kérés/Válasz formátum

- Minden kéréstörzs **JSON** (kivéve a fájlfeltöltéseket, amelyek `multipart/form-data` formátumot használnak).
- Minden válasz **JSON** (`application/json`).
- Sikeres válaszok az erőforrást vagy egy `{ message: "..." }` megerősítést adnak vissza.
- Hibaválaszok `{ error: "Ember által olvasható üzenet." }` formátumot adnak vissza.

---

## Technológiai stack

| Komponens | Technológia | Cél |
|-----------|-------------|-----|
| Futtatókörnyezet | Node.js 18+ | Szerveroldali JavaScript végrehajtás |
| Keretrendszer | Next.js 16 (App Router) | Route handlerek, SSR, statikus generálás |
| Nyelv | TypeScript 5 | Típusbiztonság |
| Adatbázis | MongoDB | Dokumentum-adatbázis |
| ORM | Prisma 6 | Típusbiztos adatbázis-hozzáférés, séma kezelés |
| Hitelesítés | jsonwebtoken (JWT) | Állapotmentes hitelesítés |
| Jelszó hashelés | Node.js `crypto.scryptSync` | Biztonságos jelszó hashelés véletlenszerű sóval |
| Képtárolás | Cloudinary SDK v2 | Képfeltöltés, transzformáció és CDN |
| E-mail | Nodemailer | SMTP e-mail küldés (jelszó-visszaállítás) |

---

## Hitelesítés és jogosultságkezelés

### JWT alapú hitelesítés

A ForkFeed **JWT (JSON Web Token)** tokeneket használ az állapotmentes hitelesítéshez. A tokenek bejelentkezéskor/regisztrációkor kerülnek kiadásra, és az `Authorization` fejlécben kell elküldeni a védett végpontokhoz.

#### Token szerkezet

```
Authorization: Bearer <jwt-token>
```

A JWT payload tartalma:

| Mező | Típus | Leírás |
|------|-------|--------|
| `sub` | `number` | Felhasználó azonosító |
| `username` | `string` | Felhasználónév |
| `role` | `string` | `"user"` vagy `"admin"` |
| `jti` | `string` | Egyedi token azonosító (UUID v4) |
| `iat` | `number` | Kibocsátás időbélyege (Unix) |
| `exp` | `number` | Lejárat időbélyege (Unix) |

- **Lejárat**: A tokenek **1 nap** (`1d`) után járnak le.
- **Titkos kulcs**: A `JWT_SECRET` környezeti változóval konfigurálható.

#### Token tiltólista

Amikor egy felhasználó kijelentkezik, a token `jti` értéke hozzáadódik a `DenylistedToken` gyűjteményhez az adatbázisban, ezáltal érvényteleníti azt a természetes lejárata előtt. Minden hitelesített kérés ellenőrzi a tiltólistát.

### Jogosultsági szintek

Az API négy jogosultsági szinttel rendelkezik:

| Szint | Leírás | Megvalósítás |
|-------|--------|--------------|
| **Nincs** | Nem szükséges hitelesítés | Nincs hitelesítési ellenőrzés |
| **Opcionális hitelesítés** | Hitelesítés nélkül is működik, de hitelesített felhasználónak extra adatokat ad vissza | `optionalAuth(request)` — `JwtPayload \| null` értéket ad vissza |
| **Hitelesített** | Érvényes, nem tiltólistázott JWT szükséges | `authenticateRequest(request)` — payload-ot vagy `{error, status}` értéket ad vissza |
| **Admin** | Hitelesített felhasználó `role: "admin"` jogosultsággal | `requireAdmin(request)` — hitelesítést + szerepkört ellenőriz |

### Tulajdonos-vagy-admin minta

Sok írási művelet (frissítés/törlés) ellenőrzi, hogy a kérelmező az **erőforrás tulajdonosa** vagy **admin**-e. Ez minden route handlerben inline módon van megvalósítva:

```typescript
if (recipe.author_id !== auth.sub && auth.role !== "admin") {
  return NextResponse.json({ error: "Forbidden." }, { status: 403 });
}
```

### Jelszó hashelés

A jelszavak **scrypt** (Node.js beépített `crypto.scryptSync`) használatával vannak hashelve:
- **Véletlenszerű 16 bájtos só** (hexadecimális kódolású)
- **64 bájtos kulcshossz**
- Tárolt formátum: `scrypt$<salt>$<hash>`

Az ellenőrzés `timingSafeEqual` használatával történik az időzítési támadások megelőzése érdekében.

---

## Adatbázisséma

Az adatbázis **MongoDB**, amelyet a **Prisma ORM**-en keresztül érünk el. A séma a `prisma/schema.prisma` fájlban van definiálva.

### Entitás-kapcsolat áttekintés

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
       └── DenylistedToken (önálló)
```

### Modellek

#### User (Felhasználó)

Egy regisztrált felhasználói fiókot reprezentál.

| Mező | Típus | Alapértelmezett | Leírás |
|------|-------|-----------------|--------|
| `id` | `Int` | — | Elsődleges kulcs (szekvenciális) |
| `username` | `String` | — | Egyedi felhasználónév |
| `email` | `String` | — | Egyedi e-mail (kisbetűsen tárolt) |
| `password_hash` | `String` | — | Scrypt hash (`scrypt$salt$hash`) |
| `role` | `Role` | `user` | Enum: `user` \| `admin` |
| `profile_image_url` | `String?` | `null` | Cloudinary profilkép URL |
| `bio` | `String?` | `null` | Felhasználó bemutatkozás |
| `is_active` | `Boolean` | `true` | `false` = deaktivált fiók |
| `created_at` | `DateTime` | `now()` | Fiók létrehozás időbélyege |
| `updated_at` | `DateTime?` | `null` | Utolsó profil frissítés |
| `last_login` | `DateTime?` | `null` | Utolsó sikeres bejelentkezés |

**Kapcsolatok**: recipes, comments, ratings, favorites, recipe_books, reported_reports, reviewed_reports, password_reset_tokens

#### Recipe (Recept)

Egy felhasználó által létrehozott recept metaadatokkal, hozzávalókkal és lépésekkel.

| Mező | Típus | Alapértelmezett | Leírás |
|------|-------|-----------------|--------|
| `id` | `Int` | — | Elsődleges kulcs (szekvenciális) |
| `title` | `String` | — | Recept címe |
| `description` | `String?` | `null` | Recept leírása |
| `image_url` | `String?` | `null` | Cloudinary kép URL |
| `preparation_time` | `Int` | — | Elkészítési idő percben (> 0) |
| `difficulty` | `String` | — | `"easy"` \| `"medium"` \| `"hard"` |
| `average_rating` | `Float` | `0` | Átlagos értékelés gyorsítótárban (újraszámolódik értékelés változáskor) |
| `rating_count` | `Int` | `0` | Összes értékelés számláló gyorsítótárban |
| `author_id` | `Int` | — | FK → User.id |
| `created_at` | `DateTime` | `now()` | Létrehozás időbélyege |
| `updated_at` | `DateTime?` | `null` | Utolsó frissítés időbélyege |
| `is_deleted` | `Boolean` | `false` | Lágy törlés jelző |

**Kapcsolatok**: author (User), ingredients, steps, comments, ratings, favorites, recipe_categories, recipe_tags, recipe_book_recipes

#### Ingredient (Hozzávaló)

Egy recepthez tartozó hozzávaló.

| Mező | Típus | Leírás |
|------|-------|--------|
| `id` | `Int` | Elsődleges kulcs (szekvenciális) |
| `recipe_id` | `Int` | FK → Recipe.id |
| `name` | `String` | Hozzávaló neve |
| `quantity` | `Float?` | Mennyiség (opcionális) |
| `unit` | `String?` | Mértékegység (opcionális) |

#### Step (Elkészítési lépés)

Egy recepthez tartozó rendezett elkészítési lépés.

| Mező | Típus | Leírás |
|------|-------|--------|
| `id` | `Int` | Elsődleges kulcs (szekvenciális) |
| `recipe_id` | `Int` | FK → Recipe.id |
| `step_number` | `Int` | Sorrendi index (1-alapú) |
| `description` | `String` | Lépés utasítás szövege |

#### Category (Kategória)

Recept besorolási kategória (pl. „Desszert", „Leves").

| Mező | Típus | Leírás |
|------|-------|--------|
| `id` | `Int` | Elsődleges kulcs (szekvenciális) |
| `name` | `String` | Egyedi kategórianév |
| `description` | `String?` | Kategória leírása |
| `created_at` | `DateTime` | Létrehozás időbélyege |

#### Tag (Címke)

Könnyű súlyú címke a receptekhez (pl. „vegán", „gluténmentes").

| Mező | Típus | Leírás |
|------|-------|--------|
| `id` | `Int` | Elsődleges kulcs (szekvenciális) |
| `name` | `String` | Egyedi címkenév |
| `created_at` | `DateTime` | Létrehozás időbélyege |

#### RecipeCategory (Kapcsolótábla)

Több-a-többhöz kapcsolat a Recipe és Category között.

| Mező | Típus | Leírás |
|------|-------|--------|
| `id` | `ObjectId` | Automatikusan generált |
| `recipe_id` | `Int` | FK → Recipe.id |
| `category_id` | `Int` | FK → Category.id |

**Egyediségi megszorítás**: `(recipe_id, category_id)`

#### RecipeTag (Kapcsolótábla)

Több-a-többhöz kapcsolat a Recipe és Tag között.

| Mező | Típus | Leírás |
|------|-------|--------|
| `id` | `ObjectId` | Automatikusan generált |
| `recipe_id` | `Int` | FK → Recipe.id |
| `tag_id` | `Int` | FK → Tag.id |

**Egyediségi megszorítás**: `(recipe_id, tag_id)`

#### Comment (Hozzászólás)

Egy felhasználói hozzászólás egy recepthez.

| Mező | Típus | Alapértelmezett | Leírás |
|------|-------|-----------------|--------|
| `id` | `Int` | — | Elsődleges kulcs (szekvenciális) |
| `recipe_id` | `Int` | — | FK → Recipe.id |
| `user_id` | `Int` | — | FK → User.id |
| `content` | `String` | — | Hozzászólás szövege |
| `created_at` | `DateTime` | `now()` | Létrehozás időbélyege |
| `updated_at` | `DateTime?` | `null` | Utolsó szerkesztés időbélyege |
| `is_deleted` | `Boolean` | `false` | Lágy törlés jelző |

#### Rating (Értékelés)

Egy felhasználó csillagos értékelése (1–5) egy recepthez. Receptenként egy értékelés felhasználónként.

| Mező | Típus | Leírás |
|------|-------|--------|
| `id` | `Int` | Elsődleges kulcs (szekvenciális) |
| `recipe_id` | `Int` | FK → Recipe.id |
| `user_id` | `Int` | FK → User.id |
| `rating` | `Int` | 1–5 |
| `created_at` | `DateTime` | Létrehozás időbélyege |

**Egyediségi megszorítás**: `(recipe_id, user_id)`

#### Favorite (Kedvenc)

Egy felhasználó könyvjelzője egy recepthez.

| Mező | Típus | Leírás |
|------|-------|--------|
| `id` | `Int` | Elsődleges kulcs (szekvenciális) |
| `user_id` | `Int` | FK → User.id |
| `recipe_id` | `Int` | FK → Recipe.id |
| `created_at` | `DateTime` | Létrehozás időbélyege |

**Egyediségi megszorítás**: `(user_id, recipe_id)`

#### RecipeBook (Receptkönyv)

Felhasználó által létrehozott receptgyűjtemény.

| Mező | Típus | Alapértelmezett | Leírás |
|------|-------|-----------------|--------|
| `id` | `Int` | — | Elsődleges kulcs (szekvenciális) |
| `name` | `String` | — | Könyv címe |
| `description` | `String?` | `null` | Könyv leírása |
| `owner_id` | `Int` | — | FK → User.id |
| `is_public` | `Boolean` | `false` | Nyilvános láthatóság |
| `created_at` | `DateTime` | `now()` | Létrehozás időbélyege |
| `updated_at` | `DateTime?` | `null` | Utolsó frissítés |

#### RecipeBookRecipe (Kapcsolótábla)

Több-a-többhöz kapcsolat a RecipeBook és Recipe között.

| Mező | Típus | Leírás |
|------|-------|--------|
| `id` | `ObjectId` | Automatikusan generált |
| `recipe_book_id` | `Int` | FK → RecipeBook.id |
| `recipe_id` | `Int` | FK → Recipe.id |

**Egyediségi megszorítás**: `(recipe_book_id, recipe_id)`

#### Report (Jelentés)

Egy felhasználó által egy recept vagy hozzászólás ellen beadott jelentés.

| Mező | Típus | Alapértelmezett | Leírás |
|------|-------|-----------------|--------|
| `id` | `Int` | — | Elsődleges kulcs (szekvenciális) |
| `reported_by` | `Int` | — | FK → User.id (bejelentő) |
| `target_type` | `String` | — | `"recipe"` \| `"comment"` |
| `target_id` | `Int` | — | A bejelentett recept/hozzászólás azonosítója |
| `reason` | `String` | — | Jelentés indoklás szövege |
| `status` | `String` | `"pending"` | `"pending"` \| `"accepted"` \| `"rejected"` |
| `reviewed_by` | `Int?` | `null` | FK → User.id (elbíráló admin) |
| `created_at` | `DateTime` | `now()` | Létrehozás időbélyege |
| `reviewed_at` | `DateTime?` | `null` | Elbírálás időbélyege |

#### PasswordResetToken (Jelszó-visszaállító token)

Időkorlátos token a jelszó-visszaállítási folyamathoz.

| Mező | Típus | Leírás |
|------|-------|--------|
| `id` | `ObjectId` | Automatikusan generált |
| `user_id` | `Int` | FK → User.id |
| `token` | `String` | Egyedi 32 bájtos véletlenszerű hexadecimális token |
| `expires_at` | `DateTime` | Token lejárata (létrehozás után 1 óra) |
| `used_at` | `DateTime?` | Mikor lett felhasználva a token |
| `created_at` | `DateTime` | Létrehozás időbélyege |

#### DenylistedToken (Tiltólistázott token)

Érvénytelenített JWT token azonosítókat tárol (kijelentkezésből).

| Mező | Típus | Leírás |
|------|-------|--------|
| `id` | `ObjectId` | Automatikusan generált |
| `jti` | `String` | Egyedi JWT azonosító (a token `jti` mezőjéből) |
| `expires_at` | `DateTime` | Mikor járt volna le az eredeti token |
| `created_at` | `DateTime` | Mikor lett tiltólistázva |

---

## Segédkönyvtárak

### `lib/auth.ts` — Hitelesítési segédfüggvények

Ez a modul központosítja az összes JWT és hitelesítési logikát.

| Függvény | Szignatúra | Leírás |
|----------|------------|--------|
| `signToken` | `(user: {id, username, role}) → string` | Aláírt JWT-t hoz létre `sub`, `username`, `role`, `jti` (véletlenszerű UUID) mezőkkel. 1 nap múlva jár le. |
| `verifyToken` | `(token: string) → JwtPayload \| null` | JWT-t ellenőriz és dekódol. Bármilyen hiba esetén `null`-t ad vissza (lejárt, érvénytelen aláírás stb.). |
| `isTokenDenylisted` | `(jti: string) → Promise<boolean>` | Ellenőrzi, hogy egy JTI létezik-e a `DenylistedToken` gyűjteményben. |
| `denylistToken` | `(jti: string, expiresAt: Date) → Promise<void>` | JTI-t ad hozzá a tiltólistához az eredeti lejáratával. |
| `extractBearerToken` | `(authHeader: string \| null) → string \| null` | Kinyeri a token sztringet egy `"Bearer <token>"` fejlécből. `null`-t ad vissza, ha hiányzik/hibás formátumú. |
| `authenticateRequest` | `(request: Request) → Promise<JwtPayload \| {error, status}>` | Teljes hitelesítési folyamat: token kinyerés → ellenőrzés → tiltólista ellenőrzés. Sikeres esetben a payload-ot, egyébként hibaobjektumot ad vissza. |
| `requireAdmin` | `(request: Request) → Promise<JwtPayload \| {error, status}>` | Ugyanaz, mint az `authenticateRequest`, de további `role === "admin"` ellenőrzéssel. 403-at ad vissza, ha nem admin. |
| `optionalAuth` | `(request: Request) → Promise<JwtPayload \| null>` | Megpróbálja a hitelesítést, de hiba helyett `null`-t ad vissza, ha nincs token / érvénytelen token. Olyan végpontokhoz használatos, amelyek eltérően viselkednek bejelentkezett felhasználók számára. |

### `lib/prisma.ts` — Adatbázis kliens szingleton

Egyetlen `PrismaClient` példányt hoz létre és a Node.js `global` objektumhoz csatolja, hogy megelőzze a több példány létrehozását a fejlesztési hot-reloading során. Éles környezetben friss klienst használ.

```typescript
const globalForPrisma = global as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
export default prisma;
```

### `lib/cloudinary.ts` — Kép feltöltés/törlés

A Cloudinary CDN-nel való képinterakciókat kezeli.

| Függvény | Szignatúra | Leírás |
|----------|------------|--------|
| `uploadToCloudinary` | `(buffer: Buffer, folder: UploadFolder) → Promise<{url, public_id}>` | Képpuffert tölt fel a Cloudinary-ra. A mappa típusától függően automatikus transzformációkat alkalmaz. |
| `deleteFromCloudinary` | `(publicIdOrUrl: string) → Promise<void>` | Képet töröl a Cloudinary-ról. public_id-t vagy teljes URL-t fogad el (automatikusan kinyeri a public_id-t). Csendben sikertelen, ha a kép nem létezik. |

**Feltöltési mappák és transzformációk**:

| Mappa | Átméretezés | Vágás |
|-------|-------------|-------|
| `forkfeed/avatars` | 256×256 | `fill` `gravity: "face"` értékkel |
| `forkfeed/recipes` | 1200×800 | `limit` (nincs felskálázás) |

Mindkettő `quality: "auto"` és `fetch_format: "auto"` beállítást alkalmaz az optimális kézbesítéshez.

---

## API végpontok

### Állapotjelző

#### `GET /api/health`

Állapotjelző végpont, amely ellenőrzi az adatbázis-kapcsolatot.

- **Hitelesítés**: Nincs
- **Válasz (200)**:
  ```json
  { "status": "ok", "db": "ok", "timestamp": "2026-01-01T00:00:00.000Z" }
  ```
- **Válasz (503)**:
  ```json
  { "status": "error", "db": "unavailable", "message": "...", "timestamp": "..." }
  ```

---

### Hitelesítés

#### `POST /api/auth/register`

Új felhasználói fiók regisztrálása.

- **Hitelesítés**: Nincs
- **Kérés törzs**:
  ```json
  {
    "username": "john_doe",
    "email": "john@example.com",
    "password": "securepassword123"
  }
  ```
- **Validáció**:
  - Mindhárom mező kötelező
  - A jelszónak legalább 8 karakter hosszúnak kell lennie
  - A felhasználónév és e-mail egyedinek kell lennie (kis-nagybetű érzéketlen e-mail ellenőrzés)
- **Válasz (201)**:
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
- **Hibák**: `400` (hiányzó/érvénytelen mezők), `409` (duplikált felhasználónév/e-mail)

---

#### `POST /api/auth/login`

Felhasználó hitelesítése és JWT token visszaadása.

- **Hitelesítés**: Nincs
- **Kérés törzs**:
  ```json
  {
    "login": "john_doe",
    "password": "securepassword123"
  }
  ```
  A `login` mező **felhasználónevet** vagy **e-mailt** is elfogad. Alternatívaként használhatók az `email` vagy `username` mezők explicit módon.
- **Viselkedés**: Sikeres bejelentkezéskor frissíti a felhasználó `last_login` időbélyegét.
- **Válasz (200)**:
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
- **Hibák**: `400` (hiányzó mezők), `401` (érvénytelen hitelesítő adatok), `403` (deaktivált fiók)

---

#### `POST /api/auth/logout`

Az aktuális JWT érvénytelenítése a JTI tiltólistához adásával.

- **Hitelesítés**: Bearer token (kötelező)
- **Kérés törzs**: Nincs
- **Válasz (200)**:
  ```json
  { "message": "Successfully logged out." }
  ```
- **Hibák**: `401` (hiányzó/érvénytelen/már érvénytelenített token)

---

#### `GET /api/auth/me`

A hitelesített felhasználó profiljának visszaadása.

- **Hitelesítés**: Bearer token (kötelező)
- **Válasz (200)**:
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
- **Hibák**: `401` (nem hitelesített), `404` (felhasználó nem található/deaktivált)

---

#### `POST /api/auth/change-password`

A hitelesített felhasználó jelszavának megváltoztatása.

- **Hitelesítés**: Bearer token (kötelező)
- **Kérés törzs**:
  ```json
  {
    "old_password": "currentpassword123",
    "new_password": "newsecurepassword456"
  }
  ```
- **Validáció**:
  - Mindkét mező kötelező
  - Az új jelszónak legalább 8 karakter hosszúnak kell lennie
  - Az új jelszónak különböznie kell a régitől
  - A régi jelszónak egyeznie kell a tárolt hash-sel
- **Válasz (200)**:
  ```json
  { "message": "Password changed successfully." }
  ```
- **Hibák**: `400` (hiányzó mezők, túl rövid, azonos jelszó, hibás régi jelszó), `401` (nem hitelesített), `404` (felhasználó nem található)

---

#### `POST /api/auth/forgot-password`

Jelszó-visszaállítási folyamat indítása visszaállító e-mail küldésével.

- **Hitelesítés**: Nincs
- **Kérés törzs**:
  ```json
  { "email": "john@example.com" }
  ```
- **Viselkedés**:
  - Felhasználót keres e-mail alapján
  - Érvényteleníti a felhasználó meglévő, nem használt visszaállító tokenjeit
  - Új tokent hoz létre (32 bájtos véletlenszerű hex, 1 órás élettartam)
  - E-mailt küld visszaállítási linkkel: `{APP_URL}/pages/reset-password?token=<token>`
  - **Mindig 200-at ad vissza** az e-mail felsorolási támadások megelőzése érdekében
- **Válasz (200)**:
  ```json
  { "message": "Ha ez az e-mail cím regisztrálva van, küldtünk egy jelszó-visszaállító linket." }
  ```
- **SMTP konfiguráció**: Nodemailer-t használ konfigurálható SMTP beállításokkal (host, port, secure, user, pass). Alapértelmezetten Gmail SMTP-t használ.

---

#### `POST /api/auth/reset-password`

Jelszó-visszaállítás befejezése az e-mailben kapott token segítségével.

- **Hitelesítés**: Nincs
- **Kérés törzs**:
  ```json
  {
    "token": "a1b2c3d4e5f6...",
    "new_password": "newsecurepassword456"
  }
  ```
- **Validáció**:
  - A tokennek léteznie kell, nem használtnak és nem lejártnak kell lennie
  - Az új jelszónak legalább 8 karakter hosszúnak kell lennie
- **Viselkedés**: Frissíti a jelszót és felhasználtnak jelöli a tokent egy **adatbázis tranzakcióban**.
- **Válasz (200)**:
  ```json
  { "message": "Password has been reset successfully." }
  ```
- **Hibák**: `400` (hiányzó mezők, érvénytelen/használt/lejárt token, túl rövid jelszó)

---

### Receptek

#### `GET /api/recipes`

Receptek listázása szűréssel, rendezéssel és lapozással.

- **Hitelesítés**: Opcionális (hitelesített felhasználónak `is_favorite` és `my_rating` mezőket ad hozzá)
- **Lekérdezési paraméterek**:

  | Paraméter | Típus | Alapértelmezett | Leírás |
  |-----------|-------|-----------------|--------|
  | `page` | `int` | `1` | Oldalszám |
  | `limit` | `int` | `20` | Elemek oldalanként (max változó) |
  | `query` | `string` | — | Keresés cím alapján (kis-nagybetű érzéketlen tartalmazza) |
  | `difficulty` | `string` | — | Szűrő: `easy`, `medium` vagy `hard` |
  | `category_ids` | `string` | — | Vesszővel elválasztott kategória azonosítók szűréshez |
  | `sort` | `string` | `created_at` | Rendezési mező: `created_at`, `average_rating`, `preparation_time`, `rating_count` |
  | `order` | `string` | `desc` | Rendezési irány: `asc` vagy `desc` |

- **Válasz (200)**:
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

Új recept létrehozása.

- **Hitelesítés**: Bearer token (kötelező)
- **Kérés törzs**:
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
- **Validáció**:
  - A `title` és `preparation_time` kötelező
  - A `difficulty` értéke az alábbiak egyike kell legyen: `easy`, `medium`, `hard`
  - A `preparation_time` > 0 kell legyen
- **Válasz (201)**: A teljes létrehozott recept az összes beágyazott kapcsolattal.
- **Hibák**: `400` (validáció), `401` (nem hitelesített)

---

#### `GET /api/recipes/:recipeId`

Egy recept lekérése az összes részlettel.

- **Hitelesítés**: Opcionális (`is_favorite` és `my_rating` hozzáadásával)
- **Válasz (200)**:
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
- **Hibák**: `404` (nem található vagy lágy törölve)

---

#### `PATCH /api/recipes/:recipeId`

Recept frissítése. Részleges frissítéseket támogat.

- **Hitelesítés**: Bearer token (tulajdonos vagy admin)
- **Kérés törzs** (minden mező opcionális):
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
- **Viselkedés**:
  - Ha `ingredients` meg van adva: törli az összes meglévő hozzávalót, újakat hoz létre
  - Ha `steps` meg van adva: törli az összes meglévő lépést, újakat hoz létre
  - Ha `category_ids` meg van adva: lecseréli az összes kategória társítást
  - Ha `tag_ids` meg van adva: lecseréli az összes címke társítást
  - Az `updated_at` értékét az aktuális időbélyegre állítja
- **Válasz (200)**: A teljes frissített recept.
- **Hibák**: `400` (validáció), `401` (nem hitelesített), `403` (nem tulajdonos/admin), `404` (nem található)

---

#### `DELETE /api/recipes/:recipeId`

Recept lágy törlése (`is_deleted: true` beállítása).

- **Hitelesítés**: Bearer token (tulajdonos vagy admin)
- **Válasz (200)**:
  ```json
  { "message": "Recipe deleted successfully." }
  ```
- **Hibák**: `401`, `403`, `404`

---

### Recept al-erőforrások

#### `GET /api/recipes/:recipeId/summary`

Recept könnyű súlyú összefoglalójának visszaadása.

- **Hitelesítés**: Nincs
- **Válasz (200)**:
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

#### Értékelések

##### `GET /api/recipes/:recipeId/ratings`

Egy recept összes értékelésének listázása lapozással.

- **Hitelesítés**: Nincs
- **Lekérdezési paraméterek**: `page`, `limit`
- **Válasz (200)**:
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

A hitelesített felhasználó értékelésének visszaadása ehhez a recepthez.

- **Hitelesítés**: Bearer token (kötelező)
- **Válasz (200)**:
  ```json
  { "rating": { "id": 1, "rating": 5, "created_at": "..." } }
  ```
  vagy `{ "rating": null }`, ha nem értékelt.

##### `PUT /api/recipes/:recipeId/ratings/me`

A felhasználó értékelésének létrehozása vagy frissítése ehhez a recepthez.

- **Hitelesítés**: Bearer token (kötelező)
- **Kérés törzs**:
  ```json
  { "rating": 5 }
  ```
- **Validáció**: Az értékelésnek 1 és 5 közötti egész számnak kell lennie.
- **Viselkedés**: Új értékelést hoz létre vagy meglévőt frissít (upsert). Újraszámolja a recept `average_rating` és `rating_count` értékeit aggregációs lekérdezéssel.
- **Válasz (200)**:
  ```json
  {
    "rating": { "id": 1, "rating": 5, "created_at": "..." },
    "recipe_stats": { "average_rating": 4.5, "rating_count": 13 }
  }
  ```

##### `DELETE /api/recipes/:recipeId/ratings/me`

A felhasználó értékelésének eltávolítása erről a receptről.

- **Hitelesítés**: Bearer token (kötelező)
- **Viselkedés**: Törli az értékelést és újraszámolja a recept statisztikáit.
- **Válasz (200)**:
  ```json
  {
    "message": "Rating removed.",
    "recipe_stats": { "average_rating": 4.3, "rating_count": 11 }
  }
  ```

---

#### Hozzászólások

##### `GET /api/recipes/:recipeId/comments`

Nem törölt hozzászólások listázása egy recepthez lapozással.

- **Hitelesítés**: Nincs
- **Lekérdezési paraméterek**: `page`, `limit`
- **Válasz (200)**:
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

Új hozzászólás létrehozása egy recepthez.

- **Hitelesítés**: Bearer token (kötelező)
- **Kérés törzs**:
  ```json
  { "content": "This looks delicious!" }
  ```
- **Validáció**: A `content` kötelező és nem üres sztringnek kell lennie.
- **Válasz (201)**: A létrehozott hozzászólás felhasználói adatokkal.

---

#### Lépések

##### `GET /api/recipes/:recipeId/steps`

Egy recept összes lépésének listázása `step_number` szerinti sorrendben.

- **Hitelesítés**: Nincs
- **Válasz (200)**:
  ```json
  {
    "steps": [
      { "id": 1, "step_number": 1, "description": "Preheat oven to 180°C" },
      { "id": 2, "step_number": 2, "description": "Mix dry ingredients" }
    ]
  }
  ```

##### `POST /api/recipes/:recipeId/steps`

Új lépés hozzáadása egy recepthez.

- **Hitelesítés**: Bearer token (tulajdonos vagy admin)
- **Kérés törzs**:
  ```json
  { "description": "Add eggs and mix well", "step_number": 3 }
  ```
  A `step_number` opcionális — ha nincs megadva, automatikusan max + 1 értéket kap.
- **Válasz (201)**: A létrehozott lépés.

##### `PUT /api/recipes/:recipeId/steps/reorder`

Egy recept összes lépésének átrendezése.

- **Hitelesítés**: Bearer token (tulajdonos vagy admin)
- **Kérés törzs**:
  ```json
  { "order": [3, 1, 2] }
  ```
  Az `order` tömb a lépés azonosítókat tartalmazza a kívánt sorrendben. Minden lépés azonosítónak a recepthez kell tartoznia.
- **Viselkedés**: A megadott sorrend alapján szekvenciálisan újraszámozza a lépéseket (1, 2, 3, ...).
- **Válasz (200)**: Az átrendezett lépések tömbje.

##### `PATCH /api/recipes/:recipeId/steps/:stepId`

Egy adott lépés leírásának vagy lépésszámának frissítése.

- **Hitelesítés**: Bearer token (tulajdonos vagy admin)
- **Kérés törzs** (részleges):
  ```json
  { "description": "Updated instruction", "step_number": 2 }
  ```
- **Válasz (200)**: A frissített lépés.

##### `DELETE /api/recipes/:recipeId/steps/:stepId`

Egy adott lépés törlése.

- **Hitelesítés**: Bearer token (tulajdonos vagy admin)
- **Válasz (200)**: `{ "message": "Step deleted." }`

---

#### Hozzávalók

##### `GET /api/recipes/:recipeId/ingredients`

Egy recept összes hozzávalójának listázása.

- **Hitelesítés**: Nincs
- **Válasz (200)**:
  ```json
  {
    "ingredients": [
      { "id": 1, "name": "Flour", "quantity": 200, "unit": "g" },
      { "id": 2, "name": "Sugar", "quantity": 150, "unit": "g" }
    ]
  }
  ```

##### `POST /api/recipes/:recipeId/ingredients`

Hozzávaló hozzáadása egy recepthez.

- **Hitelesítés**: Bearer token (tulajdonos vagy admin)
- **Kérés törzs**:
  ```json
  { "name": "Butter", "quantity": 100, "unit": "g" }
  ```
  A `quantity` és `unit` opcionális.
- **Válasz (201)**: A létrehozott hozzávaló.

##### `PATCH /api/recipes/:recipeId/ingredients/:ingredientId`

Egy adott hozzávaló frissítése.

- **Hitelesítés**: Bearer token (tulajdonos vagy admin)
- **Kérés törzs** (részleges):
  ```json
  { "name": "Unsalted Butter", "quantity": 120 }
  ```
- **Válasz (200)**: A frissített hozzávaló.

##### `DELETE /api/recipes/:recipeId/ingredients/:ingredientId`

Egy adott hozzávaló törlése.

- **Hitelesítés**: Bearer token (tulajdonos vagy admin)
- **Válasz (200)**: `{ "message": "Ingredient deleted." }`

---

#### Kategóriák (Recept szintű)

##### `PUT /api/recipes/:recipeId/categories`

Egy recept összes kategória társításának lecserélése.

- **Hitelesítés**: Bearer token (tulajdonos vagy admin)
- **Kérés törzs**:
  ```json
  { "categoryIds": [1, 3, 5] }
  ```
- **Viselkedés**: Ellenőrzi, hogy az összes kategória azonosító létezik, törli a recept összes meglévő `RecipeCategory` kapcsolatát, és újakat hoz létre.
- **Válasz (200)**: Frissített kategóriák listája.

---

#### Címkék (Recept szintű)

##### `PUT /api/recipes/:recipeId/tags`

Egy recept összes címke társításának lecserélése.

- **Hitelesítés**: Bearer token (tulajdonos vagy admin)
- **Kérés törzs**:
  ```json
  { "tagIds": [2, 4] }
  ```
- **Viselkedés**: Ugyanaz a minta, mint a kategóriáknál — validálás, régi törlése, új létrehozása.
- **Válasz (200)**: Frissített címkék listája.

---

#### Kedvencek

##### `GET /api/recipes/:recipeId/favorite`

Ellenőrzi, hogy a hitelesített felhasználó kedvencnek jelölte-e ezt a receptet.

- **Hitelesítés**: Bearer token (kötelező)
- **Válasz (200)**:
  ```json
  { "is_favorite": true }
  ```

##### `POST /api/recipes/:recipeId/favorite`

A recept hozzáadása a felhasználó kedvenceihez.

- **Hitelesítés**: Bearer token (kötelező)
- **Válasz (201)**:
  ```json
  { "message": "Recipe added to favorites.", "favorite": { "id": 1, "created_at": "..." } }
  ```
- **Hibák**: `409` (már kedvencnek jelölve)

##### `DELETE /api/recipes/:recipeId/favorite`

A recept eltávolítása a felhasználó kedvenceiből.

- **Hitelesítés**: Bearer token (kötelező)
- **Válasz (200)**:
  ```json
  { "message": "Recipe removed from favorites." }
  ```

---

#### Recept kép

##### `POST /api/recipes/:recipeId/image`

Recept képének feltöltése vagy frissítése.

- **Hitelesítés**: Bearer token (tulajdonos vagy admin)
- **Tartalom típusok**:
  - `multipart/form-data` — Fájl feltöltése (mezőnév: `file`)
    - Maximális méret: **5 MB**
    - Engedélyezett típusok: `image/jpeg`, `image/png`, `image/webp`
    - Cloudinary `forkfeed/recipes` mappába feltöltve automatikus átméretezéssel (1200×800 limit)
  - `application/json` — Közvetlen URL megadása
    ```json
    { "image_url": "https://example.com/image.jpg" }
    ```
- **Viselkedés**: Ha a receptnek már van Cloudinary-n tárolt képe, a régi kép törlődik.
- **Válasz (200)**:
  ```json
  { "image_url": "https://res.cloudinary.com/..." }
  ```

---

### Kategóriák

#### `GET /api/categories`

Összes kategória listázása.

- **Hitelesítés**: Nincs
- **Lekérdezési paraméterek**:
  | Paraméter | Leírás |
  |-----------|--------|
  | `query` | Szűrés név vagy leírás alapján (kis-nagybetű érzéketlen tartalmazza) |
- **Válasz (200)**:
  ```json
  {
    "categories": [
      { "id": 1, "name": "Dessert", "description": "Sweet treats", "created_at": "..." }
    ]
  }
  ```

#### `POST /api/categories`

Új kategória létrehozása.

- **Hitelesítés**: Csak admin
- **Kérés törzs**:
  ```json
  { "name": "Appetizer", "description": "Small dishes served before the main course" }
  ```
- **Válasz (201)**: A létrehozott kategória.
- **Hibák**: `409` (duplikált név)

#### `GET /api/categories/:categoryId`

Egy kategória lekérése a hozzá tartozó receptek számával.

- **Hitelesítés**: Nincs
- **Válasz (200)**:
  ```json
  {
    "category": { "id": 1, "name": "Dessert", "description": "...", "created_at": "..." },
    "recipe_count": 15
  }
  ```

#### `PATCH /api/categories/:categoryId`

Egy kategória nevének és/vagy leírásának frissítése.

- **Hitelesítés**: Csak admin
- **Kérés törzs** (részleges):
  ```json
  { "name": "Desserts & Sweets" }
  ```
- **Válasz (200)**: A frissített kategória.
- **Hibák**: `409` (duplikált név)

#### `DELETE /api/categories/:categoryId`

Egy kategória és az összes hozzátartozó `RecipeCategory` kapcsolat törlése.

- **Hitelesítés**: Csak admin
- **Válasz (200)**: `{ "message": "Category deleted." }`

---

### Címkék

#### `GET /api/tags`

Összes címke listázása.

- **Hitelesítés**: Nincs
- **Lekérdezési paraméterek**: `query` (szűrés név alapján)
- **Válasz (200)**:
  ```json
  { "tags": [{ "id": 1, "name": "vegan", "created_at": "..." }] }
  ```

#### `POST /api/tags`

Új címke létrehozása.

- **Hitelesítés**: Csak admin
- **Kérés törzs**: `{ "name": "gluten-free" }`
- **Válasz (201)**: A létrehozott címke.
- **Hibák**: `409` (duplikált név)

#### `GET /api/tags/:tagId`

Egy címke lekérése a hozzá tartozó receptek számával.

- **Hitelesítés**: Nincs
- **Válasz (200)**:
  ```json
  { "tag": { "id": 1, "name": "vegan", "created_at": "..." }, "recipe_count": 8 }
  ```

#### `PATCH /api/tags/:tagId`

Címke átnevezése.

- **Hitelesítés**: Csak admin
- **Kérés törzs**: `{ "name": "plant-based" }`
- **Válasz (200)**: A frissített címke.
- **Hibák**: `409` (duplikált név)

#### `DELETE /api/tags/:tagId`

Egy címke és az összes hozzátartozó `RecipeTag` kapcsolat törlése.

- **Hitelesítés**: Csak admin
- **Válasz (200)**: `{ "message": "Tag deleted." }`

---

### Hozzászólások

#### `PATCH /api/comments/:commentId`

Hozzászólás tartalmának szerkesztése.

- **Hitelesítés**: Bearer token (hozzászólás tulajdonosa vagy admin)
- **Kérés törzs**: `{ "content": "Updated comment text" }`
- **Viselkedés**: Az `updated_at` értékét az aktuális időbélyegre állítja.
- **Válasz (200)**: A frissített hozzászólás.
- **Hibák**: `403` (nem tulajdonos/admin), `404` (nem található vagy már törölve)

#### `DELETE /api/comments/:commentId`

Hozzászólás lágy törlése (`is_deleted: true` beállítása).

- **Hitelesítés**: Bearer token (hozzászólás tulajdonosa vagy admin)
- **Válasz (200)**: `{ "message": "Comment deleted." }`

---

### Felhasználók (nyilvános)

#### `GET /api/users/:userId`

Nyilvános felhasználói profil visszaadása.

- **Hitelesítés**: Nincs
- **Válasz (200)**:
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
- **Hibák**: `404` (felhasználó nem található vagy inaktív)

#### `GET /api/users/:userId/stats`

Felhasználó nyilvános statisztikáinak visszaadása.

- **Hitelesítés**: Nincs
- **Válasz (200)**:
  ```json
  {
    "stats": {
      "recipes_count": 15,
      "recipe_books_count": 3,
      "average_recipe_rating": 4.2
    }
  }
  ```
  Megjegyzés: A `recipe_books_count` csak a **nyilvános** könyveket számolja.

#### `GET /api/users/:userId/recipes`

A felhasználó által szerzett receptek listázása. Lapozható.

- **Hitelesítés**: Nincs
- **Lekérdezési paraméterek**: `page`, `limit`
- **Válasz (200)**: `{ "recipes": [...], "pagination": {...} }`

#### `GET /api/users/:userId/recipe-books`

A felhasználó nyilvános receptkönyveinek listázása. Lapozható. Minden könyvhöz tartalmazza a `recipe_count` értéket.

- **Hitelesítés**: Nincs
- **Lekérdezési paraméterek**: `page`, `limit`
- **Válasz (200)**: `{ "recipe_books": [...], "pagination": {...} }`

#### `GET /api/users/:userId/ratings`

A felhasználó által értékelt receptek listázása, minden receptnél a felhasználó `my_rating` értékével. Lapozható.

- **Hitelesítés**: Nincs
- **Lekérdezési paraméterek**: `page`, `limit`
- **Válasz (200)**: `{ "recipes": [...], "pagination": {...} }`

#### `GET /api/users/:userId/comments`

Azok a receptek listázása, amelyekhez a felhasználó hozzászólt (csak nem törölt hozzászólások). Lapozható.

- **Hitelesítés**: Nincs
- **Lekérdezési paraméterek**: `page`, `limit`
- **Válasz (200)**: `{ "recipes": [...], "pagination": {...} }`

---

### Felhasználók (hitelesített — /me)

#### `GET /api/users/me`

A hitelesített felhasználó teljes profiljának visszaadása. Azonos a `GET /api/auth/me` végponttal.

- **Hitelesítés**: Bearer token (kötelező)
- **Válasz (200)**: `{ "user": { ... } }`

#### `PATCH /api/users/me`

A hitelesített felhasználó profiljának frissítése.

- **Hitelesítés**: Bearer token (kötelező)
- **Kérés törzs** (minden mező opcionális):
  ```json
  {
    "username": "new_username",
    "profile_image_url": "https://...",
    "bio": "Updated bio"
  }
  ```
- **Validáció**: Az új felhasználónévnek egyedinek kell lennie.
- **Válasz (200)**: A frissített felhasználói objektum.
- **Hibák**: `409` (felhasználónév foglalt)

#### `GET /api/users/me/stats`

A hitelesített felhasználó részletes statisztikáinak visszaadása.

- **Hitelesítés**: Bearer token (kötelező)
- **Válasz (200)**:
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

A hitelesített felhasználó kedvenc receptjeinek listázása. Lapozható.

- **Hitelesítés**: Bearer token (kötelező)
- **Lekérdezési paraméterek**: `page`, `limit`, `expanded` (`true` a teljes recept részletekhez, egyébként csak azonosítók)
- **Válasz (200)**: `{ "favorites": [...], "pagination": {...} }`

#### `PATCH /api/users/me/deactivate`

A hitelesített felhasználó fiókjának deaktiválása.

- **Hitelesítés**: Bearer token (kötelező)
- **Viselkedés**: `is_active: false` beállítása. A felhasználó többé nem tud bejelentkezni.
- **Válasz (200)**:
  ```json
  { "message": "Account deactivated." }
  ```

---

### Receptkönyvek

#### `GET /api/recipe-books`

Receptkönyvek listázása hatókör alapján.

- **Hitelesítés**: Opcionális
- **Lekérdezési paraméterek**:
  | Paraméter | Leírás |
  |-----------|--------|
  | `scope` | `"mine"` (saját könyvek, hitelesítés szükséges), `"public"` (összes nyilvános), `"all"` (saját + nyilvános, alapértelmezett) |
  | `page` | Oldalszám |
  | `limit` | Elemek oldalanként |
- **Válasz (200)**: `{ "recipe_books": [...], "pagination": {...} }`

#### `POST /api/recipe-books`

Új receptkönyv létrehozása.

- **Hitelesítés**: Bearer token (kötelező)
- **Kérés törzs**:
  ```json
  {
    "name": "My Italian Favorites",
    "description": "Best Italian recipes I've found",
    "is_public": false
  }
  ```
  Az `is_public` alapértelmezetten `false`.
- **Válasz (201)**: A létrehozott receptkönyv.

#### `GET /api/recipe-books/:bookId`

Egy receptkönyv lekérése részletekkel.

- **Hitelesítés**: Opcionális (privát könyvek csak a tulajdonos/admin számára láthatók)
- **Válasz (200)**: `{ "recipe_book": { ... } }`
- **Hibák**: `403` (privát könyv, nem tulajdonos/admin), `404` (nem található)

#### `PATCH /api/recipe-books/:bookId`

Receptkönyv nevének, leírásának vagy láthatóságának frissítése.

- **Hitelesítés**: Bearer token (tulajdonos vagy admin)
- **Kérés törzs** (részleges):
  ```json
  { "name": "Updated Name", "is_public": true }
  ```
- **Válasz (200)**: A frissített receptkönyv.

#### `DELETE /api/recipe-books/:bookId`

Receptkönyv és összes receptbejegyzésének **végleges törlése**.

- **Hitelesítés**: Bearer token (tulajdonos vagy admin)
- **Válasz (200)**: `{ "message": "Recipe book deleted." }`

#### `POST /api/recipe-books/:bookId/clone`

Nyilvános receptkönyv klónozása a hitelesített felhasználó gyűjteményébe.

- **Hitelesítés**: Bearer token (kötelező)
- **Viselkedés**:
  - A könyv másolatát hozza létre `"(copy)"` utótaggal a névben
  - `is_public: false` beállítással
  - Az összes receptbejegyzést másolja
  - Saját könyvet nem lehet klónozni
- **Válasz (201)**: A klónozott receptkönyv.
- **Hibák**: `400` (saját könyv), `403`/`404` (nem nyilvános/nem található)

#### `GET /api/recipe-books/:bookId/recipes`

Receptek listázása egy receptkönyvben. Lapozható.

- **Hitelesítés**: Opcionális (privát könyvekhez tulajdonos/admin szükséges)
- **Lekérdezési paraméterek**: `page`, `limit`
- **Válasz (200)**: `{ "recipes": [...], "pagination": {...} }`

#### `POST /api/recipe-books/:bookId/recipes`

Recept(ek) hozzáadása egy receptkönyvhöz.

- **Hitelesítés**: Bearer token (tulajdonos vagy admin)
- **Kérés törzs**:
  ```json
  { "recipeId": 5 }
  ```
  vagy:
  ```json
  { "recipeIds": [5, 8, 12] }
  ```
- **Viselkedés**: A már meglévő bejegyzéseket elegánsan kihagyja (duplikátumoknál nincs hiba).
- **Válasz (200/201)**: Megerősítés a hozzáadott receptek számával.

#### `DELETE /api/recipe-books/:bookId/recipes/:recipeId`

Egy adott recept eltávolítása egy receptkönyvből.

- **Hitelesítés**: Bearer token (tulajdonos vagy admin)
- **Válasz (200)**: `{ "message": "Recipe removed from book." }`

---

### Jelentések

#### `POST /api/reports`

Jelentés beadása egy recept vagy hozzászólás ellen.

- **Hitelesítés**: Bearer token (kötelező)
- **Kérés törzs**:
  ```json
  {
    "target_type": "recipe",
    "target_id": 5,
    "reason": "Contains inappropriate content"
  }
  ```
- **Validáció**:
  - A `target_type` értéke `"recipe"` vagy `"comment"` kell legyen
  - A `target_id`-nak egy létező, nem törölt receptre vagy hozzászólásra kell hivatkoznia
  - A `reason` kötelező
- **Válasz (201)**: A létrehozott jelentés.

#### `GET /api/reports`

A hitelesített felhasználó saját jelentéseinek listázása lapozással.

- **Hitelesítés**: Bearer token (kötelező)
- **Lekérdezési paraméterek**: `page`, `limit`
- **Válasz (200)**: `{ "reports": [...], "pagination": {...} }`

---

### Admin

Minden admin végpont `role: "admin"` jogosultságot igényel. Nem admin felhasználók `403 Forbidden` választ kapnak.

#### `GET /api/admin/users`

Összes felhasználó listázása szűréssel és lapozással.

- **Hitelesítés**: Csak admin
- **Lekérdezési paraméterek**:
  | Paraméter | Leírás |
  |-----------|--------|
  | `query` | Szűrés felhasználónév vagy e-mail alapján (kis-nagybetű érzéketlen) |
  | `role` | Szűrés szerep alapján: `"user"` vagy `"admin"` |
  | `is_active` | Szűrés státusz alapján: `"true"` vagy `"false"` |
  | `page` | Oldalszám |
  | `limit` | Elemek oldalanként |
- **Válasz (200)**: `{ "users": [...], "pagination": {...} }`

#### `PATCH /api/admin/users/:userId`

Felhasználó szerepkörének és/vagy aktív státuszának frissítése.

- **Hitelesítés**: Csak admin
- **Kérés törzs** (részleges):
  ```json
  { "role": "admin", "is_active": true }
  ```
- **Validáció**:
  - A `role` értéke `"user"` vagy `"admin"` kell legyen (ha meg van adva)
  - Saját admin fiókot nem lehet deaktiválni
- **Válasz (200)**: A frissített felhasználó.
- **Hibák**: `400` (saját deaktiválás, érvénytelen szerepkör)

---

#### `GET /api/admin/reports`

Összes jelentés listázása szűréssel és lapozással.

- **Hitelesítés**: Csak admin
- **Lekérdezési paraméterek**:
  | Paraméter | Leírás |
  |-----------|--------|
  | `status` | `"pending"`, `"accepted"` vagy `"rejected"` |
  | `target_type` | `"recipe"` vagy `"comment"` |
  | `reported_by` | Szűrés a bejelentő felhasználó azonosítója alapján |
  | `page` | Oldalszám |
  | `limit` | Elemek oldalanként |
- **Válasz (200)**:
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

Egy jelentés lekérése teljes részletekkel.

- **Hitelesítés**: Csak admin
- **Válasz (200)**: `{ "report": { ... } }` a bejelentő és elbíráló adataival.

#### `PATCH /api/admin/reports/:reportId`

Egy jelentés státuszának frissítése.

- **Hitelesítés**: Csak admin
- **Kérés törzs**:
  ```json
  { "status": "accepted" }
  ```
  Érvényes státuszok: `"pending"`, `"accepted"`, `"rejected"`.
- **Viselkedés**: A `reviewed_by` mezőt az admin felhasználó azonosítójára, a `reviewed_at` mezőt az aktuális időbélyegre állítja.
- **Válasz (200)**: A frissített jelentés.

#### `POST /api/admin/reports/:reportId/actions`

Adminisztrációs művelet végrehajtása egy jelentés alapján.

- **Hitelesítés**: Csak admin
- **Kérés törzs**:
  ```json
  { "action": "delete_target" }
  ```
  Elérhető műveletek:
  | Művelet | Hatás |
  |---------|-------|
  | `delete_target` | A bejelentett recept vagy hozzászólás lágy törlése (`is_deleted: true` beállítása) |
  | `warn_user` | Helyőrző — naplózza a műveletet, de nem hajt végre pusztító műveletet |

- **Viselkedés**: A jelentés státuszát automatikusan `"accepted"` értékre állítja.
- **Válasz (200)**: Megerősítés a végrehajtott művelettel.

---

#### `DELETE /api/admin/comments/:commentId/hard`

Hozzászólás végleges törlése az adatbázisból.

- **Hitelesítés**: Csak admin
- **Válasz (200)**:
  ```json
  { "message": "Comment permanently deleted." }
  ```
- **Megjegyzés**: Ez az egyetlen végpont, amely véglegesen eltávolít adatot. Óvatosan használandó.

---

### Feltöltések

#### `POST /api/uploads`

Általános képfeltöltés a Cloudinary-ra.

- **Hitelesítés**: Bearer token (kötelező)
- **Content-Type**: `multipart/form-data`
- **Űrlap mezők**:
  | Mező | Típus | Kötelező | Leírás |
  |------|-------|----------|--------|
  | `file` | `File` | Igen | Feltöltendő képfájl |
  | `type` | `string` | Nem | `"recipe"` (alapértelmezett) vagy `"avatar"` |
- **Korlátozások**:
  - Maximális fájlméret: **5 MB**
  - Engedélyezett MIME típusok: `image/jpeg`, `image/png`, `image/webp`
- **Válasz (200)**:
  ```json
  {
    "url": "https://res.cloudinary.com/your-cloud/image/upload/v.../forkfeed/recipes/abc123.webp",
    "public_id": "forkfeed/recipes/abc123"
  }
  ```
- **Hibák**: `400` (hiányzó fájl, hibás típus, túl nagy)

---

### Keresés

#### `GET /api/search/suggestions`

Automatikus kiegészítési javaslatok visszaadása egy keresési lekérdezéshez.

- **Hitelesítés**: Nincs
- **Lekérdezési paraméterek**:
  | Paraméter | Leírás |
  |-----------|--------|
  | `q` | Keresési lekérdezés sztring |
- **Viselkedés**:
  - Üres tömböket ad vissza, ha a `q` üres vagy < 1 karakter
  - Típusonként legfeljebb **5 eredményt** keres (receptek, kategóriák, címkék)
  - Recept találatok: `title` alapján (kis-nagybetű érzéketlen tartalmazza), kizárja a lágy törölteket
  - Kategória találatok: `name` alapján
  - Címke találatok: `name` alapján
  - Mindhárom lekérdezés párhuzamosan fut (`Promise.all`)
- **Válasz (200)**:
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

Az érvényes nehézségi szintek listájának visszaadása.

- **Hitelesítés**: Nincs
- **Válasz (200)**:
  ```json
  { "difficulties": ["easy", "medium", "hard"] }
  ```

#### `GET /api/meta/roles`

A felhasználói szerepkörök listájának visszaadása.

- **Hitelesítés**: Csak admin
- **Válasz (200)**:
  ```json
  { "roles": ["user", "admin"] }
  ```

---

## Hibakezelés

### Szabványos hibaformátum

Minden hibaválasz ezt a formátumot követi:

```json
{ "error": "Ember által olvasható hibaüzenet." }
```

### Használt HTTP státuszkódok

| Kód | Jelentés | Mikor használatos |
|-----|----------|-------------------|
| `200` | OK | Sikeres GET, PATCH, DELETE vagy megerősített művelet |
| `201` | Létrehozva | Sikeres POST (erőforrás létrehozva) |
| `400` | Hibás kérés | Érvénytelen JSON, hiányzó kötelező mezők, validációs hiba |
| `401` | Jogosulatlan | Hiányzó/érvénytelen/lejárt/tiltólistázott token |
| `403` | Tiltott | Hitelesített, de elégtelen jogosultság (nem tulajdonos/admin) |
| `404` | Nem található | Az erőforrás nem létezik vagy lágy törölve van |
| `409` | Ütközés | Duplikált erőforrás (felhasználónév, e-mail, kategórianév, már kedvencelt) |
| `500` | Belső szerverhiba | Váratlan szerveroldali hiba (try/catch blokkok által elkapva) |
| `503` | Szolgáltatás nem elérhető | Adatbázis nem elérhető (állapotjelző ellenőrzés) |

### JSON feldolgozási hibák

Minden POST/PATCH/PUT végpont a `request.json()` hívást try/catch blokkba csomagolja, hogy tiszta `400` hibát adjon vissza, ha a kérés törzse nem érvényes JSON:

```json
{ "error": "Invalid JSON payload." }
```

### Lapozási objektum

Minden lapozott válasz tartalmazza:

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

## Végpont összefoglaló táblázat

| # | Metódus | Végpont | Hitelesítés | Leírás |
|---|---------|---------|-------------|--------|
| 1 | `POST` | `/api/auth/register` | Nincs | Új felhasználó regisztrálása |
| 2 | `POST` | `/api/auth/login` | Nincs | Bejelentkezés |
| 3 | `POST` | `/api/auth/logout` | Bearer | Kijelentkezés (token tiltólistázás) |
| 4 | `GET` | `/api/auth/me` | Bearer | Saját profil lekérése |
| 5 | `POST` | `/api/auth/change-password` | Bearer | Jelszó megváltoztatása |
| 6 | `POST` | `/api/auth/forgot-password` | Nincs | Jelszó-visszaállító e-mail kérése |
| 7 | `POST` | `/api/auth/reset-password` | Nincs | Jelszó visszaállítása tokennel |
| 8 | `GET` | `/api/recipes` | Opcionális | Receptek listázása (szűrés, rendezés, lapozás) |
| 9 | `POST` | `/api/recipes` | Bearer | Recept létrehozása |
| 10 | `GET` | `/api/recipes/:id` | Opcionális | Recept részleteinek lekérése |
| 11 | `PATCH` | `/api/recipes/:id` | Tulajdonos/Admin | Recept frissítése |
| 12 | `DELETE` | `/api/recipes/:id` | Tulajdonos/Admin | Recept lágy törlése |
| 13 | `GET` | `/api/recipes/:id/summary` | Nincs | Recept összefoglaló lekérése |
| 14 | `GET` | `/api/recipes/:id/ratings` | Nincs | Recept értékeléseinek listázása |
| 15 | `GET` | `/api/recipes/:id/ratings/me` | Bearer | Saját értékelés lekérése |
| 16 | `PUT` | `/api/recipes/:id/ratings/me` | Bearer | Saját értékelés létrehozása/frissítése |
| 17 | `DELETE` | `/api/recipes/:id/ratings/me` | Bearer | Saját értékelés eltávolítása |
| 18 | `GET` | `/api/recipes/:id/comments` | Nincs | Recept hozzászólásainak listázása |
| 19 | `POST` | `/api/recipes/:id/comments` | Bearer | Hozzászólás hozzáadása |
| 20 | `GET` | `/api/recipes/:id/steps` | Nincs | Recept lépéseinek listázása |
| 21 | `POST` | `/api/recipes/:id/steps` | Tulajdonos/Admin | Lépés hozzáadása |
| 22 | `PUT` | `/api/recipes/:id/steps/reorder` | Tulajdonos/Admin | Lépések átrendezése |
| 23 | `PATCH` | `/api/recipes/:id/steps/:stepId` | Tulajdonos/Admin | Lépés frissítése |
| 24 | `DELETE` | `/api/recipes/:id/steps/:stepId` | Tulajdonos/Admin | Lépés törlése |
| 25 | `GET` | `/api/recipes/:id/ingredients` | Nincs | Hozzávalók listázása |
| 26 | `POST` | `/api/recipes/:id/ingredients` | Tulajdonos/Admin | Hozzávaló hozzáadása |
| 27 | `PATCH` | `/api/recipes/:id/ingredients/:iid` | Tulajdonos/Admin | Hozzávaló frissítése |
| 28 | `DELETE` | `/api/recipes/:id/ingredients/:iid` | Tulajdonos/Admin | Hozzávaló törlése |
| 29 | `PUT` | `/api/recipes/:id/categories` | Tulajdonos/Admin | Recept kategóriák lecserélése |
| 30 | `PUT` | `/api/recipes/:id/tags` | Tulajdonos/Admin | Recept címkék lecserélése |
| 31 | `GET` | `/api/recipes/:id/favorite` | Bearer | Kedvenc ellenőrzése |
| 32 | `POST` | `/api/recipes/:id/favorite` | Bearer | Kedvencekhez adás |
| 33 | `DELETE` | `/api/recipes/:id/favorite` | Bearer | Kedvencekből eltávolítás |
| 34 | `POST` | `/api/recipes/:id/image` | Tulajdonos/Admin | Recept kép feltöltése |
| 35 | `GET` | `/api/categories` | Nincs | Kategóriák listázása |
| 36 | `POST` | `/api/categories` | Admin | Kategória létrehozása |
| 37 | `GET` | `/api/categories/:id` | Nincs | Kategória lekérése |
| 38 | `PATCH` | `/api/categories/:id` | Admin | Kategória frissítése |
| 39 | `DELETE` | `/api/categories/:id` | Admin | Kategória törlése |
| 40 | `GET` | `/api/tags` | Nincs | Címkék listázása |
| 41 | `POST` | `/api/tags` | Admin | Címke létrehozása |
| 42 | `GET` | `/api/tags/:id` | Nincs | Címke lekérése |
| 43 | `PATCH` | `/api/tags/:id` | Admin | Címke frissítése |
| 44 | `DELETE` | `/api/tags/:id` | Admin | Címke törlése |
| 45 | `PATCH` | `/api/comments/:id` | Tulajdonos/Admin | Hozzászólás szerkesztése |
| 46 | `DELETE` | `/api/comments/:id` | Tulajdonos/Admin | Hozzászólás lágy törlése |
| 47 | `GET` | `/api/users/:id` | Nincs | Nyilvános profil lekérése |
| 48 | `GET` | `/api/users/:id/stats` | Nincs | Felhasználói statisztikák lekérése |
| 49 | `GET` | `/api/users/:id/recipes` | Nincs | Felhasználó receptjeinek listázása |
| 50 | `GET` | `/api/users/:id/recipe-books` | Nincs | Felhasználó nyilvános könyveinek listázása |
| 51 | `GET` | `/api/users/:id/ratings` | Nincs | Felhasználó értékeléseinek listázása |
| 52 | `GET` | `/api/users/:id/comments` | Nincs | Felhasználó hozzászólásainak listázása |
| 53 | `GET` | `/api/users/me` | Bearer | Saját profil lekérése |
| 54 | `PATCH` | `/api/users/me` | Bearer | Saját profil frissítése |
| 55 | `GET` | `/api/users/me/stats` | Bearer | Saját statisztikák lekérése (részletes) |
| 56 | `GET` | `/api/users/me/favorites` | Bearer | Saját kedvencek listázása |
| 57 | `PATCH` | `/api/users/me/deactivate` | Bearer | Saját fiók deaktiválása |
| 58 | `GET` | `/api/recipe-books` | Opcionális | Receptkönyvek listázása |
| 59 | `POST` | `/api/recipe-books` | Bearer | Receptkönyv létrehozása |
| 60 | `GET` | `/api/recipe-books/:id` | Opcionális | Receptkönyv lekérése |
| 61 | `PATCH` | `/api/recipe-books/:id` | Tulajdonos/Admin | Receptkönyv frissítése |
| 62 | `DELETE` | `/api/recipe-books/:id` | Tulajdonos/Admin | Receptkönyv törlése |
| 63 | `POST` | `/api/recipe-books/:id/clone` | Bearer | Nyilvános könyv klónozása |
| 64 | `GET` | `/api/recipe-books/:id/recipes` | Opcionális | Könyv receptjeinek listázása |
| 65 | `POST` | `/api/recipe-books/:id/recipes` | Tulajdonos/Admin | Recept(ek) hozzáadása könyvhöz |
| 66 | `DELETE` | `/api/recipe-books/:id/recipes/:rid` | Tulajdonos/Admin | Recept eltávolítása könyvből |
| 67 | `POST` | `/api/reports` | Bearer | Jelentés beadása |
| 68 | `GET` | `/api/reports` | Bearer | Saját jelentések listázása |
| 69 | `GET` | `/api/admin/users` | Admin | Összes felhasználó listázása |
| 70 | `PATCH` | `/api/admin/users/:id` | Admin | Felhasználó szerep/státusz frissítése |
| 71 | `GET` | `/api/admin/reports` | Admin | Összes jelentés listázása |
| 72 | `GET` | `/api/admin/reports/:id` | Admin | Jelentés részleteinek lekérése |
| 73 | `PATCH` | `/api/admin/reports/:id` | Admin | Jelentés státuszának frissítése |
| 74 | `POST` | `/api/admin/reports/:id/actions` | Admin | Moderációs művelet végrehajtása |
| 75 | `DELETE` | `/api/admin/comments/:id/hard` | Admin | Hozzászólás végleges törlése |
| 76 | `POST` | `/api/uploads` | Bearer | Kép feltöltése Cloudinary-ra |
| 77 | `GET` | `/api/health` | Nincs | Állapotjelző ellenőrzés |
| 78 | `GET` | `/api/meta/difficulties` | Nincs | Nehézségi szintek listázása |
| 79 | `GET` | `/api/meta/roles` | Admin | Felhasználói szerepkörök listázása |
| 80 | `GET` | `/api/search/suggestions` | Nincs | Automatikus kiegészítési javaslatok |
