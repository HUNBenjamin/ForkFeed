# 🍴 ForkFeed

A **ForkFeed** egy full-stack receptmegosztó közösségi platform, amely _Szakvizsgaremek_ projektként készült. A felhasználók recepteket fedezhetnek fel, hozhatnak létre, értékelhetnek és rendszerezhetnek — miközben az adminisztrátorok a beépített jelentési rendszeren keresztül moderálják a tartalmat.

---

## Tartalomjegyzék

- [Funkciók](#funkciók)
- [Technológiai stack](#technológiai-stack)
- [Projekt struktúra](#projekt-struktúra)
- [Első lépések](#első-lépések)
- [Környezeti változók](#környezeti-változók)
- [Elérhető szkriptek](#elérhető-szkriptek)
- [Adatbázis](#adatbázis)
- [API áttekintés](#api-áttekintés)
- [Backend dokumentáció](#backend-dokumentáció)
- [Frontend dokumentáció](#frontend-dokumentáció)
- [Admin panel dokumentáció](#admin-panel-dokumentáció)

---

## Funkciók

### Felhasználóknak

- **Hitelesítés** — Regisztráció, bejelentkezés, kijelentkezés, jelszó módosítás és elfelejtett jelszó visszaállítása e-mailben
- **Receptkezelés** — Saját receptek létrehozása, szerkesztése és törlése hozzávalókkal, lépésekkel, kategóriákkal és címkékkel
- **Képfeltöltés** — Recept- és avatárképek feltöltése (Cloudinary-n tárolva, automatikus átméretezéssel)
- **Értékelések és hozzászólások** — Receptek értékelése (1–5 csillag) és hozzászólások írása
- **Kedvencek** — Receptek mentése a személyes kedvencek listájára
- **Receptkönyvek** — Receptek rendszerezése egyéni gyűjteményekbe (nyilvános vagy privát), más felhasználók nyilvános könyveinek klónozása
- **Keresés és felfedezés** — Receptek böngészése szűréssel (nehézség, kategória), rendezéssel (értékelés, dátum, elkészítési idő) és automatikus kiegészítő javaslatokkal
- **Felhasználói profilok** — Bármely felhasználó profiljának, statisztikáinak, receptjeinek és tevékenységének megtekintése
- **Fiókkezelés** — Profil adatok frissítése (felhasználónév, bemutatkozás, avatár), fiók deaktiválása

### Adminisztrátoroknak

- **Felhasználókezelés** — Felhasználók listázása, szűrése, aktiválása/deaktiválása, szerepkörök előléptetése/visszaminősítése
- **Jelentési rendszer** — Felhasználói jelentések elbírálása receptekről/hozzászólásokról, intézkedés (tartalom törlése, felhasználók figyelmeztetése)
- **Tartalom moderálás** — Hozzászólások végleges törlése, kategóriák és címkék kezelése

---

## Technológiai stack

| Réteg             | Technológia                                                                    |
| ----------------- | ------------------------------------------------------------------------------ |
| **Keretrendszer** | [Next.js 16](https://nextjs.org/) (App Router)                                 |
| **Nyelv**         | [TypeScript 5](https://www.typescriptlang.org/)                                |
| **Adatbázis**     | [MongoDB](https://www.mongodb.com/)                                            |
| **ORM**           | [Prisma 6](https://www.prisma.io/)                                             |
| **Stílusok**      | [Tailwind CSS 4](https://tailwindcss.com/) + [DaisyUI 5](https://daisyui.com/) |
| **Képtárolás**    | [Cloudinary](https://cloudinary.com/)                                          |
| **Hitelesítés**   | JWT (jsonwebtoken) token tiltólistával                                         |
| **E-mail**        | [Nodemailer](https://nodemailer.com/) (SMTP)                                   |
| **Linting**       | ESLint 9 + typescript-eslint                                                   |
| **Formázás**      | Prettier 3                                                                     |

---

## Projekt struktúra

```
ForkFeed/
├── app/
│   ├── layout.tsx              # Gyökér elrendezés (HTML váz, lang="hu")
│   ├── page.tsx                # Gyökér oldal → átirányít a /pages/main-re
│   ├── globals.css             # Globális Tailwind stílusok
│   ├── api/                    # ← REST API (Next.js Route Handlers)
│   │   ├── auth/               #   Hitelesítési végpontok
│   │   ├── recipes/            #   Recept CRUD + al-erőforrások
│   │   ├── categories/         #   Kategória kezelés
│   │   ├── tags/               #   Címke kezelés
│   │   ├── comments/           #   Hozzászólás szerkesztés/törlés
│   │   ├── users/              #   Nyilvános profilok + hitelesített felhasználó
│   │   ├── recipe-books/       #   Receptkönyv gyűjtemények
│   │   ├── reports/            #   Felhasználói jelentések
│   │   ├── admin/              #   Csak admin moderáció
│   │   ├── uploads/            #   Képfeltöltés
│   │   ├── search/             #   Automatikus kiegészítő javaslatok
│   │   ├── meta/               #   Enum értékek (nehézségek, szerepkörök)
│   │   └── health/             #   Állapot ellenőrzés
│   ├── pages/                  # ← Frontend oldalak
│   │   ├── main/               #   Főoldal / recept feed
│   │   ├── login/              #   Bejelentkezés oldal
│   │   ├── register/           #   Regisztráció oldal
│   │   ├── reset-password/     #   Jelszó visszaállítás oldal
│   │   ├── recipe/             #   Recept részletek + új létrehozása
│   │   ├── profile/            #   Hitelesített felhasználó profilja
│   │   └── user/               #   Nyilvános felhasználói profil
│   ├── components/             # Megosztott UI komponensek
│   └── prisma/                 # Generált Prisma kliens (automatikusan generált)
├── lib/
│   ├── auth.ts                 # JWT aláírás/ellenőrzés, token tiltólista, auth segédfüggvények
│   ├── prisma.ts               # Singleton Prisma kliens
│   └── cloudinary.ts           # Cloudinary feltöltés/törlés segédfüggvények
├── prisma/
│   └── schema.prisma           # Adatbázis séma definíció
├── data/                       # Seed adatok (JSON) + teszt fájlok
├── dataPlans/                  # Minta adat tervek
├── documentation/              # Részletes dokumentáció
├── package.json
├── next.config.ts
├── tsconfig.json
├── eslint.config.mjs
├── prettier.config.cjs
└── postcss.config.mjs
```

---

## Első lépések

### Előfeltételek

- **Node.js** ≥ 18
- **MongoDB** példány (helyi vagy felhő — pl. MongoDB Atlas)
- **Cloudinary** fiók (képfeltöltéshez)
- _(Opcionális)_ SMTP hitelesítő adatok jelszó-visszaállító e-mailekhez

### Telepítés

```bash
# 1. Repository klónozása
git clone <repository-url>
cd ForkFeed

# 2. Függőségek telepítése
npm install

# 3. Környezeti változók másolása és konfigurálása
#    (lásd a Környezeti változók szekciót lentebb)

# 4. Prisma kliens generálása
npx prisma generate

# 5. Fejlesztői szerver indítása
npm run dev
```

Az alkalmazás elérhető lesz a **http://localhost:8080** címen.

---

## Környezeti változók

Hozz létre egy `.env` fájlt a projekt gyökerében:

```env
# Adatbázis
DATABASE_URL="mongodb+srv://<user>:<password>@<cluster>/<database>?retryWrites=true&w=majority"

# JWT
JWT_SECRET="your-secret-key-here"

# Cloudinary
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"

# SMTP (jelszó-visszaállító e-mailekhez)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
SMTP_FROM="\"ForkFeed\" <your-email@gmail.com>"

# Alkalmazás URL (jelszó-visszaállító e-mailekben használva)
NEXT_PUBLIC_APP_URL="http://localhost:8080"
```

---

## Elérhető szkriptek

| Szkript         | Parancs              | Leírás                                       |
| --------------- | -------------------- | -------------------------------------------- |
| **dev**         | `npm run dev`        | Fejlesztői szerver indítása a 8080-as porton |
| **build**       | `npm run build`      | Prisma kliens generálás + éles build         |
| **start**       | `npm start`          | Éles szerver indítása                        |
| **lint**        | `npm run lint`       | ESLint futtatása                             |
| **format**      | `npm run format`     | Formázás ellenőrzése Prettier-rel            |
| **format:fix**  | `npm run format:fix` | Formázás automatikus javítása                |
| **postinstall** | _(automatikus)_      | Prisma kliens generálása `npm install` után  |

---

## Adatbázis

A ForkFeed **MongoDB**-t használ **Prisma ORM**-mel. A séma 14 modellt definiál:

| Modell               | Leírás                                                 |
| -------------------- | ------------------------------------------------------ |
| `User`               | Felhasználói fiókok szerepkörökkel (user/admin)        |
| `Recipe`             | Receptek lágy törlés támogatással                      |
| `Ingredient`         | Recept hozzávalók (név, mennyiség, mértékegység)       |
| `Step`               | Sorrendezett elkészítési lépések                       |
| `Category`           | Recept kategóriák                                      |
| `Tag`                | Recept címkék                                          |
| `RecipeCategory`     | Több-a-többhöz: Recept ↔ Kategória                     |
| `RecipeTag`          | Több-a-többhöz: Recept ↔ Címke                         |
| `RecipeBook`         | Felhasználó által létrehozott receptgyűjtemények       |
| `RecipeBookRecipe`   | Több-a-többhöz: Receptkönyv ↔ Recept                   |
| `Comment`            | Recept hozzászólások lágy törléssel                    |
| `Rating`             | Felhasználói értékelések (1–5, egy/felhasználó/recept) |
| `Favorite`           | Felhasználói kedvencek (egy/felhasználó/recept)        |
| `Report`             | Tartalomjelentések (recept/hozzászólás)                |
| `PasswordResetToken` | Időkorlátos jelszó-visszaállító tokenek                |
| `DenylistedToken`    | Érvénytelenített JWT tokenek                           |

---

## API áttekintés

A backend **54 API végpontot** biztosít, Next.js Route Handler-ként szervezve az `/app/api/` alatt. Minden végpont JSON-t ad vissza.

| Terület        | Alap útvonal          | Végpontok                                                                                         |
| -------------- | --------------------- | ------------------------------------------------------------------------------------------------- |
| Hitelesítés    | `/api/auth/*`         | Bejelentkezés, regisztráció, kijelentkezés, profil, jelszó módosítás/visszaállítás                |
| Receptek       | `/api/recipes/*`      | Teljes CRUD + értékelések, hozzászólások, lépések, hozzávalók, kedvencek, kép, kategóriák, címkék |
| Kategóriák     | `/api/categories/*`   | Listázás, létrehozás, frissítés, törlés                                                           |
| Címkék         | `/api/tags/*`         | Listázás, létrehozás, frissítés, törlés                                                           |
| Hozzászólások  | `/api/comments/*`     | Szerkesztés, törlés                                                                               |
| Felhasználók   | `/api/users/*`        | Nyilvános profilok, statisztikák, tevékenység                                                     |
| Aktuális felh. | `/api/users/me/*`     | Profil, statisztikák, kedvencek, deaktiválás                                                      |
| Receptkönyvek  | `/api/recipe-books/*` | CRUD, klónozás, receptek kezelése                                                                 |
| Jelentések     | `/api/reports/*`      | Saját jelentések létrehozása és listázása                                                         |
| Admin          | `/api/admin/*`        | Felhasználókezelés, jelentések elbírálása, tartalom moderálás                                     |
| Feltöltések    | `/api/uploads`        | Képfeltöltés Cloudinary-ra                                                                        |
| Keresés        | `/api/search/*`       | Automatikus kiegészítő javaslatok                                                                 |
| Meta           | `/api/meta/*`         | Nehézségi szintek, felhasználói szerepkörök                                                       |
| Állapot        | `/api/health`         | Adatbázis állapot ellenőrzés                                                                      |

> **A teljes API referenciáért kérés/válasz részletekkel lásd: [documentation/BACKEND.md](documentation/BACKEND.md).**

---

## Backend dokumentáció

A teljes backend dokumentáció — beleértve minden végpont metódusát, URL-jét, kérés törzsét, lekérdezési paramétereit, válasz formátumát, hitelesítési követelményeit és hibakódjait — elérhető itt:

📄 **[documentation/BACKEND.md](documentation/BACKEND.md)**

---

## Frontend dokumentáció

A teljes frontend dokumentáció — az oldalstruktúrát, komponenseket, navigációt, témázást, hitelesítési folyamatot, képfeltöltő rendszert, hozzászólás rendszert, receptkönyveket és reszponzív dizájnt lefedve — elérhető itt:

📄 **[documentation/FRONTEND.md](documentation/FRONTEND.md)**

---

## Admin panel dokumentáció

Az admin panel dokumentáció — a vezérlőpultot, jelentéskezelést, felhasználókezelést, moderációs munkafolyamatokat, önvédelmi mechanizmusokat és az összes admin API végpontot lefedve — elérhető itt:

📄 **[documentation/ADMIN.md](documentation/ADMIN.md)**
