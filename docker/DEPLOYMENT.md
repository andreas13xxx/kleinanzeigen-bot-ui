# CI/CD

```
PR / push to main ──► CI (lint, tsc, vitest, build, hadolint, image build + Trivy)
                      Security (dependency review, npm audit, gitleaks, Trivy fs)
                      CodeQL via GitHub "Default setup" (Settings -> Code security, suite: Extended)
push of a v* tag ──┐
bot-watch (daily) ─┼─► Release: CI gate ─► build amd64 ─► Trivy scan ─► push multi-arch ─► attest
manual dispatch ───┘                                                          └─► GitHub release
                                                    deploy: manual, on the server (see below)
```

Nothing is deployed automatically. The pipeline only publishes the image to
`ghcr.io/andreas13xxx/kleinanzeigen-bot-ui`; rolling it out is a manual step on the server.

## Releases (this is a fork)

A fork starts without any releases or tags: GitHub does not copy them from the upstream
repository, and upstream's releases are not yours. Releases live per repository, so this fork
keeps its own, in its own tag namespace.

- **Version release:** use the upstream version the code is based on plus a fork counter, e.g.
  `v2.77.5-fork.1`, `v2.77.5-fork.2`. Upstream never produces such a tag, so it cannot collide
  with a tag you fetch from upstream later.
  ```bash
  git tag v2.77.5-fork.1 && git push origin v2.77.5-fork.1
  ```
  Or *Releases → Draft a new release → create the tag there*. Either way the **Release**
  workflow builds the image `…:v2.77.5-fork.1` (plus `latest`) and creates the GitHub release with
  generated notes. Do not click *Publish* on a second release for the same tag; an existing release
  is left alone.
- **Rebuild:** a manual run of *Release* (or `bot-watch` when upstream publishes a new bot) pushes
  `…:rebuild-<UTC date>` and creates a release of the same name. It does not take the *Latest* badge
  from the last version release.
- The release workflow does not run on `release: published`; the tag push is the single trigger.
  A release you create in the web UI pushes its tag, which starts the workflow once.

## Keeping the bot current

Three layers, because the bot lives in a volume that outlives the image:

1. **bot-watch** compares the SHA-256 of upstream's `latest` Linux assets with the labels
   (`bot.sha256.amd64` / `.arm64`) of the published image once a day and starts **Release** when
   they differ. The digests are also build args, so a new bot invalidates the cached download layer
   and the download is verified against them.
2. **You deploy** the new image (below).
3. **entrypoint.sh** copies the bundled bot into `/workspace/bot/` when the image ships a different
   bot than the one last synced (`/workspace/bot/.image-bot-version`). A bot updated in-app between
   two image builds is kept until the next image brings a new one. `BOT_AUTO_SYNC=false` disables it.

## Deploying (manual, on docker.fritz.box)

```bash
cd /opt/kleinanzeigen-bot-ui
docker compose pull          # fetch the new image
docker compose up -d         # recreate the container with it
docker compose ps            # wait for "healthy"
```

Pin a specific version with `IMAGE_TAG` (e.g. `IMAGE_TAG=v2.77.5 docker compose up -d`). Roll back
the same way with the previous tag. The compose file in this folder can be used as-is; its
`image:` defaults to `ghcr.io/andreas13xxx/kleinanzeigen-bot-ui:latest`.

## One-time setup

1. **Package visibility:** after the first Release run, set the `kleinanzeigen-bot-ui` package to
   *public* (GitHub → Packages → Package settings), or run `docker login ghcr.io` on the server with
   a token that has `read:packages`.
2. **Repo settings:** enable *Dependabot alerts/security updates*, *Secret scanning with push
   protection* and CodeQL *Default setup* under Settings → Code security. Make **CI** and
   **Security** required status checks on `main` (branch protection).

## Settings that used to be hand-edited in config.yaml

These live in the environment (`docker-compose.yml`) so a re-run of the setup wizard cannot lose them:

| Variable | Default | Purpose |
|---|---|---|
| `BOT_TIMEOUT_MULTIPLIER` | empty (bot default) | Factor 1–10 for every bot timeout. Raise it (e.g. `3`) on slow hosts if jobs fail with "Page did not finish loading". Wins over `config.yaml`. |
| `VNC_GEOMETRY` | `1280x900` | Size of the visible browser. Keep the width ≥ 768 px, otherwise kleinanzeigen.de serves its mobile layout. |
| `BOT_AUTO_SYNC` | `true` | Replace the bot in the volume when the image ships a different one. |

The browser mode now defaults to **visible** (fresh installs). Headless logins are rejected by
kleinanzeigen.de; the bot then reports `IP_RANGE_BLOCKED` even though the IP is fine. Existing
installs keep whatever `browser.mode` their `config.yaml` has.

Failed jobs get a "Hinweise der Bot-UI" block at the end of the job log that translates the usual
symptoms (rejected headless login, slow page load, narrow viewport, missing Xvnc, locked browser
profile) into their likely cause and the fix.
