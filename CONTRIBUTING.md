# Contributing

This repository is the public status page for tempus.build. Most of its content —
uptime history, response-time graphs, the README status table, and incident issues — is
**generated automatically** by [Upptime](https://upptime.js.org) from `.upptimerc.yml`;
those files must not be hand-edited (the bot overwrites them).

## What we accept

- **Issues** — reporting that the status page itself is wrong, broken, or misleading
  (e.g. a monitor is misconfigured, the site fails to build). These are welcome.
- We generally **do not** accept feature pull requests here. The configuration
  (`.upptimerc.yml`) and the workflow setup are maintained by the tempus.build team.

To report an outage of the tempus.build **product**, you don't need this repo — the page
at <https://status.tempus.build> reflects it automatically.

## If you do open a PR

- Keep changes scoped to `.upptimerc.yml`, docs, or repo config. The
  `.github/workflows/` files are SHA-pinned and hand-maintained (see the
  [README](./README.md)); Renovate bumps the pins. Don't run `upptime update-template`.
- Action pins are by commit SHA. Don't downgrade them to tags.
- By contributing you agree to the [Code of Conduct](./CODE_OF_CONDUCT.md) and license
  your contribution under the repository's [MIT License](./LICENSE).
