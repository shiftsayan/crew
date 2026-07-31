# Crew

Crew is a server-authoritative web companion for **The Crew: The Quest for
Planet Nine** and **The Crew: Mission Deep Sea**. Players join a named room
with a six-character player key; a small password-protected admin interface
manages rooms, rosters, missions, and resets.

The application is a single Next.js service backed by a private Supabase
Postgres schema. Game definitions live in TypeScript, and browsers never
connect to Supabase directly.

## Requirements

- Node.js 22
- npm
- Docker for the local database (the Supabase CLI is pinned in this repository)

## Local setup

Install dependencies:

```bash
npm install
```

Create `.env.local` from `.env.example` and set:

- `DATABASE_URL` to a Postgres connection string
- `ADMIN_PASSWORD` to the shared admin password
- `ADMIN_SESSION_SECRET` to at least 32 random characters

Hosted connections use the Supavisor transaction endpoint on port `6543`.
The server verifies it with the bundled Supabase root certificate; do not add
an `sslmode` query parameter because `pg` would replace that explicit CA
configuration.

The repository includes `bin/set-local-env.sh` for safely adding or replacing
one local value:

```bash
./bin/set-local-env.sh ADMIN_PASSWORD example-password
```

Start and reset the local Supabase database:

```bash
npm run db:start
npm run db:reset
```

Run the application:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to join a room and
[http://localhost:3000/admin](http://localhost:3000/admin) to administer one.

### Landing background

The join page chooses one configured Unsplash photo per browser tab and renders
it once as ASCII, ordered-dithered ASCII, or dot art. Add, remove, or tune
photos in `src/components/join/landingBackgrounds.ts`. Each entry includes the
direct Unsplash image URL, its visible attribution, focal position, and
`asciify-engine` effect options. No Unsplash API key is used.

Keep the image URL on `images.unsplash.com`, retain the photographer and photo
links, and leave decorative animation and hover effects disabled. To force a
new selection while developing, clear the `crew:landing-background` value from
`sessionStorage` and reload.

## Verification

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

`npm run check` runs the same checks in sequence.

## Architecture

- `src/game/config` — immutable edition, mission, card, and task data
- `src/game/engine` — pure game state transitions and player projections
- `src/game/contracts` — runtime-validated shared types
- `src/server` — Postgres, authentication, and room services
- `src/app/api` — player and admin HTTP routes
- `src/app/admin` — password-protected room administration
- `src/app/rooms` — player-specific game surface
- `supabase/migrations` — the two-table private database schema

The player access model is deliberately lightweight. Player keys are six
characters and stored in plaintext. They keep players from accidentally seeing
one another's hands; they are not strong authentication.

## Production

The linked Supabase project is `crew` in `us-east-1`. Vercel should receive
`DATABASE_URL`, `ADMIN_PASSWORD`, and `ADMIN_SESSION_SECRET` as Production-only
environment variables. GitHub Actions uses a local database and does not need
production credentials.

The hosted Data API and Realtime service are disabled, and Auth signups and
providers are disabled. Storage remains unprovisioned: there are no buckets,
policies, or browser credentials. Local Supabase disables all four services.

The preserved `bin/upload-env-to-github.sh` helper requires an explicit CI
environment file and refuses application, Supabase, Firebase, and Doppler
credentials. Never pass `.env.local` to it.

See [PLAN.md](./PLAN.md) for the accepted rebuild scope and explicit
non-goals.
