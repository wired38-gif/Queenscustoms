# CLAUDE.md — GoDaddy Node.js Hosting

Deploy from **repo root** (`wired38-gif/Queenscustoms`), branch `main`.

## Requirements

- `package.json` with `"start": "node server.js"` and `"main": "server.js"`
- `server.js` at repository root (not `shop/` or a monorepo subfolder)
- Listen on `process.env.PORT` and host `0.0.0.0`
- Do not commit `node_modules/`, `.env`, or `data.db`

## GoDaddy settings

| Setting | Value |
|--------|--------|
| GitHub repo | `wired38-gif/Queenscustoms` |
| Branch | `main` |
| Application root | empty or `.` (not `shop/`) |

Do not connect `Myks-Brain` — Queens is a separate repository.

## Environment (production)

Copy `.env.example` → `.env` on the GoDaddy Node host (or set vars in the hosting Environment panel). Do **not** commit `.env`.

| Variable | Purpose |
|----------|---------|
| `SETUP_COACH_API_KEY` | Preferred OpenAI (or OpenAI-compatible) key for Setup Coach |
| `OPENAI_API_KEY` | Fallback if `SETUP_COACH_API_KEY` is empty |
| `SETUP_COACH_MODEL` | Default `gpt-4o-mini` |
| `SETUP_COACH_BASE_URL` | Optional; default `https://api.openai.com/v1` |

After changing env: restart the Node app from the GoDaddy panel so `dotenv` reloads.

## Setup Coach

- Admin: `/admin/` → Setup mode → **Setup Coach** panel
- `GET /api/admin/setup-coach/status` — `{ configured, model }` (no secrets)
- `POST /api/admin/setup-coach` — body `{ message, step? }` → `{ reply, source: "llm"|"rules" }`
