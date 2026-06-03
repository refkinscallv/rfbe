# Contributing to RFBE

Thanks for taking the time to contribute. This guide explains how to get set up
and what we expect from a pull request.

## Getting started

1. Fork the repository and clone your fork.
2. Install dependencies and bootstrap your environment:

    ```bash
    npm install
    npm run setup
    ```

3. Create a branch off `main`:

    ```bash
    git checkout -b feat/short-description
    ```

## Project layout

- `core/` holds the framework internals. Changes here affect every project built
  on RFBE — keep them generic and backward compatible.
- `src/` is the example application. Use it to demonstrate or test a feature.
- Configuration always flows through `.env` → `src/config.js`. Do not read
  `process.env` directly outside of `common.core.js` and `config.js`.

## Coding style

- CommonJS modules with `'use strict'` at the top of every file.
- Four-space indentation, no semicolons-at-all-costs — match the surrounding
  code. Run the formatter before committing:

    ```bash
    npm run format
    ```

- Cores are static classes named `<Thing>` exported from `<thing>.core.js`.
- Write comments that explain _why_, not _what_. Keep them short and human.
- Prefer the existing helpers in `Common` over adding new dependencies.

## Adding a dependency

New runtime dependencies should be rare and justified. In your PR description,
explain what the library does and why an in-house solution is not appropriate.
Install with an explicit latest version (`npm install <pkg>@latest`).

## Commit messages

Use clear, imperative subject lines, optionally with a conventional prefix:

```
feat(queue): add delayed dispatch support
fix(jwt): handle missing exp claim in isExpired
docs(api): document Common.Storage
```

## Pull requests

- Keep PRs focused on a single concern.
- Describe the change, the motivation, and any breaking impact.
- Make sure the app still boots (`npm run dev`) and the example routes respond.
- Update `API.md`, `README.md` and `CHANGELOG.md` when behavior changes.

## Continuous integration

Every push and pull request to `main` / `develop` runs the
[CI workflow](.github/workflows/ci.yml): it installs dependencies, checks
formatting with Prettier, and boots the app (database disabled) to confirm it
serves HTTP. Run `npx prettier --check .` locally before pushing.

## Releasing (maintainers)

Publishing is automated by the [Publish workflow](.github/workflows/publish.yml),
which runs when a **GitHub Release** is published and pushes the package to npm
as `create-rfbe` — the initializer behind `npm create rfbe@latest`.

One-time setup: add an npm automation token as the `NPM_TOKEN` repository secret
(Settings → Secrets and variables → Actions).

To cut a release:

1. Update `CHANGELOG.md` and bump the version in `package.json`.
2. Commit and push to `main`.
3. Create a GitHub Release with a tag `vX.Y.Z` (e.g. `v1.0.1`). The workflow
   syncs the package version to the tag and publishes to npm.

After it lands, `npm create rfbe@latest my-app` installs the new version.

## Reporting bugs

Open an issue with a minimal reproduction: what you did, what you expected, and
what actually happened, including Node version and relevant log output.

By contributing you agree that your work is licensed under the project's
[MIT License](LICENSE).
