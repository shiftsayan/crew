# Crew Complete Rebuild

Status: implemented
Baseline: `79258fec14b1d2e75adc96d7b302780be50a22ae`
Updated: 2026-07-30

## Product decisions

- Replace the legacy application in place. Git history is the archive.
- Keep only normalized game data and the indigo/white visual language.
- Support three to five players.
- Support the configured missions for both editions:
  - Planet Nine: 1, 2, 3, 4, 6, 7, 8, 10, 14, 15, 21, 47, 48, 49.
  - Deep Sea: 1–11 and 17–32. Missing missions 12–16 are intentionally absent.
- Game configuration lives in TypeScript, not the database.
- The server enforces dealing, turn order, task assignment, communication,
  following suit, trump, and trick winners.
- Players manually adjudicate task and manual-special-rule outcomes.
- Existing Firebase runtime data is discarded without migration.
- There is no host. One global password-protected admin interface manages
  rooms, players, keys, missions, starts, resets, advancement, and deletion.
- Players log in with a room name and a distinct six-character plaintext key.
  This protects against accidental hand disclosure, not adversarial access.
- There are no accounts, Supabase Auth sessions, impersonation, presence,
  chat, event log, revision history, replay system, or audit UI.

## Architecture

Crew is one Next.js 16 App Router application on Node 22.

- `src/game/config` owns edition, mission, card, task, and presentation data.
- `src/game/engine` contains pure game state transitions and projections.
- `src/game/contracts` contains shared runtime schemas.
- `src/server` contains Postgres, authentication, and room services.
- `src/app/api` exposes player and admin route handlers.
- `src/app/admin` is the room administration interface.
- `src/app/rooms` is the player-specific game interface.
- `supabase/migrations` owns the runtime schema.

The browser never connects to Supabase. Next.js uses a bounded `pg` pool and a
Supavisor transaction-mode connection. The hosted Data API and Realtime service
are disabled, and Auth signups/providers are disabled. Storage is left
unprovisioned with no buckets or policies because the hosted Free plan has no
whole-service switch. Local Data API, Realtime, Auth, and Storage services are
disabled in `supabase/config.toml`.

## Persistence

Use a private Postgres schema with exactly two runtime tables.

### `private.rooms`

- UUID primary key.
- Case-insensitively unique room name.
- Edition and mission string keys.
- State compatibility version.
- Whole current game state as JSONB.
- Created and updated timestamps.

### `private.room_players`

- UUID primary key and cascading room foreign key.
- Display name.
- Six-character uppercase plaintext login key using
  `[A-HJ-NP-Z2-9]{6}`.
- Seat from one through five.
- Unique room/key, room/seat, and case-insensitive room/name constraints.

No catalog, session, command, event, revision, or audit tables are added.

Every game or room mutation locks its room row with `SELECT ... FOR UPDATE`,
validates the latest state, applies one transition, and replaces the snapshot.
Incompatible state returns `LEVEL_RESTART_REQUIRED`; an admin restart preserves
the room, roster, and keys.

## Authentication and APIs

Player keys are kept in local storage by normalized room name and sent in the
`X-Crew-Player-Key` header. They never appear in URLs or another player's
projection.

Admin authentication uses `ADMIN_PASSWORD` and `ADMIN_SESSION_SECRET`. A valid
password creates an eight-hour signed, secure, HTTP-only, same-site cookie.
There are no admin records in Postgres.

Player commands are explicit:

- Claim or pass a task.
- Communicate one card as highest, only, or lowest.
- Play a card.
- Set a task outcome.
- Set a manual mission outcome.

Player projections contain the player's own hand, public room/game state, and
server-derived legal actions. They never contain another hand or any login key.

Admin APIs provide:

- Admin login/logout.
- Room list/create/read/update/delete.
- Player add/rename/reseat/remove and key rotation.
- Edition/mission selection.
- Attempt start, restart, and advancement.

Roster or definition changes during active play require explicit reset
confirmation.

## Engine

The engine uses discriminated unions and plain functions. It does not import
React, Postgres, network, clock, or global random behavior.

Stored phases:

1. `setup`
2. `assigning-tasks`
3. `between-tricks`
4. `playing-trick`
5. `adjudicating`
6. `finished`

Rules:

- Deal all 40 cards evenly. A three-player game deals 14/13/13 and leaves the
  final unmatched card unplayed after 13 full tricks.
- The player holding trump four is captain and leads the first trick.
- The previous winner leads the next trick.
- Players must follow the led suit when possible, including trump.
- Highest trump wins; otherwise highest card in the led suit wins.
- Communication is once per player per attempt, between tricks, after tasks are
  allocated, on a non-trump card that is currently highest, only, or lowest.
- Task selection begins with the captain and proceeds clockwise.
- Deep Sea task selection uses the correct player-count difficulty and an
  exact-sum selection algorithm.
- Planet Nine draws unique non-trump task cards, displays order tokens, and
  disables communication for configured dead spots.
- Any room player may mark any task. Failure ends the attempt; all successful
  tasks win it.
- Taskless/manual missions expose explicit success and failure controls.
- Exhausting playable tricks with pending outcomes enters adjudication.

Any gameplay-affecting state or configuration change increments the state
compatibility version and requires active rooms to restart. Stored JSON is not
migrated.

## Configuration normalization

- Preserve the 40-card deck.
- Preserve Deep Sea task IDs 1–96 and remove placeholder ID 1000.
- Rename `planetX` to `planet-nine`.
- Normalize red to pink.
- Convert positional difficulty arrays to `{ 3, 4, 5 }` maps.
- Repair malformed field names and obvious copy errors.
- Use stable string IDs throughout.
- Define sparse mission order explicitly.
- Validate IDs, player counts, mission references, order metadata, task
  rendering, and exact Deep Sea budgets during tests and builds.

Current code is authoritative. No configuration copy, hash, or revision is
stored in Postgres.

## Interfaces

### Player

- `/` — join with room name and player key.
- `/rooms/:name` — waiting, task assignment, play, adjudication, and result.
- Poll once per second while visible, pause while hidden, refresh after actions,
  and back off after errors.
- Do not optimistically apply game mutations.

Mobile uses a compact status header, Table/Crew/Tasks navigation, and sticky
hand tray. Wider layouts show table and crew/task context side by side. Every
control uses native semantics, visible focus, 44px targets, color-independent
suit labels, live status announcements, and reduced-motion support. The layout
must not overflow at 320px.

### Admin

- `/admin` — password prompt and room dashboard.
- Show room name, edition, mission, phase, player count, and update time.
- Create draft rooms and manage roster, keys, mission, start/reset/advance, and
  deletion.
- Show public state only; do not expose hands, raw JSON, or impersonation.

The public `/reset` and `/tasks` routes are removed.

### Completion animation

Winning an attempt dynamically imports `canvas-confetti` on the client and
fires two short side cannons using the Crew palette and circle, square, and star
particles. Every call sets `disableForReducedMotion: true`.

The success sheet always supplies a static completion signal. Confetti is
decorative, runs only for `finished/won`, and is guarded by
`crew:celebrated:<roomId>:<attemptNumber>` in session storage so polling and
rerenders cannot repeat it. Leaving the result or starting another attempt
resets the animation.

## Verification and release

Required checks:

- Configuration counts, IDs, sparse mission lists, difficulty feasibility, and
  order metadata.
- Engine card conservation, 3/4/5-player deals, captain, assignment/pass,
  follow-suit, trump, communication, winner/leader, manual outcomes,
  adjudication, and advancement.
- Database constraints, normalization, key rotation, private projections,
  admin cookies, reset recovery, and cascade deletion.
- Concurrent commands serialize against the locked room row.
- Confetti runs once for wins, never for losses, respects reduced motion, and
  cleans up.
- Multi-player browser flows for both editions.
- Keyboard, accessibility, and responsive checks at 320, 375, 768, and 1440px.
- `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build`.

Development and CI use local Supabase. The linked hosted `crew` project is the
single production database. Vercel receives production-only `DATABASE_URL`,
`ADMIN_PASSWORD`, and `ADMIN_SESSION_SECRET`; GitHub Actions does not receive
production secrets.

Cutover consists of applying the schema migration, configuring Vercel, deploying,
and smoke-testing room creation, three distinct player logins, a full trick,
manual victory with one celebration, restart, and advancement. The previous
Vercel deployment is the application rollback; the new schema is additive.

## Explicit non-goals

- Missing missions or invented content.
- Automatic evaluation of Deep Sea or Planet Nine task semantics.
- Two-player AI, distress signals, timers, or reused-task retry.
- Strong player authentication, account recovery, or rate limiting.
- Presence, chat, boop, analytics, event sourcing, replay, and audit systems.
- Public commercial distribution without a separate licensing review.
