# Turboztarot168 Website

This client-facing website lane is isolated from `E:\Boom Project`.

## Folders

- `site/` — production website files
- `content/` — approved copy, package details, and booking rules
- `assets/` — logo, photos, QR code, and other media
- `design/` — Turboztarot168 design tokens and visual references
- `previews/` — screenshots and review exports

## Current prototype

- `site/index.html`
- Flow: package selection → reading agreement → LINE OA booking → reading status
- LINE OA: `@330dvugn`

Package prices, question limits, and waiting times remain draft placeholders until BooM confirms the final package data.

## Editing and deployment workflow

- Make website edits in `site/` first.
- Preview and review the `site/` version locally.
- Before deployment, copy approved shared pages/assets into `public/`.
- Verify `site/` and `public/` are identical for every shared page before deploying.
- `public/` is the Next.js runtime/deploy copy, not the primary editing source.

## Queue App (Local-first)

- Customer form: `http://127.0.0.1:3011/booking.html` (or the port used by the local server)
- Internal dashboard: `http://127.0.0.1:3011/queue-admin.html`
- Local SQLite database: `data/reading-queue.sqlite` (ignored by Git)
- API: `/api/queue`

The queue app currently stores data locally and does not sync to Notion. Review and approve the workflow before adding Notion sync or exposing it publicly.

New queue notifications are routed through Hanbi's isolated Telegram profile via a local signed webhook. The webhook configuration and secret remain outside Git in `.env.local`; the website never sends Telegram directly.


- Do not mix this lane with `E:\Boom Project\Knowledge` or research outputs.
- Do not store secrets or private client data in this website folder.
- Production files belong in `site/`; screenshots belong in `previews/`.
