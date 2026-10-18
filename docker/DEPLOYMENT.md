# CI/CD

```
PR / push to main ──► CI (lint, tsc, vitest, build, hadolint, image build + Trivy)
                      Security (dependency review, npm audit, gitleaks, Trivy fs)
                      CodeQL via GitHub "Default setup" (Settings -> Code security, suite: Extended)
release published ─┐
bot-watch (daily) ─┼─► Release: CI gate ─► build amd64 ─► Trivy scan ─► push multi-arch ─► attest
manual dispatch ───┘
                                                    deploy: manual, on the server (see below)
```

Nothing is deployed automatically. The pipeline only publishes the image to
`ghcr.io/andreas13xxx/kleinanzeigen-bot-ui`; rolling it out is a manual step on the server.

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
