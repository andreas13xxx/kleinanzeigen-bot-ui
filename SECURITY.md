# Security Policy

## Supported Versions

Security fixes are provided for the latest release only (currently the 2.x line, see
[Releases](https://github.com/andreas13xxx/kleinanzeigen-bot-ui/releases/latest)).
Older versions do not receive patches; please update to the latest version first.

| Version        | Supported |
| -------------- | --------- |
| latest release | ✅        |
| older releases | ❌        |

## Reporting a Vulnerability

**Please do not report security vulnerabilities via public issues, discussions or pull requests.**

Use GitHub's private vulnerability reporting instead:

1. Open the [Security tab](https://github.com/andreas13xxx/kleinanzeigen-bot-ui/security) of this repository.
2. Click **Report a vulnerability**.
3. Describe the problem as precisely as you can.

Helpful details:

- affected version / image tag and deployment type (Docker or local)
- steps to reproduce or a proof of concept
- expected impact (e.g. authentication bypass, access to other users' data, credential leak)
- any suggested fix

## What to Expect

This is a one-person, best-effort project. Targets:

- acknowledgement within **7 days**
- initial assessment within **14 days**
- fix or mitigation as soon as reasonably possible, depending on severity

You will be kept informed about progress. Once a fix is released, the advisory is published
and, if you wish, you are credited as the reporter.

Please allow a reasonable time to fix the issue before any public disclosure (coordinated disclosure).

## Scope

In scope:

- the web UI and API of this repository (authentication, user/session handling, file and path handling, command execution)
- the Docker image and compose files in `docker/`

Out of scope:

- vulnerabilities in the upstream [kleinanzeigen-bot](https://github.com/Second-Hand-Friends/kleinanzeigen-bot) itself (report them there)
- vulnerabilities in the upstream project [bkd3sign/kleinanzeigen-bot-ui](https://github.com/bkd3sign/kleinanzeigen-bot-ui) that are not present in this fork (report them there)
- vulnerabilities in third-party dependencies without a demonstrable impact on this project (Dependabot and CI scans cover these)
- findings that require a misconfigured or already compromised host
- exposing the UI directly to the internet without a reverse proxy / TLS (not a supported setup)
- denial of service through excessive resource use by authenticated admins
- automated scanner output without a concrete exploit scenario

## Deployment Hardening

- Run the UI behind a reverse proxy with TLS and do not expose it directly to the internet.
- Use strong, unique credentials for all UI users and keep the secrets in `.env.local` / compose environment private.
- Keep the image up to date (pin a version via `IMAGE_TAG`, update regularly).
- Do not publish `users.yaml`, `config.yaml`, `.bot-config.yaml` or browser profile data.

## Automated Security Measures

CI runs dependency review, `npm audit`, secret scanning and Trivy; CodeQL runs via GitHub's default
setup and Dependabot keeps npm, GitHub Actions and Docker dependencies current.
