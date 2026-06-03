First complete release of **RFBE** — a quick-action backend framework for Node.js.

## Quick start

    npm create rfbe@latest my-app
    cd my-app
    npm run dev

Or straight from GitHub:

    npx degit refkinscallv/rfbe my-app && cd my-app && npm install && npm run setup

## Highlights

- **HTTP backbone** — Express 5 + Laravel-style routing (`@refkinscallv/express-routing`), helmet, CORS, compression, rate limiting, multer uploads.
- **Standard response envelope** — every reply is `{ status, code, message, data, meta, errors, additional }` via `res.success` / `res.error` / `res.respond`.
- **Database** — Sequelize models, migrations, seeders, `sync`/`reset`/`fresh`, and model scaffolding (`DB_AUTO_MODEL`, `db:make:model`).
- **Auth & validation** — JWT access/refresh tokens and Zod-powered request validation.
- **Background work** — cron jobs, an in-process queue (concurrency + retry/backoff), and Socket.IO realtime.
- **Mailer** — nodemailer with a no-op dev mode.
- **Utilities** — `Common.Str/Arr/Obj/Url/Path/Hash/Crypt/Collection/Date/Cache/Storage`.
- **One config surface** — everything driven by `.env` → `src/config.js`; toggle subsystems with `DB_ENABLED`, `CRON_ENABLED`, `QUEUE_ENABLED`, `SOCKET_ENABLED`, `MAIL_ENABLED`.
- **Lifecycle** — deterministic boot order with graceful shutdown on `SIGINT`/`SIGTERM`.

## Requirements

- Node.js >= 18
- MySQL (set `DB_ENABLED=false` to run without a database)

## Docs

[README](README.md) · [API reference](API.md) · [Contributing](CONTRIBUTING.md) · [Changelog](CHANGELOG.md)
