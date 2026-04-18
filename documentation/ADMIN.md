# ForkFeed — Admin panel dokumentáció

Ez a dokumentum átfogó referenciát nyújt a ForkFeed admin panelhez, beleértve az architektúrát, hozzáférés-vezérlést, az összes admin oldalt, moderációs munkafolyamatokat és az alapjául szolgáló API végpontokat.

---

## Tartalomjegyzék

- [Áttekintés](#áttekintés)
- [Hozzáférés-vezérlés](#hozzáférés-vezérlés)
- [Elrendezés és navigáció](#elrendezés-és-navigáció)
- [Vezérlőpult](#vezérlőpult)
- [Jelentéskezelés](#jelentéskezelés)
  - [Jelentés életciklus](#jelentés-életciklus)
  - [Hozzászólás előnézet](#hozzászólás-előnézet)
  - [Elérhető műveletek](#elérhető-műveletek)
- [Felhasználókezelés](#felhasználókezelés)
  - [Szűrés és keresés](#szűrés-és-keresés)
  - [Felhasználói műveletek](#felhasználói-műveletek)
  - [Önvédelem](#önvédelem)
- [Admin API végpontok](#admin-api-végpontok)
  - [Jelentések API](#jelentések-api)
  - [Felhasználók API](#felhasználók-api)
- [Moderációs munkafolyamatok](#moderációs-munkafolyamatok)

---

## Áttekintés

A ForkFeed admin panel egy dedikált felület a platform adminisztrátorai számára a tartalom moderálásához és a felhasználók kezeléséhez. A `/pages/admin` útvonalon érhető el, és három fő szekciót tartalmaz:

| Szekció | Útvonal | Cél |
|---------|---------|-----|
| Vezérlőpult | `/pages/admin` | Áttekintő statisztikák és legutóbbi tevékenység |
| Jelentések | `/pages/admin/reports` | Felhasználói jelentések elbírálása és kezelése |
| Felhasználók | `/pages/admin/users` | Felhasználói fiókok keresése, szűrése és kezelése |

Az admin panel **külön elrendezést** használ a fő alkalmazástól, saját oldalsáv navigációval és mobil fiókkal — teljesen független a fő navigációs sávtól.

---

## Hozzáférés-vezérlés

### Hitelesítési védelem

Az admin elrendezés (`app/pages/admin/layout.tsx`) szigorú hozzáférés-vezérlési folyamatot valósít meg:

```
1. Betöltéskor ellenőrzi a localStorage-ban a JWT tokent
2. Ha nincs token → átirányítás a /pages/login oldalra
3. GET /api/auth/me lekérése a tokennel
4. Ha a válasz sikertelen vagy user.role !== "admin" → átirányítás a /pages/main oldalra
5. Ha admin → az admin felület megjelenítése
```

A hitelesítési ellenőrzés alatt egy betöltési animáció jelenik meg.

### Szerveroldali végrehajtás

Minden admin API végpont a `requireAdmin()` segédfüggvényt használja a `lib/auth.ts`-ből, amely:

1. Validálja a JWT tokent
2. Ellenőrzi, hogy a token nincs-e tiltólistán
3. Ellenőrzi, hogy a felhasználó szerepköre `"admin"`-e
4. `401`-et (nincs token), `403`-at (nem admin) vagy a hitelesített payload-ot adja vissza

Kliens- és szerveroldali ellenőrzés egyaránt alkalmazásra kerül — a kliensoldali védelem megakadályozza a felhasználói felülethez való hozzáférést, míg a szerveroldali védelem megakadályozza az engedély nélküli API hívásokat.

### Admin szerepkör kiosztása

Az admin szerepköröket az admin felhasználókezelő oldalon keresztül kezelik. Az első admint közvetlenül az adatbázisban kell kijelölni. Ezt követően a meglévő adminok előléptethetnek más felhasználókat admin szerepkörbe.

---

## Elrendezés és navigáció

### Asztali elrendezés

```
┌──────────────────────────────────────────────────────────────────┐
│ ┌──────────┐ ┌─────────────────────────────────────────────────┐ │
│ │          │ │                                                 │ │
│ │  🍴      │ │                                                 │ │
│ │ ForkFeed │ │              Oldal tartalom                     │ │
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

- **Oldalsáv** (264px széles): Fix bal oldali panel logóval, navigációs linkekkel, téma kapcsolóval és felhasználói avatárral
- **Tartalom terület**: Rugalmas fő tartalom régió
- **Aktív navigációs link**: Elsődleges szín háttérrel kiemelve

### Mobil elrendezés

- **Felső sáv**: Hamburger gomb (bal), "🍴 Admin" cím (közép), téma kapcsoló (jobb)
- **Kihúzható fiók**: Ugyanaz az oldalsáv tartalom, balról nyílik sötét átfedés háttérrel
- **Tartalom**: Teljes szélességű a felső sáv alatt (`pt-14` kitöltéssel a fix fejléchez)

### Oldalsáv navigációs linkek

| Ikon | Címke | Útvonal | Aktív egyezés |
|------|-------|---------|---------------|
| Rács | Áttekintés | `/pages/admin` | Csak pontos egyezés |
| Zászló | Jelentések | `/pages/admin/reports` | Prefix egyezés |
| Felhasználók | Felhasználók | `/pages/admin/users` | Prefix egyezés |

### Oldalsáv lábléc

- Téma kapcsoló (világos/sötét mód váltó)
- Felhasználói profil link avatárral (kép vagy kezdőbetű) és felhasználónévvel
- A `/pages/profile` oldalra mutat

---

## Vezérlőpult

**Útvonal**: `/pages/admin`

A vezérlőpult gyors áttekintést nyújt a platform tevékenységéről.

### Statisztikai kártyák

Négy statisztikai kártya 2×2-es rácsban (nagy képernyőn 4 oszlop):

| Kártya | Szín | Érték forrása | Kattintható |
|--------|------|--------------|-------------|
| Függő jelentések | Figyelmeztető (sárga) | `GET /api/admin/reports?status=pending&limit=1` → `pagination.total` | Igen → `/pages/admin/reports?status=pending` |
| Összes jelentés | Elsődleges (kék) | `GET /api/admin/reports?limit=1` → `pagination.total` | Nem |
| Összes felhasználó | Elsődleges (kék) | `GET /api/admin/users?limit=1` → `pagination.total` | Nem |
| Aktív felhasználó | Sikeres (zöld) | `GET /api/admin/users?is_active=true&limit=1` → `pagination.total` | Nem |

> **Megjegyzés**: A vezérlőpult szándékosan `limit=1` kéréseket használ — csak a `pagination.total` értékre van szüksége minden válaszból, nem a tényleges adatokra.

### Legutóbbi jelentések táblázat

Táblázat az 5 legutóbbi jelentéssel, oszlopok:

| Oszlop | Leírás |
|--------|--------|
| ID | Jelentés azonosító (linkek a jelentések oldalra) |
| Típus | Cél típus jelvény (Recept/Komment/Felhasználó) |
| Indok | Jelentés indoklás szövege (levágva) |
| Bejelentő | Bejelentő felhasználóneve (linkek a jelentések oldalra) |
| Státusz | Színkódolt státusz jelvény |
| Dátum | Beküldés dátuma (magyar lokál) |

Ha nincsenek jelentések, a „Nincsenek jelentések." üres állapot jelenik meg.

---

## Jelentéskezelés

**Útvonal**: `/pages/admin/reports`

A jelentések oldal az elsődleges moderációs felület a felhasználók által beküldött tartalomjelentések elbírálásához.

### Szűrés

Két szűrő legördülő a tetején:

| Szűrő | Lehetőségek | Alapértelmezett |
|-------|-------------|-----------------|
| Státusz | Minden státusz, Függőben, Elfogadva, Elutasítva | Függőben (pending) |
| Típus | Minden típus, Recept, Komment, Felhasználó | Minden típus |

A szűrők módosítása azonnal frissíti a listát (visszaállítja az 1. oldalra).

### Jelentés kártyák

Minden jelentés kártyaként jelenik meg színkódolt bal szegéllyel:

| Státusz | Szegély szín |
|---------|-------------|
| Függőben | Figyelmeztető (sárga) |
| Elfogadva | Sikeres (zöld) |
| Elutasítva | Base-300 (szürke) |

#### Kártya fejléc tartalom

- **Jelentés azonosító** — mono-stílusú `#123`
- **Státusz jelvény** — színkódolt (warning/success/ghost)
- **Cél típus jelvény** — körvonalazott (Recept/Komment/Felhasználó)
- **Cél link** — recepteknél: link a recept oldalra; hozzászólásoknál: link a recept oldalra a hozzászólással; felhasználóknál: itt nincs közvetlen link (a műveletekben elérhető)
- **Indoklás szöveg** — a teljes jelentés indoklás
- **Metaadat sor** — Bejelentő felhasználóneve (kattintható a felhasználó profiljára), beküldés dátuma, elbíráló neve (ha elbírálva)
- **Kinyitás/összecsukás ikon** — a művelet panel megjelenítése/elrejtése

### Hozzászólás előnézet

Ha egy jelentés hozzászólást céloz meg (`target_type === "comment"`), a kártya inline előnézetet jelenít meg:

```
┌─────────────────────────────────────────────────┐
│  [felhasználónév]                  [Törölve]    │
│  "A tényleges hozzászólás szövege itt..."       │
└─────────────────────────────────────────────────┘
```

- Lekerekített dobozban jelenik meg `bg-base-200` háttérrel
- Ha a hozzászólás már törölve van (`is_deleted: true`): vörös árnyalatú háttér „Törölve" jelvénnyel
- A szerző felhasználóneve kattintható (a felhasználó profiljára mutat)
- A hozzászólás szövege dőlt betűvel és idézőjelekkel jelenik meg

A hozzászólás adatait az API szerveroldali lekéréssel gazdagítja — a jelentések végpont a hozzászólás típusú jelentéseket kiegészíti a tényleges hozzászólás tartalmával, szerző adataival, recept azonosítóval és törlési státusszal.

### Jelentés életciklus

```
                    ┌──────────┐
                    │ Függőben │  ← Kezdeti állapot
                    └────┬─────┘
                    ╱         ╲
              ┌────▼────┐  ┌───▼──────┐
              │Elfogadva│  │Elutasítva│
              └────┬────┘  └───┬──────┘
                   │           │
                   └───────────┘
                        │
                   ↩ Újranyitás
                   (Újranyitás → Függőben)
```

Bármely lezárt jelentés újranyitható „Függőben" státuszra.

### Elérhető műveletek

A művelet panel a jelentés kártya kinyitás ikonjára kattintva jelenik meg.

| Művelet | Gomb | Elérhetőség | Leírás |
|---------|------|-------------|--------|
| Elfogadás | ✓ zöld | Csak függőben | Státuszt `accepted` értékre állítja |
| Elutasítás | ✕ ghost | Csak függőben | Státuszt `rejected` értékre állítja |
| Tartalom törlése | 🗑️ piros körvonal | Recept és hozzászólás jelentések | A cél lágy törlése (`is_deleted: true` beállítása) |
| Felhasználó kezelése | 👤 körvonal | Felhasználó jelentések | Navigáció: `/pages/admin/users?highlight={userId}` |
| Újranyitás | ↩ ghost | Csak elfogadva/elutasítva | Státuszt `pending` értékre állítja |

#### Tartalom törlési folyamat

1. Az admin a „Tartalom törlése" gombra kattint
2. Böngésző `confirm()` párbeszédablak: „Biztosan törlöd a bejelentett tartalmat?"
3. Ha megerősítve: `POST /api/admin/reports/{id}/actions` `{ action: "delete_target" }` törzzsel
4. A szerver lágy törli a hozzászólást vagy receptet (`is_deleted: true`)
5. A jelentéslista frissül

---

## Felhasználókezelés

**Útvonal**: `/pages/admin/users`

A felhasználók oldal kereshető, szűrhető táblázatot biztosít az összes regisztrált felhasználóról.

### Szűrés és keresés

Három szűrő vezérlő:

| Vezérlő | Típus | Lehetőségek |
|---------|-------|-------------|
| Keresés | Szöveg beviteli mező | Keresés felhasználónév és e-mail alapján (kis-nagybetű érzéketlen) |
| Szerep | Legördülő | Minden szerep, Felhasználó (user), Admin |
| Státusz | Legördülő | Minden státusz, Aktív, Inaktív |

Bármely szűrő módosítása visszaállítja az 1. oldalra és frissíti a listát.

### Felhasználói táblázat

| Oszlop | Tartalom |
|--------|----------|
| Felhasználó | Avatár (kép vagy kezdőbetű) + felhasználónév + `#id` |
| Email | E-mail cím |
| Szerep | Szerep jelvény — `admin` (elsődleges szín) vagy `user` (ghost) |
| Státusz | Aktív jelvény (sikeres = „Aktív") vagy inaktív jelvény (hiba = „Inaktív") |
| Regisztráció | Regisztráció dátuma (magyar lokál) |
| Utolsó belépés | Utolsó bejelentkezés dátuma vagy „—" ha soha nem lépett be |
| Műveletek | Művelet vezérlők (lásd alább) |

### Felhasználói műveletek

Minden felhasználó sorban két művelet vezérlő található:

#### Szerepkör módosítás

- **Legördülő választó** a `user`, `admin` lehetőségekkel
- Eltérő szerepkör kiválasztása `confirm()` párbeszédablakot indít
- Megerősítés esetén: `PATCH /api/admin/users/{userId}` `{ role: "newRole" }` törzzsel
- A táblázat frissül a sikeres módosítás után

#### Tiltás/Aktiválás kapcsoló

- **Aktív felhasználók**: Piros „Tiltás" gomb → `is_active: false` beállítása
- **Inaktív felhasználók**: Zöld „Aktiválás" gomb → `is_active: true` beállítása
- Mindkettő `confirm()` párbeszédablakot indít végrehajtás előtt
- Megerősítés esetén: `PATCH /api/admin/users/{userId}` `{ is_active: true/false }` törzzsel

### Önvédelem

Az admin panel biztonsági intézkedéseket valósít meg, hogy megakadályozza az adminisztrátorokat abban, hogy véletlenül kizárják magukat:

| Védelem | Megvalósítás |
|---------|-------------|
| Nem módosíthatja saját szerepkörét | A szerepkör legördülő **letiltva** az aktuális admin sorában |
| Nem tilthatja ki saját magát | A tiltás gomb **letiltva** az aktuális admin sorában |
| Szerveroldali ellenőrzés | Az API `400: "Cannot deactivate your own account."` hibát ad vissza, ha megpróbálnák |

Az aktuális admin felhasználó azonosítóját betöltéskor a `GET /api/auth/me` végpontról kéri le, és összehasonlítja minden sor azonosítójával. Az egyező sorok letiltott vezérlőket jelenítenek meg csökkentett átlátszósággal.

---

## Admin API végpontok

### Jelentések API

#### Jelentések listázása

```
GET /api/admin/reports
```

**Lekérdezési paraméterek**:

| Paraméter | Típus | Alapértelmezett | Leírás |
|-----------|-------|-----------------|--------|
| `page` | integer | 1 | Oldalszám |
| `limit` | integer | 20 | Elemek oldalanként (max. 50) |
| `status` | string | — | Szűrés státusz alapján: `pending`, `accepted`, `rejected` |
| `target_type` | string | — | Szűrés típus alapján: `recipe`, `comment`, `user` |
| `reported_by` | integer | — | Szűrés bejelentő felhasználó azonosítója alapján |

**Válasz**:

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

> **Megjegyzés**: A `comment` mező csak azoknál a jelentéseknél van jelen, ahol `target_type === "comment"`. Szerveroldali kötegelt lekéréssel gazdagítják a hivatkozott hozzászólásokkal.

#### Egyetlen jelentés lekérése

```
GET /api/admin/reports/{reportId}
```

Egyetlen jelentést ad vissza a bejelentő és elbíráló adataival.

#### Jelentés státusz frissítése

```
PATCH /api/admin/reports/{reportId}
```

**Kérés törzs**:

```json
{
  "status": "accepted" // "pending" | "accepted" | "rejected"
}
```

A `reviewed_by` mezőt az aktuális admin azonosítójára, a `reviewed_at` mezőt az aktuális időbélyegre állítja.

#### Jelentés művelet végrehajtása

```
POST /api/admin/reports/{reportId}/actions
```

**Kérés törzs**:

```json
{
  "action": "delete_target" // "delete_target" | "warn_user"
}
```

**Műveletek**:

| Művelet | `target_type` | Hatás |
|---------|---------------|-------|
| `delete_target` | `comment` | `is_deleted: true` beállítása a hozzászólásra |
| `delete_target` | `recipe` | `is_deleted: true` beállítása a receptre |
| `delete_target` | `user` | Nem támogatott (422-t ad vissza) |
| `warn_user` | bármely | Helyőrző — tudomásul veszi, de nem hajt végre műveletet |

### Felhasználók API

#### Felhasználók listázása

```
GET /api/admin/users
```

**Lekérdezési paraméterek**:

| Paraméter | Típus | Alapértelmezett | Leírás |
|-----------|-------|-----------------|--------|
| `page` | integer | 1 | Oldalszám |
| `limit` | integer | 20 | Elemek oldalanként (max. 50) |
| `query` | string | — | Keresés felhasználónév és e-mail alapján (kis-nagybetű érzéketlen) |
| `role` | string | — | Szűrés szerep alapján: `user`, `admin` |
| `is_active` | string | — | Szűrés státusz alapján: `true`, `false` |

**Válasz**:

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

#### Felhasználó frissítése

```
PATCH /api/admin/users/{userId}
```

**Kérés törzs** (minden mező opcionális, legalább egy kötelező):

```json
{
  "role": "admin", // "user" | "admin"
  "is_active": false // true | false
}
```

**Szerveroldali védelem**:

- Saját fiókra nem állítható `is_active: false` (400-at ad vissza)
- Érvénytelen szerepkörök 400-at adnak vissza
- Nem logikai `is_active` 400-at ad vissza

---

## Moderációs munkafolyamatok

### Bejelentett hozzászólás kezelése

```
1. Navigáció: /pages/admin/reports (alapértelmezett szűrő: Függőben)
2. Hozzászólás jelentés megkeresése → indoklás és inline hozzászólás előnézet olvasása
3. Döntés:
   a. Jogos jelentés:
      - Kinyitás → „Elfogadás"
      - Ha a tartalom megsérti a szabályokat: „Tartalom törlése"
   b. Hamis jelentés:
      - Kinyitás → „Elutasítás"
4. A jelentés az elfogadott/elutasított listába kerül
```

### Bejelentett recept kezelése

```
1. Recept jelentés megkeresése → „megtekintése ↗" kattintás a recept megtekintéséhez új lapon
2. A recept tartalmának áttekintése
3. Jelentés elfogadása/elutasítása
4. Opcionálisan a recept törlése a „Tartalom törlése" gombbal
```

### Bejelentett felhasználó kezelése

```
1. Felhasználó jelentés megkeresése → indoklás olvasása
2. Kinyitás → „Felhasználó kezelése" → navigáció a felhasználókezelő oldalra
3. A felhasználó megkeresése a táblázatban
4. Művelet végrehajtása: szerepkör módosítás vagy felhasználó tiltása
5. Visszatérés a jelentésekhez → jelentés elfogadása/elutasítása
```

### Felhasználó tiltása

```
1. Navigáció: /pages/admin/users
2. A felhasználó megkeresése név vagy e-mail alapján
3. „Tiltás" kattintás a felhasználó sorában
4. Megerősítés a párbeszédablakban
5. A felhasználó azonnal tiltásra kerül (is_active: false)
6. A tiltott felhasználók nem tudnak bejelentkezni (bejelentkezés 403-at ad vissza)
```

### Felhasználó előléptetése adminná

```
1. Navigáció: /pages/admin/users
2. A felhasználó megkeresése
3. Szerep legördülő módosítása „user"-ről „admin"-ra
4. Megerősítés a párbeszédablakban
5. A felhasználó innentől admin hozzáféréssel rendelkezik (következő oldalbetöltéstől érvényes)
```
