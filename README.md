# Handleliste App

A simple, mobile-first Shopping list application built with Remix, PostgreSQL, and Drizzle ORM.

## Features

- ✅ Add items quickly with autocomplete suggestions based on previous items
- ✅ Mark items as completed (strikethrough) with a single tap
- ✅ Delete items with confirmation dialog
- ✅ Remove all completed items at once
- ✅ Categorize items by store (butikk)
- ✅ Works offline - data cached in localStorage
- ✅ Mobile-optimized UI with large touch targets
- ✅ Global password protection
- ✅ Full TypeScript support

## Quick Start

### 1. Clone and install

```bash
cd /srv/git/shoppinglist
npm install
```

### 2. Set up environment

Copy `.env.example` to `.env` and adjust if needed:

```bash
cp .env.example .env
```

Default credentials in `.env`:
- `APP_PASSWORD=shoppinglist123`
- Database: `postgresql://shoppinglist:shoppinglist@localhost:5432/shoppinglist`

### 3. Start PostgreSQL with Docker

```bash
docker-compose up -d
```

This starts PostgreSQL on `localhost:5432`.

### 4. Initialize database

```bash
npm run db:init
```

### 5. Start development server

```bash
npm run dev
```

Open http://localhost:3000 - login with password `shoppinglist123`

## Production Deployment

1. Set strong `SESSION_SECRET` and `APP_PASSWORD` in environment
2. Update `DATABASE_URL` to point to production PostgreSQL
3. Build: `npm run build`
4. Start: `npm start`

## Tech Stack

- **Frontend**: Remix (React), TypeScript, Tailwind CSS
- **Backend**: Remix server actions, Drizzle ORM
- **Database**: PostgreSQL
- **Auth**: Cookie-based session with global password
- **Storage**: IndexedDB/localStorage with server sync

## Project Structure

```
app/
  components/     # React components
  routes/         # Remix routes
  styles/         # CSS
server/
  db/             # Database schema & connection
  auth.ts         # Authentication helpers
entry.server.tsx  # Remix entry point
docker-compose.yml # Local PostgreSQL
```

## Mobile Usage

The app is designed mobile-first with:
- Large touch targets (min 40px buttons)
- Simple interface optimized for quick item entry
- Offline-capable with localStorage sync
- Works reliably with poor connectivity
# shoppinglist
