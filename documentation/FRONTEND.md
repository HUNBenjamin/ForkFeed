# ForkFeed — Frontend dokumentáció

Ez a dokumentum átfogó referenciát nyújt a ForkFeed frontend alkalmazáshoz, beleértve az architektúrát, oldalstruktúrát, komponenseket, navigációt, témakezelést és felhasználói interakciókat.

---

## Tartalomjegyzék

- [Architektúra áttekintés](#architektúra-áttekintés)
- [Technológiai stack](#technológiai-stack)
- [Projekt struktúra](#projekt-struktúra)
- [Globális elrendezés és témakezelés](#globális-elrendezés-és-témakezelés)
- [Navigáció](#navigáció)
- [Hitelesítési folyamat](#hitelesítési-folyamat)
- [Oldalak](#oldalak)
  - [Főoldal / Receptfolyam](#főoldal--receptfolyam)
  - [Bejelentkezés](#bejelentkezés)
  - [Regisztráció](#regisztráció)
  - [Jelszó-visszaállítás](#jelszó-visszaállítás)
  - [Recept részletek](#recept-részletek)
  - [Új recept](#új-recept)
  - [Profil](#profil)
  - [Receptjeim](#receptjeim)
  - [Recept szerkesztése](#recept-szerkesztése)
  - [Kedvencek](#kedvencek)
  - [Receptkönyvek](#receptkönyvek)
  - [Receptkönyv részletek](#receptkönyv-részletek)
  - [Hozzászólásaim](#hozzászólásaim)
  - [Értékeléseim](#értékeléseim)
  - [Nyilvános felhasználói profil](#nyilvános-felhasználói-profil)
- [Megosztott komponensek](#megosztott-komponensek)
- [Képfeltöltési rendszer](#képfeltöltési-rendszer)
- [Hozzászólás rendszer](#hozzászólás-rendszer)
- [Receptkönyvek és mentési folyamat](#receptkönyvek-és-mentési-folyamat)
- [Jelentési rendszer](#jelentési-rendszer)
- [Reszponzív dizájn](#reszponzív-dizájn)
- [API végpont referencia](#api-végpont-referencia)

---

## Architektúra áttekintés

A ForkFeed frontend egy **Next.js 16 App Router** alkalmazás. Minden felhasználó által látható oldal az `app/pages/` könyvtár alatt található, és a `"use client"` direktívát használja — az alkalmazás túlnyomórészt **kliensoldali renderelést** használ `useEffect` és `fetch()` alapú adatlekéréssel.

### Fő tervezési döntések

- **Nincs globális állapotkezelő könyvtár** — Minden oldal a saját állapotát kezeli a React `useState` és `useEffect` hookjaival. Nincs context provider, Redux store vagy hasonló.
- **JWT a localStorage-ban** — A hitelesítési tokenek a `localStorage`-ban vannak tárolva, és `Authorization: Bearer <token>` fejlécként kerülnek elküldésre. Nincsenek HTTP-only cookie-k.
- **Magyar felhasználói felület** — Minden felhasználónak szóló szöveg (címkék, gombok, hibaüzenetek, helyőrzők) magyarul van. A `<html>` elem `lang="hu"` attribútummal rendelkezik.
- **Oldalszintű adatlekérés** — Minden oldal függetlenül lekéri a szükséges adatokat betöltéskor. Nincs megosztott adatgyorsítótár vagy SWR/React Query réteg.
- **Komponens kolokáció** — Az oldalspecifikus komponensek `components/` alkönyvtárakban helyezkednek el a szülő oldaluk mellett. Csak a valóban megosztott komponensek vannak az `app/components/` mappában.

### Renderelési minta

```
app/layout.tsx          → Gyökér HTML keret (szerver-renderelt)
  └── app/page.tsx      → Átirányítás a /pages/main oldalra
  └── app/pages/
       ├── main/        → Kliens komponens (useEffect + fetch)
       ├── login/       → Kliens komponens
       ├── profile/     → Kliens komponens (hitelesítés-védett)
       ├── admin/       → Kliens komponens (admin-védett, saját elrendezés)
       └── ...
```

---

## Technológiai stack

| Komponens | Technológia | Cél |
|-----------|-------------|-----|
| Keretrendszer | Next.js 16 (App Router) | Útvonalkezelés, SSR keret, API útvonalak |
| Nyelv | TypeScript 5 | Típusbiztos fejlesztés |
| UI könyvtár | React 19 | Komponens architektúra |
| CSS keretrendszer | Tailwind CSS 4 | Utility-first stílus |
| Komponens könyvtár | DaisyUI 5 | Előre elkészített UI komponensek (kártyák, modálok, jelvények stb.) |
| Témakezelés | DaisyUI témák | Világos/sötét mód `data-theme` attribútummal |
| Ikonok | Heroicons (inline SVG) | Minden ikon inline SVG path-ként van beágyazva |
| Képvágás | Egyéni canvas-alapú | Beépített `ImageCropModal` komponens |

---

## Projekt struktúra

```
app/
├── layout.tsx                    # Gyökér elrendezés: <html lang="hu">, betűtípus, globals.css
├── page.tsx                      # Átirányítás → /pages/main
├── globals.css                   # Tailwind importok, DaisyUI konfiguráció, egyéni animációk
│
├── components/                   # Megosztott komponensek
│   ├── Pagination.tsx            # Újrafelhasználható lapozó vezérlő
│   ├── ReportModal.tsx           # Tartalom/felhasználó jelentő modál
│   ├── ImageUpload.tsx           # Képfeltöltés vágás támogatással
│   └── ImageCropModal.tsx        # Canvas-alapú képvágás
│
└── pages/
    ├── main/                     # Főoldal + receptfolyam
    │   ├── page.tsx
    │   └── components/
    │       ├── Navbar.tsx         # Globális navigációs sáv
    │       ├── ThemeToggle.tsx    # Világos/sötét mód kapcsoló
    │       ├── RecipeList.tsx     # Receptböngésző szűrőkkel
    │       ├── RecipeCard.tsx     # Receptkártya a folyamban
    │       └── NewRecipeButton.tsx
    │
    ├── login/                    # Bejelentkezés oldal
    │   ├── page.tsx
    │   ├── layout.tsx            # Hitelesítési elrendezés burkoló
    │   └── components/
    │       ├── AuthLayout.tsx
    │       ├── LoginForm.tsx
    │       └── Input.tsx
    │
    ├── register/                 # Regisztrációs oldal
    │   ├── page.tsx
    │   ├── layout.tsx
    │   └── components/
    │       ├── AuthLayout.tsx
    │       ├── RegisterForm.tsx
    │       └── Input.tsx
    │
    ├── reset-password/           # Jelszó-visszaállítás oldal
    │   ├── page.tsx
    │   └── components/
    │       └── ResetPasswordForm.tsx
    │
    ├── recipe/
    │   ├── [recipeId]/           # Recept részletek oldal
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
    │   └── new/                  # Új recept oldal
    │       └── page.tsx
    │
    ├── profile/                  # Hitelesített felhasználó profilterülete
    │   ├── page.tsx              # Profil áttekintés
    │   ├── components/
    │   │   ├── ProfileTabs.tsx   # Füles navigáció (6 fül)
    │   │   ├── ProfileCard.tsx
    │   │   ├── StatsCard.tsx
    │   │   ├── EditProfileModal.tsx
    │   │   └── DeactivateAccountModal.tsx
    │   ├── recipes/              # Receptjeim
    │   │   ├── page.tsx
    │   │   ├── components/
    │   │   │   └── MyRecipeCard.tsx
    │   │   └── [recipeId]/edit/  # Recept szerkesztő
    │   │       ├── page.tsx
    │   │       ├── types.ts
    │   │       └── components/
    │   │           ├── BasicFields.tsx
    │   │           ├── IngredientsEditor.tsx
    │   │           ├── StepsEditor.tsx
    │   │           └── TagCategoryPicker.tsx
    │   ├── favorites/            # Kedvenc receptek
    │   │   ├── page.tsx
    │   │   └── components/
    │   │       └── FavoriteRecipeCard.tsx
    │   ├── recipe-books/         # Receptkönyv gyűjtemények
    │   │   ├── page.tsx
    │   │   ├── components/
    │   │   │   ├── RecipeBookCard.tsx
    │   │   │   └── CreateBookModal.tsx
    │   │   └── [bookId]/         # Könyv részletek
    │   │       ├── page.tsx
    │   │       └── components/
    │   │           ├── BookRecipeCard.tsx
    │   │           └── EditBookModal.tsx
    │   ├── comments/             # Hozzászólásaim
    │   │   ├── page.tsx
    │   │   └── components/
    │   │       └── CommentedRecipeCard.tsx
    │   └── ratings/              # Értékeléseim
    │       ├── page.tsx
    │       └── components/
    │           └── RatedRecipeCard.tsx
    │
    ├── user/
    │   └── [userId]/             # Nyilvános felhasználói profil
    │       └── page.tsx
    │
    └── admin/                    # Admin panel (külön elrendezés)
        ├── layout.tsx            # Oldalsáv elrendezés + hitelesítési védelem
        ├── page.tsx              # Vezérlőpult áttekintés
        ├── reports/
        │   └── page.tsx          # Jelentéskezelés
        └── users/
            └── page.tsx          # Felhasználókezelés
```

---

## Globális elrendezés és témakezelés

### Gyökér elrendezés (`app/layout.tsx`)

A gyökér elrendezés rendereli a HTML keretet `lang="hu"` attribútummal, importálja a globális CSS-t és beállítja a metaadatokat:

```
Cím: "ForkFeed"
Leírás: "Receptmegosztó közösség"
```

### Témakezelés (`app/globals.css` + `ThemeToggle`)

A DaisyUI két témával van konfigurálva:

| Téma | Aktiválás |
|------|-----------|
| `light` | Alapértelmezett téma |
| `dark` | Alkalmazásra kerül, ha `prefers-color-scheme: dark` vagy manuálisan átváltva |

A `ThemeToggle` komponens:

- A `data-theme` attribútumot váltja a `<html>` elemen `light` és `dark` között
- A választást a `localStorage.theme`-ben tárolja
- Az első betöltéskor a rendszer preferenciáját veszi figyelembe (ha nincs tárolt beállítás)
- Nap ikont (világos mód) vagy hold ikont (sötét mód) jelenít meg

### Egyéni CSS animációk

| Animáció | Cél |
|----------|-----|
| `slideText` | Rendezési címke átmenet a receptlistában |
| `fadeIn` | Tooltip megjelenési effektus |
| `highlightComment` | Pulzáló fény effektus a felhasználó saját hozzászólásán |

---

## Navigáció

### Navigációs sáv (`app/pages/main/components/Navbar.tsx`)

A navigációs sáv az elsődleges navigációs komponens, amelyet minden oldalon használnak, kivéve az admin panelt (amelynek saját oldalsáv elrendezése van).

#### Asztali elrendezés

```
┌──────────────────────────────────────────────────────────────┐
│ 🍴 ForkFeed  │  Receptek  Kedvencek*  Receptkönyvek*  │  🌙  👤 ▾  │
└──────────────────────────────────────────────────────────────┘
                                                     * = csak hitelesített
```

- **Logó**: A `/pages/main` oldalra mutat
- **Navigációs linkek**: `Receptek`, `Kedvencek` (hitelesített), `Receptkönyvek` (hitelesített)
- **Aktív állapot**: Az aktuális oldal linkje `bg-primary/10 text-primary` stílussal kijelölve
- **Jobb oldal**: Téma kapcsoló + felhasználói legördülő (vagy bejelentkezés/regisztráció gombok)

#### Felhasználói legördülő menü

| Elem | Link | Feltétel |
|------|------|----------|
| Profilom | `/pages/profile` | Mindig |
| Receptjeim | `/pages/profile/recipes` | Mindig |
| Receptkönyvek | `/pages/profile/recipe-books` | Mindig |
| Admin panel | `/pages/admin` | Csak ha `role === "admin"` |
| Kijelentkezés | Kijelentkezés művelet | Mindig |

#### Mobil elrendezés

- Hamburger menü gomb + téma kapcsoló (jobbra igazítva `ml-auto` segítségével)
- Teljes képernyős legördülő az összes navigációs linkkel és felhasználói menüelemekkel
- Ugyanaz az aktív állapot kiemelés, mint az asztali változatban

---

## Hitelesítési folyamat

### Token kezelés

1. **Bejelentkezés** → `POST /api/auth/login` → JWT token fogadása → tárolás `localStorage("token")`-ben
2. **Minden hitelesített kérés** → token olvasása a `localStorage`-ből → küldés `Authorization: Bearer <token>` fejlécként
3. **Kijelentkezés** → `POST /api/auth/logout` (szerveroldali token tiltólistázás) → token eltávolítása a `localStorage`-ből
4. **Hitelesítés ellenőrzése** → `GET /api/auth/me` → felhasználói objektum vagy 401 visszaadása

### Oldalszintű hitelesítési védelem

| Minta | Megvalósítás |
|-------|-------------|
| **Kötelező hitelesítés** | `useEffect` ellenőrzi a `localStorage.token`-t, átirányít a `/pages/login` oldalra, ha hiányzik |
| **Opcionális hitelesítés** | `/api/auth/me` lekérése, extra funkciók megjelenítése ha hitelesített |
| **Admin védelem** | `/api/auth/me` lekérése, `role === "admin"` ellenőrzése, átirányítás ha nem admin |

### Jelszó-visszaállítási folyamat

1. A felhasználó az „Elfelejtett jelszó" linkre kattint a bejelentkezési oldalon
2. E-mail megadása → `POST /api/auth/forgot-password` → a szerver visszaállítási linkkel ellátott e-mailt küld
3. A felhasználó a linkre kattint → `/pages/reset-password?token=<token>`
4. Új jelszó megadása → `POST /api/auth/reset-password` → siker → automatikus átirányítás a bejelentkezésre (3 mp késleltetéssel)

---

## Oldalak

### Főoldal / Receptfolyam

**Útvonal**: `/pages/main`
**Hitelesítés**: Nyilvános

A kezdőoldal és az elsődleges receptfelfedezési felület.

#### Kiemelt szekció

- Emoji-díszítésű fejléc az alkalmazás nevével és szlogenjével
- „Recept feltöltése" CTA gomb (ha bejelentkezett, a `/pages/recipe/new` oldalra mutat, egyébként tooltip jelenik meg)

#### Receptböngésző (`RecipeList`)

A receptlista egy összetett szűrő komponens, amely URL lekérdezési paraméterekkel szinkronizál.

**Keresés**:

- Szöveges keresés recept cím (alapértelmezett) vagy szerző felhasználónév alapján (átkapcsolható)
- 400 ms-os debounce billentyűleütéskor
- Automatikus kiegészítési javaslatok a `/api/search/suggestions` végpontról

**Szűrők**:
| Szűrő | Típus | Interakció |
|-------|-------|-----------|
| Nehézség | Egyszeres választás | `easy` / `medium` / `hard` |
| Kategóriák | Többszörös választás (3 állapotú) | Semleges → Belefoglalás → Kizárás → Semleges |
| Címkék | Többszörös választás (3 állapotú) | Ugyanaz, mint a kategóriáknál |
| Hozzávalók | Belefoglalás/Kizárás szöveges lista | Vesszővel elválasztott hozzávaló nevek |

**Rendezés**:
| Rendezés | Lehetőségek |
|----------|-------------|
| Dátum | Legújabb először / Legrégebbi először |
| Értékelés | Legmagasabb először / Legalacsonyabb először |
| Elkészítési idő | Legrövidebb először / Leghosszabb először |

**URL szinkronizáció**: Az összes szűrő/rendezési állapot szinkronizálva van az URL lekérdezési paraméterekkel a `useSearchParams` segítségével, lehetővé téve a megosztható szűrt nézeteket.

#### Receptkártya (`RecipeCard`)

Minden recept megjeleníti:

- Színkódolt nehézségi csíkot (zöld = könnyű, sárga = közepes, piros = nehéz)
- Receptkép (vagy helyőrző)
- Cím, leírás (2 soros levágás)
- Nehézségi jelvény, elkészítési idő, csillagos értékelés
- Szerző avatárja és felhasználóneve (kattintható → felhasználói profil)

---

### Bejelentkezés

**Útvonal**: `/pages/login`
**Hitelesítés**: Nyilvános

- E-mail vagy felhasználónév + jelszó űrlap
- Kliensoldali validáció (kötelező mezők)
- Szerverhiba üzenetek magyarra fordítva
- Inline „Elfelejtett jelszó" folyamat e-mail megadással
- Sikeres bejelentkezés esetén: JWT tárolása → átirányítás a `/pages/main` oldalra

---

### Regisztráció

**Útvonal**: `/pages/register`
**Hitelesítés**: Nyilvános

- Felhasználónév (min. 3 karakter), e-mail (érvényes formátum), jelszó (min. 8 karakter)
- Kliensoldali validáció magyar hibaüzenetekkel
- Sikeres regisztráció esetén: átirányítás a `/pages/login` oldalra

---

### Jelszó-visszaállítás

**Útvonal**: `/pages/reset-password?token=<token>`
**Hitelesítés**: Token-alapú

- Új jelszó + megerősítés beviteli mezők
- Token jelenlétének ellenőrzése az URL-ből
- Megfelelő hibaüzenetek érvénytelen/lejárt tokenekhez
- Sikeres visszaállítás után 3 másodperces automatikus átirányítás a bejelentkezésre

---

### Recept részletek

**Útvonal**: `/pages/recipe/{recipeId}`
**Hitelesítés**: Opcionális (több funkció bejelentkezve)

Az alkalmazás legfunkciógazdagabb oldala.

#### Tartalom szekciók

| Szekció | Leírás |
|---------|--------|
| Kiemelt kép | Teljes szélességű receptkép gradiens átfedéssel |
| Jelvénysor | Nehézségi jelvény + kategória jelvények |
| Szerzői kártya | Avatár, felhasználónév (link), létrehozási/frissítési dátumok |
| Leírás | Recept leírás szövege |
| Hozzávalók | Felsorolás mennyiségekkel és mértékegységekkel |
| Lépések | Számozott elkészítési lépések |
| Címkék | Címke jelvények az oldal alján |

#### Interaktív funkciók (hitelesített felhasználóknak)

| Funkció | Komponens | Leírás |
|---------|-----------|--------|
| Kedvenc | Szív kapcsoló | `POST`/`DELETE /api/recipes/{id}/favorite` |
| Mentés könyvbe | `SaveToBookButton` | Modál a recept hozzáadásához egy receptkönyvhöz (inline könyv létrehozással) |
| Értékelés | `StarRating` | 1-5 csillagos értékelés hover előnézettel, kattintással beállítás, törlési lehetőség |
| Hozzászólás | `CommentSection` | Teljes hozzászólás CRUD (lásd [Hozzászólás rendszer](#hozzászólás-rendszer)) |
| Jelentés | `ReportModal` | Recept jelentése moderálásra |
| Megosztás | `ShareButton` | Recept URL másolása vágólapra |
| Nyomtatás | `PrintButton` | Nyomtatásra kész HTML generálása és böngésző nyomtatás indítása |

#### Admin funkciók

- **Recept törlése** gomb (piros, megerősítő párbeszédablakkal)

#### Szekció navigáció (`SectionNav`)

Gyors ugrás gombok, amelyek simán görgetnek az egyes szekciókhoz (hozzávalók, lépések, hozzászólások).

#### Görgetés felfelé (`ScrollToTop`)

Lebegő nyíl gomb, amely 400px görgetés után jelenik meg.

---

### Új recept

**Útvonal**: `/pages/recipe/new`
**Hitelesítés**: Kötelező

Teljes recept létrehozási űrlap, amely ugyanazokat a szerkesztő komponenseket használja, mint a szerkesztés oldal.

**Űrlap mezők**:
| Mező | Komponens | Kötelező |
|------|-----------|----------|
| Cím | `BasicFields` | Igen |
| Leírás | `BasicFields` | Nem |
| Elkészítési idő | `BasicFields` | Igen (pozitív egész szám) |
| Nehézség | `BasicFields` | Igen (easy/medium/hard) |
| Kép | `ImageUpload` | Nem |
| Hozzávalók | `IngredientsEditor` | Nem |
| Lépések | `StepsEditor` | Nem |
| Kategóriák | `TagCategoryPicker` | Nem |
| Címkék | `TagCategoryPicker` | Nem |

Sikeres mentés esetén: átirányítás az újonnan létrehozott recept részletoldalára.

---

### Profil

**Útvonal**: `/pages/profile`
**Hitelesítés**: Kötelező

#### Profilkártya

Avatárt (feltöltött kép vagy kezdőbetű), felhasználónevet, e-mailt, szerep jelvényt, bemutatkozást és regisztráció dátumát jeleníti meg.

#### Statisztikák kártya

| Statisztika | Leírás | Kattintható |
|-------------|--------|-------------|
| Receptek | Összes létrehozott recept | Igen → `/pages/profile/recipes` |
| Hozzászólások | Összes hozzászólás | Igen → `/pages/profile/comments` |
| Értékelések | Adott értékelések | Igen → `/pages/profile/ratings` |
| Kedvencek | Mentett kedvencek | Igen → `/pages/profile/favorites` |
| Receptkönyvek | Létrehozott gyűjtemények | Igen → `/pages/profile/recipe-books` |
| Átl. értékelés | Kapott átlagos értékelés | Nem |

#### Profil szerkesztése modál

Felhasználónév, bemutatkozás és profilkép frissítése (vágás támogatással).

#### Fiók deaktiválása

„Fiók deaktiválása" gomb az oldal alján → modál megnyitása:

- Figyelmeztető értesítés a következményekről
- Jelszó megerősítés mező
- Fiók deaktiválása → token törlése → átirányítás a bejelentkezésre
- Csak admin által visszafordítható

#### Profil fülek

Vízszintes fülsor, amely minden profil aloldalon megjelenik 6 füllel:

```
┌───────────────────────────────────────────────────────────────┐
│  Profil  │  Receptjeim  │  Kedvencek  │  Receptkönyvek  │  Kommentek  │  Értékelések  │
└───────────────────────────────────────────────────────────────┘
```

Az aktív fül az aktuális `pathname` alapján van kiemelve.

---

### Receptjeim

**Útvonal**: `/pages/profile/recipes`
**Hitelesítés**: Kötelező

- A felhasználó saját receptjeinek rácsa (asztalon 3 oszlop)
- Minden kártya megjeleníti: kép, cím, nehézség, leírás, elkészítési idő, értékelés, létrehozási dátum
- **Szerkesztés** gomb → navigáció a `/pages/profile/recipes/{id}/edit` oldalra
- **Törlés** gomb → megerősítő párbeszédablak → `DELETE /api/recipes/{id}`
- Lapozás

---

### Recept szerkesztése

**Útvonal**: `/pages/profile/recipes/{recipeId}/edit`
**Hitelesítés**: Kötelező (recept tulajdonosnak kell lennie)

Ugyanaz a szerkesztő felület, mint az új recept oldalon, a meglévő adatokkal előre kitöltve. Megosztott komponenseket használ:

| Komponens | Cél |
|-----------|-----|
| `BasicFields` | Cím, leírás, elkészítési idő, nehézség választó |
| `IngredientsEditor` | Dinamikus hozzávalólista (hozzáadás/eltávolítás/átrendezés) |
| `StepsEditor` | Rendezett lépéslista (hozzáadás/eltávolítás/átrendezés) |
| `TagCategoryPicker` | Többszörös választás az elérhető kategóriák és címkék közül |
| `ImageUpload` | Képfeltöltés vágással (mentésig késleltetett) |

---

### Kedvencek

**Útvonal**: `/pages/profile/favorites`
**Hitelesítés**: Kötelező

- Kedvencelt receptek listája képpel, szerző avatárjával, „kedvencnek jelölve" időbélyeggel
- Kedvencekből eltávolítás gomb kártyánként
- Lapozás

---

### Receptkönyvek

**Útvonal**: `/pages/profile/recipe-books`
**Hitelesítés**: Kötelező

- A felhasználó receptkönyv gyűjteményeinek listája
- Minden kártya: név, leírás, nyilvános/privát jelvény, receptszám
- **Létrehozás** gomb → modál névvel (kötelező), leírással, nyilvános kapcsolóval
- **Törlés** gomb → megerősítő párbeszédablak
- Lapozás

---

### Receptkönyv részletek

**Útvonal**: `/pages/profile/recipe-books/{bookId}`
**Hitelesítés**: Opcionális (tulajdonos-tudatos)

#### Egymásra rakott kártya elrendezés

A receptek függőlegesen egymásra rakott elrendezésben jelennek meg, ahol a kártyák átfedik egymást:

- A kártyák negatív margót (`-10rem`) használnak az egymásra rakódáshoz
- Csak a felső rész (cím, nehézség, elkészítési idő) látszik ki a felette lévő kártya alól
- **Hover** kibővíti a kurzor alatti kártyát — az alatta lévő kártya lecsúszik a teljes tartalom megjelenítéséhez
- **Kattintás** a recept részletoldalra navigál
- A kártyák teljes szélességű háttérképeket tartalmaznak gradiens átfedéssel

#### Kártya tartalom

Minden `BookRecipeCard` megjeleníti:

- Háttérkép sötét gradiens átfedéssel
- Cím, nehézségi jelvény, elkészítési idő, értékelés (felső terület — mindig látható)
- Hozzávaló jelvények (legfeljebb 8, „+N" túlcsordulás jelzővel)
- Szerző avatárja és felhasználóneve
- Eltávolítás gomb (csak tulajdonos, hover-re jelenik meg)

#### Tulajdonos vs. Látogató

| Funkció | Tulajdonos | Látogató |
|---------|-----------|----------|
| Könyv szerkesztése | ✅ | ❌ |
| Receptek eltávolítása | ✅ | ❌ |
| Vissza link | → Receptkönyvek lista | → Tulajdonos profilja |
| Tulajdonos info | Rejtett | Megjelenítve (avatár + felhasználónév) |

---

### Hozzászólásaim

**Útvonal**: `/pages/profile/comments`
**Hitelesítés**: Kötelező

- Azon receptek listázása, amelyekhez a felhasználó hozzászólt
- Kártyára kattintás navigáció: `/pages/recipe/{id}#my-comment` (automatikusan a hozzászólásukhoz görget)
- Lapozás

---

### Értékeléseim

**Útvonal**: `/pages/profile/ratings`
**Hitelesítés**: Kötelező

- A felhasználó által értékelt receptek listázása
- A felhasználó értékelése a recept átlagos értékelése mellett megjelenítve
- Lapozás

---

### Nyilvános felhasználói profil

**Útvonal**: `/pages/user/{userId}`
**Hitelesítés**: Opcionális

- Profil fejléc: avatár, felhasználónév, bemutatkozás, regisztráció dátuma
- Statisztikák: receptszám, receptkönyvek száma, átlagos értékelés
- Két fül: **Receptek** és **Receptkönyvek** (csak nyilvánosak)
- Felhasználó jelentése gomb (bejelentkezett felhasználóknak látható, saját profilra rejtett)
- Lapozott tartalom mindkét fülön

---

## Megosztott komponensek

### Lapozó (`app/components/Pagination.tsx`)

Újrafelhasználható lapozó vezérlő, amelyet minden listázó oldalon használnak.

- „Előző" / „Következő" gombok
- Okos oldalszám megjelenítés ellipszissel nagy oldalszámok esetén
- Aktív oldal kiemelve
- Propok: `page`, `totalPages`, `onPageChange`

### Jelentés modál (`app/components/ReportModal.tsx`)

Univerzális jelentési modál receptekhez, hozzászólásokhoz és felhasználókhoz.

- Szövegterület az indokláshoz (max. 500 karakter)
- Beküldés a `POST /api/reports` végpontra
- Sikeres beküldés után visszaigazolás megjelenítése
- Propok: `open`, `onClose`, `targetType`, `targetId`, `targetLabel`

### Képfeltöltés (`app/components/ImageUpload.tsx`)

Újrafelhasználható képfeltöltő komponens integrált vágással.

- Két módot támogat: `"recipe"` (16:9 képarány) és `"avatar"` (1:1)
- Fájl validáció: csak JPEG, PNG vagy WEBP, max. 5 MB
- **Késleltetett feltöltési minta** — a komponens imperatív `upload()` metódust tesz elérhetővé `ref`-en keresztül. A tényleges feltöltés a szerverre csak akkor történik meg, amikor a szülő űrlap mentésre kerül.
- `ImageCropModal` integráció az interaktív vágáshoz

### Képvágó modál (`app/components/ImageCropModal.tsx`)

Canvas-alapú képvágó felület.

- Húzható vágókeret sarok átméretező fogantyúkkal
- Rögzített képarány (16:9 vagy 1:1 a módtól függően)
- A vágott képet JPEG blob-ként adja ki
- A vágási eredmény interaktív előnézete

---

## Képfeltöltési rendszer

A képfeltöltési folyamat késleltetett mintát követ:

```
1. A felhasználó kiválasztja a fájlt
2. Az ImageCropModal megnyílik → a felhasználó megvágja a képet
3. A vágott kép lokálisan a komponens állapotában tárolódik (Blob-ként)
4. A felhasználó kitölti az űrlap többi részét
5. A felhasználó a „Mentés"-re kattint
6. A szülő meghívja a ref.upload()-ot → POST /api/uploads (multipart/form-data)
7. A szerver feltölti a Cloudinary-ra → URL-t ad vissza
8. A szülő belefoglalja az URL-t a fő mentési kérésbe (recept/profil)
```

Ez biztosítja, hogy a képek csak akkor kerüljenek feltöltésre, amikor a felhasználó elkötelezi magát a mentés mellett, elkerülve az árva feltöltéseket.

---

## Hozzászólás rendszer

### Architektúra

A hozzászólás rendszer több komponensből épül fel, amelyek az `app/pages/recipe/[recipeId]/components/comments/` könyvtárban találhatók:

| Komponens | Cél |
|-----------|-----|
| `CommentSection` | Konténer: hozzászólások betöltése, állapotkezelés, CRUD műveletek |
| `CommentForm` | Szövegterület + beküldés gomb új hozzászólásokhoz |
| `CommentCard` | Egyéni hozzászólás megjelenítés szerkesztés/törlés/jelentés műveletekkel |
| `CommentPagination` | Hozzászólás-specifikus lapozás |
| `commentTypes.ts` | Megosztott TypeScript típusok és segédfüggvények |

### Funkciók

- **Felhasználónként egy hozzászólás** — ha a felhasználó már hozzászólt, az űrlap egy tájékoztató üzenetet jelenít meg helyette
- **Helyben szerkesztés** — a szerkesztésre kattintás szerkeszthető szövegterületté alakítja a hozzászólást
- **Lágy törlés** — a törölt hozzászólások `is_deleted` jelzőt kapnak, de adminok számára láthatók maradnak
- **Automatikus görgetés** — a `#my-comment` hash-sel navigálva automatikusan a felhasználó hozzászólásához görget és kiemeli azt
- **Kiemelés animáció** — a felhasználó saját hozzászólása pulzáló fény effektust kap a `highlightComment` CSS animáción keresztül
- **Jelentés** — minden hozzászóláshoz tartozik egy jelentés gomb, amely a `ReportModal`-t nyitja meg
- **Rendezés** — a hozzászólások legújabb-először sorrendben töltődnek be (`order=desc`)

---

## Receptkönyvek és mentési folyamat

### YouTube-stílusú inline létrehozás

A `SaveToBookButton` a recept részletoldalon YouTube lejátszási lista stílusú mentési élményt biztosít:

1. A mentés gombra kattintás → modál megnyílik a felhasználó receptkönyveinek listájával
2. „Hozzáadás" kattintás bármely könyv mellett → a recept hozzáadódik
3. „+ Új receptkönyv létrehozása" kattintás → inline űrlap jelenik meg (nincs oldal navigáció)
4. Név kitöltése, nyilvános/privát kapcsoló → „Létrehozás és mentés"
5. Az új könyv létrejön ÉS a recept mentésre kerül egyetlen folyamatban

### Könyv láthatóság

| Típus | Látható |
|-------|---------|
| Nyilvános (`is_public: true`) | Mindenki számára |
| Privát (`is_public: false`) | Csak a tulajdonos számára |

Más felhasználók profiljain a könyvek között csak a nyilvánosak jelennek meg. Az API érvényesíti a láthatósági szabályokat — privát könyvek 404-et adnak vissza nem tulajdonosoknak.

---

## Jelentési rendszer

A felhasználók háromféle tartalmat jelenthetnek:

| Cél | Jelentés helye | Megadott link |
|-----|---------------|---------------|
| Recept | Recept részletoldal | Recept oldal link |
| Hozzászólás | Hozzászólás kártya (receptben) | Recept oldal hozzászólás horgonnyal |
| Felhasználó | Nyilvános felhasználói profil | Felhasználói profil link |

A jelentéseket a `POST /api/reports` végpontra küldik el indoklás szöveggel (max. 500 karakter). Az admin panel biztosítja az elbírálási felületet (lásd [ADMIN.md](ADMIN.md)).

---

## Reszponzív dizájn

Az alkalmazás Tailwind CSS reszponzív prefix-eket használ mindenhol:

| Töréspont | Prefix | Tipikus viselkedés |
|-----------|--------|-------------------|
| Mobil | (alapértelmezett) | Egy oszlop, hamburger menü, teljes szélességű kártyák |
| Tablet | `sm:` | 2 oszlopos rácsok |
| Asztali | `md:` | Asztali navigációs sáv látható, hamburger rejtett |
| Nagy asztali | `lg:` | 3 oszlopos rácsok, admin oldalsáv látható |

### Fő reszponzív minták

- **Navigációs sáv**: Asztali linkek rejtettek `md:` alatt, helyette hamburger menü
- **Recept rács**: 1 oszlop → 2 oszlop (`sm:`) → 3 oszlop (`lg:`)
- **Profil fülek**: Vízszintesen görgethető mobilon (`overflow-x-auto`)
- **Admin elrendezés**: Oldalsáv rejtett `lg:` alatt, helyette mobil felső sáv + kihúzható fiók
- **Űrlapok**: Teljes szélességű mobilon, maximális szélességgel korlátozott asztalon

---

## API végpont referencia

Minden, a frontend által felhasznált API végpont, funkciók szerint csoportosítva.

### Hitelesítés

| Végpont | Metódus | Használja |
|---------|---------|-----------|
| `/api/auth/me` | GET | Navbar, Profil, Recept részletek, Admin, számos oldal |
| `/api/auth/login` | POST | Bejelentkezés oldal |
| `/api/auth/register` | POST | Regisztrációs oldal |
| `/api/auth/logout` | POST | Navbar |
| `/api/auth/forgot-password` | POST | Bejelentkezés oldal (elfelejtett jelszó folyamat) |
| `/api/auth/reset-password` | POST | Jelszó-visszaállítás oldal |

### Receptek

| Végpont | Metódus | Használja |
|---------|---------|-----------|
| `/api/recipes` | GET | Főoldal (receptlista) |
| `/api/recipes` | POST | Új recept oldal |
| `/api/recipes/{id}` | GET | Recept részletek oldal |
| `/api/recipes/{id}` | PATCH | Recept szerkesztés oldal |
| `/api/recipes/{id}` | DELETE | Receptjeim oldal, Recept részletek (admin) |
| `/api/recipes/{id}/favorite` | POST, DELETE | Recept részletek oldal |
| `/api/recipes/{id}/ratings/me` | PUT, DELETE | Recept részletek oldal |
| `/api/recipes/{id}/comments` | GET, POST | Hozzászólás szekció |

### Hozzászólások

| Végpont | Metódus | Használja |
|---------|---------|-----------|
| `/api/comments/{id}` | PATCH | Hozzászólás szerkesztés (inline) |
| `/api/comments/{id}` | DELETE | Hozzászólás törlés |

### Kategóriák és címkék

| Végpont | Metódus | Használja |
|---------|---------|-----------|
| `/api/categories` | GET | RecipeList szűrők, TagCategoryPicker |
| `/api/tags` | GET | RecipeList szűrők, TagCategoryPicker |

### Felhasználók

| Végpont | Metódus | Használja |
|---------|---------|-----------|
| `/api/users/{id}` | GET | Nyilvános felhasználói profil |
| `/api/users/{id}/stats` | GET | Nyilvános felhasználói profil |
| `/api/users/{id}/recipes` | GET | Nyilvános felhasználói profil, Receptjeim |
| `/api/users/{id}/recipe-books` | GET | Nyilvános felhasználói profil |
| `/api/users/{id}/comments` | GET | Hozzászólásaim |
| `/api/users/{id}/ratings` | GET | Értékeléseim |
| `/api/users/me` | GET, PATCH | Profil oldal |
| `/api/users/me/stats` | GET | Profil oldal |
| `/api/users/me/favorites` | GET | Kedvencek oldal |
| `/api/users/me/deactivate` | PATCH | Fiók deaktiválás modál |

### Receptkönyvek

| Végpont | Metódus | Használja |
|---------|---------|-----------|
| `/api/recipe-books` | GET | Receptkönyvek oldal |
| `/api/recipe-books` | POST | Könyv létrehozása modál, SaveToBookButton |
| `/api/recipe-books/{id}` | GET, PATCH, DELETE | Könyv részletek oldal |
| `/api/recipe-books/{id}/recipes` | GET, POST | Könyv részletek, SaveToBookButton |
| `/api/recipe-books/{id}/recipes/{recipeId}` | DELETE | Könyv részletek (recept eltávolítás) |

### Jelentések és feltöltések

| Végpont | Metódus | Használja |
|---------|---------|-----------|
| `/api/reports` | POST | ReportModal |
| `/api/uploads` | POST | ImageUpload |
| `/api/search/suggestions` | GET | RecipeList keresés automatikus kiegészítés |

### Admin

| Végpont | Metódus | Használja |
|---------|---------|-----------|
| `/api/admin/reports` | GET | Admin vezérlőpult, Admin jelentések |
| `/api/admin/reports/{id}` | PATCH | Admin jelentések |
| `/api/admin/reports/{id}/actions` | POST | Admin jelentések |
| `/api/admin/users` | GET | Admin vezérlőpult, Admin felhasználók |
| `/api/admin/users/{id}` | PATCH | Admin felhasználók |
