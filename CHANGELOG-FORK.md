# Changelog des Forks

Dieser Fork basiert auf [bkd3sign/kleinanzeigen-bot-ui](https://github.com/bkd3sign/kleinanzeigen-bot-ui)
v2.77.5. Die Datei beschreibt den **gesamten Unterschied zum Original**, nicht nur die Änderungen
seit dem letzten Release. Der Fork ist weitgehend vibe-coded (KI-unterstützt entwickelt); die
Änderungen sind durch Tests, CodeQL, Trivy und Dependency-Review abgesichert, eine Garantie gibt
es nicht.

Die Upstream-Changelog-Einträge (bis 2.40.1) stehen in [CHANGELOG.md](CHANGELOG.md).

---

## v2.77.5-fork2

Behebt drei offene Upstream-Issues ([PR #13](https://github.com/andreas13xxx/kleinanzeigen-bot-ui/pull/13)).

### Fixed
- **Bild-Upload scheitert mit HTTP 413** (Upstream #23): `client_max_body_size 200m` in `docker/nginx.conf`. Der nginx-Standard von 1 MB wies Handyfotos ab, bevor die App sie sah.
- **Zeitpläne schlagen im Einzelbenutzer-Betrieb mit ENOENT fehl** (Upstream #24): Der Scheduler bestimmt den Workspace jetzt über `getUserWorkspace()` und fällt ohne `users/<id>/` auf das Basisverzeichnis zurück.
- **Cron `*/N`, Listen und Tag-Schritte** (Upstream #27): Die nächste Ausführung wird mit `cron-parser` berechnet, "Invalid time value" tritt nicht mehr auf. Die Anzeige im UI ist für `*/N`-Stunden, Stundenlisten, Tag-Schritte und Tag-Listen korrekt. Neues Preset "Alle 3 Tage".
- Cron-Ausdruck steht nicht mehr im Log-Format-String (CodeQL-Fund).

### Changed
- Build-Attestation nur noch auf GitHub.

---

## v2.77.5-fork1

Erstes Fork-Release. Alles Folgende unterscheidet den Fork von Upstream v2.77.5.

### Browser und Login
- **Sichtbarer Browser als Standard.** Kleinanzeigen blockiert Headless-Chromium (Login scheitert mit `IP_RANGE_BLOCKED`). `browser.mode` ist jetzt standardmäßig `visible`.
- **Nativer Chrome auf dem Desktop** (macOS/Windows/Linux mit `DISPLAY`) statt Xvnc. Der VNC-Pfad wird nur auf Servern ohne Display genutzt.
- **VNC-Anzeige in Desktop-Größe** (1280x900, per `VNC_GEOMETRY` änderbar) statt 520x600. Die Größe bleibt erhalten, solange ein Bot-Job im Browser läuft. (Upstream #25)
- `--headless` ist nicht mehr hartkodiert; der Modus wird pro Lauf gesetzt. (Upstream #17, Ursache im Image nicht abschließend verifiziert)

### Docker und Betrieb
- **Bot-Sync beim Start:** Der Entrypoint holt den aktuellen kleinanzeigen-bot; das gebündelte Binary wird nur bei neuer Version ersetzt.
- **Chromium und Basis-Image aktualisiert.**
- `BOT_TIMEOUT_MULTIPLIER` per Umgebungsvariable, um die Bot-Timeouts zu verlängern.
- Deployment-Anleitung in `docker/DEPLOYMENT.md`.
- Fertiges Image: `ghcr.io/andreas13xxx/kleinanzeigen-bot-ui`.

### Fehlerbehandlung
- **Bekannte Bot-Fehler werden im Job-Log erklärt**, mit Ursache und Lösungshinweis.
- `GIVE_AWAY`-Anzeigen schreiben keinen Preis mehr.

### Sicherheit
- **Path Traversal beim Anlegen von Anzeigen** (Template-Slug und Bildnamen) behoben, Pfad wird zusätzlich an der Kopierstelle geprüft.
- **SSRF-Härtung des Bild-Proxys** (Host-Prüfung, Authentifizierung, Redirects) mit Tests.
- `npm audit fix` (next 15.5.18 -> 15.5.28 und transitive Pakete).
- [SECURITY.md](SECURITY.md) mit Meldeweg über Private Vulnerability Reporting.

### CI/CD
- Quality Gate (Lint, Typecheck, Tests, Build), Trivy, Secret Scan, `npm audit`, Dependency Review, CodeQL, Dockerfile-Lint.
- Dependabot.
- Eine Release-Pipeline pro Version-Tag (`v*`): baut, scannt und pusht das Image und legt das GitHub-Release an. Ein neuer Bot löst über bot-watch automatisch einen Rebuild aus.

---

## Noch nicht behoben (Upstream)

- #26: Der Bot dockt im Container an den Kiosk-Browser an (Bild-Uploads, Fenstergröße).
- #28, #29: Fehler im Bot selbst (Download, Publish). Der Bot-Sync beim Start holt Korrekturen, sobald sie dort veröffentlicht sind.
