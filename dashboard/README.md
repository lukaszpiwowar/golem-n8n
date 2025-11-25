# Personal Dashboard

Aplikacja Next.js z autoryzacją i funkcjonalnością TODO.

## Funkcjonalności

- ✅ Autoryzacja (rejestracja i logowanie)
- ✅ Zarządzanie zadaniami TODO
- ✅ Persystencja danych w PostgreSQL
- ✅ Responsywne UI (desktop, tablet, telefon)

## Struktura

- `app/` - Strony i API routes Next.js
- `components/` - Komponenty React
- `lib/` - Biblioteki pomocnicze (baza danych, autoryzacja)
- `scripts/` - Skrypty migracji bazy danych
- `types/` - Definicje typów TypeScript

## Zmienne środowiskowe

Utwórz plik `.env` na podstawie `.env.example`:

```bash
DATABASE_URL=postgresql://dashboard:dashboard@postgres:5432/dashboard
NEXTAUTH_URL=https://dash.piwowar.ovh
NEXTAUTH_SECRET=change-this-to-a-random-secret-key
NODE_ENV=production
```

## Migracje bazy danych

Migracje są uruchamiane automatycznie przy starcie kontenera Docker.

Aby uruchomić migracje ręcznie:

```bash
npm run db:migrate
```

## Development

```bash
npm install
npm run dev
```

Aplikacja będzie dostępna pod adresem `http://localhost:3000`.

## Production

Aplikacja jest budowana jako Docker image i uruchamiana przez docker-compose.

