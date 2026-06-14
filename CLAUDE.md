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
