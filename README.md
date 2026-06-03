# RFBE — Refkinscallv Backend Framework

[![CI](https://github.com/refkinscallv/rfbe/actions/workflows/ci.yml/badge.svg)](https://github.com/refkinscallv/rfbe/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/create-rfbe.svg)](https://www.npmjs.com/package/create-rfbe)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

A quick-action backend framework for Node.js. RFBE wires the pieces you reach
for on almost every project — HTTP, database, auth, scheduling, queues and
realtime — into a small set of cores with one central configuration file. You
write controllers, models and jobs; the framework handles the boot order,
graceful shutdown and the wiring in between.

## Why RFBE

- **One config surface.** Everything is driven by `.env` and `src/config.js`.
- **Laravel-style routing** via [`@refkinscallv/express-routing`](https://github.com/refkinscallv/express-routing).
- **Batteries included.** Database, JWT, cron, queue, sockets and a rich set of
  helper utilities ship in the box.
- **Predictable lifecycle.** A single bootstrapper starts the cores in order and
  tears them down cleanly on `SIGINT` / `SIGTERM`.

## Tech Stack

| Concern        | Library                             |
| -------------- | ----------------------------------- |
| HTTP server    | express 5                           |
| Routing        | @refkinscallv/express-routing       |
| Database / ORM | sequelize 6 + mysql2                |
| Auth tokens    | jsonwebtoken                        |
| Passwords      | bcrypt                              |
| Scheduling     | node-cron                           |
| Realtime       | socket.io                           |
| Security       | helmet, cors, express-rate-limit    |
| Uploads        | multer                              |
| HTTP client    | axios                               |
| Mail           | nodemailer                          |
| Logging        | winston + winston-daily-rotate-file |
| Validation     | zod                                 |

## Project Structure

```
rfbe/
├── bootstrap/
│   └── index.js              # process entry: dotenv + aliases + Bootstrap.run()
├── core/                     # framework internals (do not edit per-project)
│   ├── common/               # utility modules
│   │   ├── array.js  string.js  object.js  url.js   path.js
│   │   ├── hash.js   crypt.js   collection.js        date.js
│   │   └── cache.js  storage.js
│   ├── common.core.js        # facade: env readers + utility namespaces
│   ├── bootstrap.core.js     # boot order + graceful shutdown
│   ├── express.core.js       # HTTP backbone
│   ├── database.core.js      # Sequelize: models, migrate, seed, sync, scaffold
│   ├── jwt.core.js           # access / refresh tokens
│   ├── mailer.core.js        # nodemailer wrapper
│   ├── response.core.js      # standard response envelope
│   ├── validator.core.js     # Zod schema -> route middleware
│   ├── cron.core.js          # scheduled jobs
│   ├── queue.core.js         # in-process job queue
│   ├── socket.core.js        # socket.io
│   ├── hooks.core.js         # lifecycle hooks
│   ├── logger.core.js  error.core.js  runtime.core.js
├── scripts/
│   ├── setup.js              # `npm run setup`
│   └── db.js                 # database CLI (migrate / seed / make:model / ...)
├── src/                      # your application
│   ├── config.js             # central configuration
│   ├── http/
│   │   ├── controllers/      # request handlers
│   │   ├── middleware/       # register.middleware.js (global) + route guards
│   │   └── validator/        # Zod request schemas
│   ├── models/               # Sequelize model factories
│   ├── routes/register.route.js
│   ├── jobs/register.job.js
│   ├── queue/register.queue.js
│   ├── socket/register.socket.js
│   ├── hooks/register.hook.js    # _sample.hook.js shows every stage
│   └── database/
│       ├── migrations/
│       └── seeders/
├── .env / .env.example
└── package.json
```

The `@core` and `@app` import aliases (configured in `package.json`) map to
`core/` and `src/` respectively, so you write `require('@core/jwt.core')` and
`require('@app/config')` from anywhere.

## Installation

Requirements: Node.js 18+ and a MySQL server.

### Scaffold a new project (recommended)

```bash
# via npm create (published as the create-rfbe initializer)
npm create rfbe@latest my-app

# or straight from GitHub, no publish required
npx degit refkinscallv/rfbe my-app && cd my-app && npm install && npm run setup
```

The scaffolder copies the template, installs dependencies, writes `.env`, and
generates `APP_KEY`, `JWT_SECRET` and `JWT_REFRESH_SECRET`. Flags: `--no-install`
and `--no-git`.

> The npm initializer is published as the **`create-rfbe`** package, which is
> what `npm create rfbe@latest` resolves to.

### Clone this repository

```bash
git clone https://github.com/refkinscallv/rfbe.git
cd rfbe
npm install
npm run setup
```

`npm run setup` installs any missing dependencies, creates `.env` from
`.env.example`, and generates `APP_KEY`, `JWT_SECRET` and `JWT_REFRESH_SECRET`.

## Quick Start

1. Create the database referenced by `DB_NAME` (default `rfbe`).
2. Run the migrations and seed the baseline data:

    ```bash
    npm run db:migrate
    npm run db:seed
    ```

3. Start the server:

    ```bash
    npm run dev      # nodemon, auto-reload
    # or
    npm start        # plain node
    ```

4. Verify it is up:

    ```bash
    curl http://localhost:3000/
    curl http://localhost:3000/home/health
    curl http://localhost:3000/api/ping
    ```

## Usage

### Define a route

`src/routes/register.route.js`:

```js
const Routes = require('@refkinscallv/express-routing');
const Validator = require('@core/validator.core');
const UserController = require('@app/http/controllers/user.controller');
const AuthMiddleware = require('@app/http/middleware/auth.middleware');
const { createUserSchema } = require('@app/http/validator/user.validator');

// Auto-mount a controller's methods
Routes.controller('/users', UserController);

// Per-route validation + auth guard
Routes.middleware([AuthMiddleware]).post('/users', UserController, [Validator.make(createUserSchema)]);
```

### Write a controller

Handlers receive a single `{ req, res, next, error }` object. `res` is decorated
with the standard response envelope helpers (`res.success`, `res.error`,
`res.respond`).

```js
class UserController {
	static async index({ res }) {
		const users = await User.findAll();
		res.success(users, 'Users loaded');
	}
}
module.exports = UserController;
```

Every response follows one shape — `{ status, code, message, data, meta, errors,
additional }` — including validation failures and errors. See
[Response](API.md#response).

### Use the cores

```js
const Jwt = require('@core/jwt.core');
const Common = require('@core/common.core');
const Queue = require('@core/queue.core');

const tokens = Jwt.issue({ id: user.id });
const slug = Common.Str.slug('Hello World'); // 'hello-world'
const hash = await Common.Hash.make('secret');
Queue.dispatch('emails', { to: user.email });
```

See [API.md](API.md) for the full reference of every core.

## Configuration

All configuration lives in [`src/config.js`](src/config.js) and is sourced from
environment variables with sensible defaults. Never read `process.env` directly
in application code — add a key to `config.js` and read it from there.

Key groups: `app`, `database`, `jwt`, `bcrypt`, `cors`, `express`, `rateLimit`,
`upload`, `axios`, `logging`, `runtime`, `storage`, `cache`, `cron`, `queue`,
`socket`, `mail`. Every key maps to an environment variable documented in
[`.env.example`](.env.example).

Toggle whole subsystems from `.env`: `DB_ENABLED`, `CRON_ENABLED`,
`QUEUE_ENABLED`, `SOCKET_ENABLED`, `MAIL_ENABLED`. When disabled, the matching
core is skipped at boot, so you can run, say, an HTTP-only service with
`DB_ENABLED=false`.

## Models vs Migrations

These two concepts are easy to confuse, so to be explicit:

- **Models** (`src/models/*.model.js`) are how your application reads and writes
  data at runtime. They are loaded when the app boots.
- **Migrations** (`src/database/migrations/*.js`) are versioned schema changes
  (DDL). They are the source of truth for your database structure and run
  through the CLI — never automatically at boot.

There are two ways to get tables in place:

1. **Migrations (recommended, works in production).** Author migrations and run
   `npm run db:migrate`. Set `DB_AUTO_MODEL=true` to have `migrate` scaffold a
   model file for any table that does not have one yet (existing files are never
   overwritten). You can also scaffold on demand with `npm run db:make:model`.
2. **Model sync (development convenience only).** Set `DB_SYNC=true` to have the
   framework mirror your **models** to tables on boot via Sequelize `sync()`
   (optionally `DB_ALTER`/`DB_FORCE`). Do not use this in production.

So: write models by hand and let `DB_SYNC` build tables in dev, **or** write
migrations and let `DB_AUTO_MODEL` scaffold the models for you. Pick one
direction per project to avoid surprises.

## Database CLI

```bash
npm run db:migrate           # apply pending migrations (scaffolds models if DB_AUTO_MODEL=true)
npm run db:rollback          # roll back the last batch
npm run db:reset             # roll back everything, then migrate
npm run db:fresh             # drop all tables and migrate (add -- --seed to seed)
npm run db:seed              # run seeders
npm run db:sync              # sync models to the schema (-- --force / -- --alter)
npm run db:make:model        # scaffold model file(s) from existing tables
```

## License

Released under the [MIT License](LICENSE).
