# RFBE API Reference

This document covers each core under `core/` and how to use it from your
application. Import paths use the `@core` and `@app` aliases.

- [Common](#common)
    - [Environment readers](#environment-readers)
    - [Generic helpers](#generic-helpers)
    - [Arr](#commonarr) · [Str](#commonstr) · [Obj](#commonobj) · [Url](#commonurl) · [Path](#commonpath)
    - [Hash](#commonhash) · [Crypt](#commoncrypt) · [Collection](#commoncollection)
    - [Date](#commondate) · [Cache](#commoncache) · [Storage](#commonstorage)
- [Response](#response)
- [JWT](#jwt)
- [Validator](#validator)
- [Database](#database)
- [Express](#express)
- [Mailer](#mailer)
- [Cron](#cron)
- [Queue](#queue)
- [Socket](#socket)
- [Hooks](#hooks)
- [Logger, Error, Runtime](#logger-error-runtime)

---

## Common

```js
const Common = require('@core/common.core');
```

The facade exposes environment readers, a few generic helpers, and the utility
namespaces (`Common.Str`, `Common.Arr`, …). Each namespace can also be required
directly, e.g. `require('@core/common/string')`.

### Environment readers

Used by `src/config.js`; prefer reading from `config` in application code.

| Method                      | Description                                     |
| --------------------------- | ----------------------------------------------- |
| `getEnv(key, default)`      | String value or default.                        |
| `getEnvInt(key, default)`   | Parsed integer or default.                      |
| `getEnvFloat(key, default)` | Parsed float or default.                        |
| `getEnvBool(key, default)`  | Truthy strings (`true/1/yes/on/...`) → boolean. |

### Generic helpers

| Method           | Description                                               |
| ---------------- | --------------------------------------------------------- |
| `sleep(ms)`      | Promise that resolves after `ms`.                         |
| `isEmpty(value)` | True for null/undefined/empty string/array/object.        |
| `attempt(fn)`    | Runs `fn`, returns `[error, result]` instead of throwing. |

### Common.Arr

```js
Common.Arr.chunk([1, 2, 3, 4, 5], 2); // [[1,2],[3,4],[5]]
Common.Arr.unique([1, 1, 2]); // [1, 2]
Common.Arr.groupBy(users, 'role'); // { admin: [...], user: [...] }
```

`wrap`, `first`, `last`, `unique`, `flatten`, `chunk`, `groupBy`, `keyBy`,
`pluck`, `sum`, `avg`, `shuffle`, `random`, `difference`, `intersect`,
`compact`, `range`.

### Common.Str

```js
Common.Str.slug('Hello World!'); // 'hello-world'
Common.Str.camel('hello_world'); // 'helloWorld'
Common.Str.random(16); // random hex token
Common.Str.uuid(); // RFC4122 v4 uuid
```

`ucfirst`, `lcfirst`, `title`, `words`, `camel`, `pascal`, `snake`, `kebab`,
`slug`, `truncate`, `limitWords`, `startsWith`, `endsWith`, `contains`, `start`,
`finish`, `mask`, `random`, `uuid`, `escapeHtml`, `isEmpty`.

### Common.Obj

```js
Common.Obj.get(data, 'user.address.city', 'N/A');
Common.Obj.set(data, 'user.active', true);
Common.Obj.pick(user, ['id', 'name']);
```

`get`, `set`, `has`, `forget`, `pick`, `omit`, `merge`, `clone`, `isPlain`,
`isEmpty`, `fromEntries`, `mapValues`, `flatten`.

### Common.Url

```js
Common.Url.buildQuery({ page: 2, tags: ['a', 'b'] }); // 'page=2&tags=a&tags=b'
Common.Url.withQuery('https://x.dev/p', { ref: 'home' });
Common.Url.parse('https://x.dev/p?q=1');
```

`join`, `buildQuery`, `parseQuery`, `withQuery`, `parse`, `isValid`.

### Common.Path

Paths anchored at the project root.

```js
Common.Path.base('storage', 'uploads'); // absolute path
Common.Path.ensureDir(Common.Path.storage('cache'));
```

`base`, `src`, `core`, `storage`, `public`, `join`, `resolve`, `dirname`,
`basename`, `extension`, `filename`, `relative`, `exists`, `isFile`, `isDir`,
`ensureDir`.

### Common.Hash

```js
const hash = await Common.Hash.make('password');
const ok = await Common.Hash.check('password', hash);
Common.Hash.sha256('payload');
Common.Hash.hmac('payload', secret);
```

`make`, `check`, `needsRehash`, `digest`, `md5`, `sha256`, `sha512`, `hmac`,
`equals` (constant-time).

### Common.Crypt

Authenticated symmetric encryption (AES-256-GCM) keyed from `APP_KEY`.

```js
const token = Common.Crypt.encrypt({ userId: 1 });
const data = Common.Crypt.decrypt(token, true); // { userId: 1 }
Common.Crypt.base64UrlEncode('x');
```

`encrypt`, `decrypt`, `base64Encode`, `base64Decode`, `base64UrlEncode`,
`base64UrlDecode`.

### Common.Collection

A chainable, immutable wrapper over arrays.

```js
Common.Collection.make(users).where('active', true).sortBy('name').pluck('email').all();
```

`all`, `count`, `isEmpty`, `map`, `filter`, `reject`, `each`, `reduce`, `where`,
`whereIn`, `first`, `last`, `pluck`, `unique`, `sortBy`, `groupBy`, `take`,
`skip`, `chunk`, `sum`, `avg`, `min`, `max`, `contains`, `reverse`, `toArray`,
`toJson`. Collections are iterable (`for...of`).

### Common.Date

A lightweight, immutable Carbon-like date wrapper.

```js
const Date = Common.Date;
Date.now().addDays(7).format('YYYY-MM-DD');
Date.parse('2026-01-01').diffForHumans(); // 'in 5 months'
Date.now().startOfDay().toISOString();
```

Factories: `now`, `parse`, `create`, `fromTimestamp`. Arithmetic:
`add/sub` × `Seconds/Minutes/Hours/Days/Weeks/Months/Years`. Also `startOfDay`,
`endOfDay`, `isBefore`, `isAfter`, `isSame`, `isPast`, `isFuture`, `diff`,
`diffForHumans`, `format`, `toISOString`, `toDate`, `timestamp`.

### Common.Cache

Process-local key/value cache with per-entry TTL (seconds; `0` = forever).

```js
Common.Cache.set('user:1', user, 300);
Common.Cache.get('user:1');
await Common.Cache.remember('stats', 60, async () => computeStats());
```

`set`, `get`, `has`, `forget`, `flush`, `remember`, `rememberForever`, `pull`,
`increment`, `decrement`, `keys`.

### Common.Storage

Filesystem storage rooted at `config.storage.root`. Paths are relative and
guarded against escaping the root.

```js
await Common.Storage.put('reports/q1.txt', 'hello');
await Common.Storage.get('reports/q1.txt');
await Common.Storage.exists('reports/q1.txt');
```

`path`, `exists`, `put`, `get`, `getBuffer`, `append`, `delete`, `copy`, `move`,
`makeDir`, `list`, `size`.

---

## Response

```js
const ApiResponse = require('@core/response.core');
```

Every HTTP response in the app shares one envelope so clients can rely on a
single contract:

```json
{
	"status": true,
	"code": 200,
	"message": "OK",
	"data": null,
	"meta": null,
	"errors": null,
	"additional": null
}
```

`status` is a boolean (derived from `code` when omitted — `< 400` is `true`).
The Express core decorates every `res` with helpers, so handlers usually never
import this core directly:

```js
// res.success(data, message, extra)
res.success(user, 'Profile loaded');
res.success(rows, 'OK', { meta: { page: 1, total: 42 } });

// res.error(code, message, extra)
res.error(404, 'User not found');
res.error(403, 'Forbidden', { errors: [{ field: 'role', message: 'insufficient' }] });

// res.respond(options) — full control over every field
res.respond({ status: true, code: 201, message: 'Created', data: created });
```

Outside a request (or to build a body without sending) use the static methods:

```js
ApiResponse.build({ code: 200, data }); // returns the envelope object
ApiResponse.send(res, { code: 201, data }); // writes it to a response
ApiResponse.success(res, { data });
ApiResponse.error(res, { code: 400, message: 'Bad input', errors });
```

Validation failures (Validator core) and uncaught errors / 404s (Error core) all
emit this same shape automatically — validation issues land in `errors`, and in
non-production the error stack is included under `additional`.

`build(options)`, `send(res, options)`, `success(res, options)`,
`error(res, options)`, `middleware()`.

---

## JWT

```js
const Jwt = require('@core/jwt.core');
```

```js
const tokens = Jwt.issue({ id: user.id });
// { accessToken, refreshToken, tokenType: 'Bearer', expiresIn }

const payload = Jwt.verify(tokens.accessToken);
const { valid, payload, error } = Jwt.tryVerify(token); // no throw
const bearer = Jwt.fromHeader(req.headers.authorization);
```

`sign`, `verify`, `signRefresh`, `verifyRefresh`, `issue`, `tryVerify`,
`tryVerifyRefresh`, `decode`, `expiresAt`, `isExpired`, `fromHeader`.

---

## Validator

```js
const Validator = require('@core/validator.core');
```

Turns a [Zod](https://zod.dev) schema into an express-routing middleware.
Validated data is attached to `req.validated[source]`; for the body it also
replaces `req.body`. On failure the request short-circuits with `422` and a flat
`errors` array of `{ field, message }`.

```js
const { z } = require('zod');
const loginSchema = z.object({ email: z.string().email(), password: z.string().min(6) });

// body (default), query, or params
Routes.post('/login', handler, [Validator.make(loginSchema)]);
Routes.get('/search', handler, [Validator.make(searchSchema, 'query')]);
```

`make(schema, source = 'body')`. Schemas live in `src/http/validator/`.

> `req.query` / `req.params` are read-only getters in Express 5, so only the body
> is replaced in place; validated query/params are read from `req.validated`.

---

## Database

```js
const Database = require('@core/database.core');
```

The bootstrapper calls `connect()` automatically (unless `DB_ENABLED=false`).
Models are loaded from `src/models`, migrations from `src/database/migrations`,
seeders from `src/database/seeders`.

**Models vs migrations:** models are the runtime read/write layer (loaded on
boot); migrations are versioned DDL run via the CLI and are the schema source of
truth. In dev you can let `DB_SYNC=true` build tables from models; alternatively
author migrations and let `DB_AUTO_MODEL=true` scaffold the models. See the
[Models vs Migrations](README.md#models-vs-migrations) section in the README.

```js
const User = Database.model('User');
const users = await User.findAll({ where: { active: true } });

await Database.sync({ alter: true }); // honours DB_FORCE / DB_ALTER defaults
await Database.migrate(); // scaffolds models too when DB_AUTO_MODEL=true
await Database.seed();
await Database.reset(); // rollback all, then migrate
await Database.fresh({ seed: true }); // drop all, migrate, seed (non-prod)

await Database.generateModels(); // scaffold models for all tables missing one
await Database.makeModel('users'); // scaffold a single model from a table
```

`connect`, `disconnect`, `loadModels`, `model`, `sync`, `migrate`, `rollback`,
`reset`, `fresh`, `seed`, `generateModels`, `makeModel`. The Sequelize primitives
are re-exported as `Database.Sequelize`, `Database.DataTypes`, `Database.Model`,
`Database.Op`.

**Model factory** (`src/models/*.model.js`):

```js
module.exports = (sequelize, DataTypes) => {
	const Post = sequelize.define('Post', { title: DataTypes.STRING }, { tableName: 'posts' });
	Post.associate = (models) => Post.belongsTo(models.User, { foreignKey: 'user_id' });
	return Post;
};
```

**Migration** (`src/database/migrations/*.js`):

```js
module.exports = {
	async up({ queryInterface, Sequelize }) {
		/* createTable ... */
	},
	async down({ queryInterface }) {
		/* dropTable ... */
	},
};
```

---

## Express

```js
const Express = require('@core/express.core');
```

Builds the Express app with helmet, CORS, compression, rate limiting and body
parsing, runs your global middleware registrar, mounts the route table from
`src/routes/register.route.js`, and creates the shared `http.Server`. Usually you
only interact with it through the bootstrapper, but it also exposes a multer
helper for uploads:

```js
const upload = Express.upload('avatar'); // multer single-file middleware
Routes.post('/profile/avatar', handler, [upload]);
```

`create`, `listen`, `close`, `upload`. The instances are available as
`Express.app` and `Express.server`.

**Global middleware** (`src/http/middleware/register.middleware.js`) runs on
every request, after the built-in stack and before routes:

```js
module.exports = class MiddlewareRegister {
	static async set(app) {
		app.use((req, res, next) => {
			res.setHeader('X-Request-Id', require('crypto').randomUUID());
			next();
		});
	}
};
```

**Route middleware** is a class exposing `handle({ req, res, next, error })`
(see `src/http/middleware/auth.middleware.js`):

```js
class AuthMiddleware {
	static handle({ req, res, next }) {
		/* verify token, set req.user, call next() */
	}
}
// attach per route
Routes.middleware([AuthMiddleware]).get('/me', handler);
Routes.get('/admin', handler, [AuthMiddleware]);
```

---

## Mailer

```js
const Mailer = require('@core/mailer.core');
```

A thin wrapper over nodemailer driven by `config.mail`. The SMTP transport is
created lazily and cached. When `MAIL_ENABLED=false` (the dev default) sends are
skipped and logged, so `Mailer.send(...)` is safe to call without a live server.

```js
await Mailer.send({
	to: 'user@example.com',
	subject: 'Welcome',
	html: '<h1>Hello</h1>',
	text: 'Hello',
});

await Mailer.verify(); // check SMTP connectivity (true/false)
```

`send(message)`, `verify()`. Pair it with the queue to send off the request
path: `Queue.dispatch('emails', { to, subject, html })`.

---

## Cron

```js
// src/jobs/register.job.js
module.exports = (Cron) => {
	Cron.define('cleanup', '0 3 * * *', async () => {
		/* ... */
	});
};
```

`define(name, expression, handler, options)`, `start`, `stop`, `runNow(name)`,
`remove(name)`, `list`. Options: `timezone`, `runOnInit`. Disable globally with
`CRON_ENABLED=false`.

---

## Queue

An in-process job queue with bounded concurrency and retry-with-backoff. Define
workers in `src/queue/register.queue.js`; dispatch from anywhere.

```js
// register
module.exports = (Queue) => {
	Queue.define(
		'emails',
		async (payload, job) => {
			await mailer.send(payload);
		},
		{ concurrency: 2, maxRetries: 3 },
	);
};

// dispatch
const Queue = require('@core/queue.core');
Queue.dispatch('emails', { to: 'a@b.dev' });
Queue.dispatch('emails', { to: 'a@b.dev' }, { delay: 5000 }); // run in 5s
Queue.stats(); // { emails: { pending, active } }
```

`define`, `dispatch`, `start`, `stop`, `stats`. Disable with `QUEUE_ENABLED=false`.

> For multi-process durability swap the internals for BullMQ + Redis — the
> `define` / `dispatch` surface stays the same.

---

## Socket

Socket.IO sharing the Express HTTP server. Handlers live in
`src/socket/register.socket.js`.

```js
// register
module.exports = (io, Socket) => {
	io.on('connection', (socket) => {
		socket.on('chat:message', (msg) => io.emit('chat:message', msg));
	});
};

// broadcast from elsewhere
const Socket = require('@core/socket.core');
Socket.broadcast('notice', { text: 'Maintenance soon' });
Socket.toRoom('room:1', 'update', payload);
```

`attach(server)`, `broadcast(event, payload)`, `toRoom(room, event, payload)`,
`close`. The server is at `Socket.io`. Disable with `SOCKET_ENABLED=false`.

---

## Hooks

Lifecycle extension points, implemented in `src/hooks/register.hook.js`:

```js
module.exports = class HookRegister {
	static async before() {
		/* before the server starts */
	}
	static async after() {
		/* after it is listening */
	}
	static async shutdown() {
		/* on SIGINT / SIGTERM */
	}
};
```

The Hooks core invokes `before`, `after` and `shutdown` at the matching points
in the boot sequence. `before`/`after` receive `{ config }` and `shutdown`
receives `{ signal }`. See `src/hooks/_sample.hook.js` for a fully worked
template (files prefixed with `_` are never loaded).

---

## Logger, Error, Runtime

- **Logger** (`@core/logger.core`) — a winston logger with colored console
  output and daily-rotated files. Use `logger.info/debug/warn/error(...)`.
- **Error** (`@core/error.core`) — process exception/rejection handlers plus the
  Express error and 404 middleware (mounted automatically).
- **Runtime** (`@core/runtime.core`) — applies process-level settings (timezone,
  max listeners, stack-trace limit, BigInt JSON serialization) from config.
