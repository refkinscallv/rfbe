Database-backed queue persistence and cron execution history.

## What's new in 1.0.2

### Queue persistence (`queue_jobs`)

Jobs are now written to the database before they are processed. Each job
tracks its full lifecycle:

| Status       | Meaning                                              |
| ------------ | ---------------------------------------------------- |
| `pending`    | Waiting to be picked up                              |
| `processing` | Currently running                                    |
| `completed`  | Finished successfully                                |
| `failed`     | Exhausted all retries — kept as a dead-letter record |

On startup, any `pending` or interrupted `processing` jobs are automatically
re-enqueued, so no work is lost across restarts or crashes.

### Cron execution history (`cron_runs`)

Every cron execution is now recorded:

| Column                       | Content                             |
| ---------------------------- | ----------------------------------- |
| `started_at` / `finished_at` | Wall-clock timestamps               |
| `status`                     | `running` → `completed` or `failed` |
| `duration_ms`                | Elapsed time in milliseconds        |
| `error`                      | Error message on failure            |

### New environment variables

```env
QUEUE_PERSIST=true   # persist jobs to queue_jobs table
CRON_HISTORY=true    # record each cron run in cron_runs table
```

Both default to `true` when `DB_ENABLED=true`. Set to `false` to opt out
while keeping the rest of the database subsystem enabled.

Both tables are created automatically by the framework on first boot — no
migration step required.

---

## Quick start

    npm create rfbe@latest my-app
    cd my-app
    npm run dev

Or straight from GitHub:

    npx degit refkinscallv/rfbe my-app && cd my-app && npm install && npm run setup

## Requirements

- Node.js >= 18
- MySQL (set `DB_ENABLED=false` to run without a database)

## Docs

[README](README.md) · [API reference](API.md) · [Changelog](CHANGELOG.md)
