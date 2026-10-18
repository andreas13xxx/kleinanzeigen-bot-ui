/**
 * Turns the bot's cryptic failure output into hints the user can act on.
 *
 * The bot logs the symptom ("Page did not finish loading", "IP_RANGE_BLOCKED", a viewport warning)
 * but not the cause or the fix, and the UI used to show only a status such as "Login erforderlich".
 * Each rule here maps a signature we have actually seen to its usual cause. Pure and exported
 * for unit testing.
 */

export interface DiagnosticContext {
  /** Configured browser mode of the run. */
  browserMode: 'auto' | 'headless' | 'visible';
  /** Whether the run attached to the Xvnc browser (Docker) instead of opening its own. */
  attached: boolean;
}

interface Rule {
  test: RegExp;
  /** Skip the hint when this returns true (e.g. already running the recommended setup). */
  unless?: (ctx: DiagnosticContext) => boolean;
  hint: (match: RegExpExecArray, ctx: DiagnosticContext, output: string) => string;
}

/** Path of the ad file the bot was loading last — the one a validation error belongs to. */
function lastLoadedAd(output: string): string | undefined {
  const all = [...output.matchAll(/Loading ad from \[([^\]]+)\]/g)];
  return all.at(-1)?.[1];
}

const RULES: Rule[] = [
  {
    // The bot rejects any price (even 0) on a "zu verschenken" ad. Older UI versions wrote
    // price: 0; saving the ad again in the UI removes the key.
    test: /price must not be specified when price_type is GIVE_AWAY/,
    hint: (_m, _ctx, output) => {
      const file = lastLoadedAd(output);
      return (
        `Die Anzeige${file ? ` „${file}"` : ''} hat den Preistyp „Zu verschenken" und trotzdem einen Preis. ` +
        'Der Bot erlaubt dann keinen Preis, auch nicht 0. Die Anzeige in der UI öffnen und speichern ' +
        '(entfernt den Preis) oder die Zeile „price:" in der YAML-Datei löschen.'
      );
    },
  },
  {
    // Auth0 rejected the login after the password was submitted. The page says "IP-Bereich
    // vorübergehend gesperrt", but the IP is rarely the cause: the same IP logs in fine from a
    // visible browser — headless browsers are what gets rejected.
    test: /IP_RANGE_BLOCKED/,
    unless: ctx => ctx.browserMode === 'visible',
    hint: () =>
      'Der Login wurde von Kleinanzeigen abgelehnt („IP-Bereich vorübergehend gesperrt"). ' +
      'Meist liegt das nicht an der IP, sondern daran, dass ein Headless-Browser erkannt wird. ' +
      'Einstellungen → Browser-Modus „Immer sichtbar" wählen und den Job erneut starten.',
  },
  {
    test: /IP_RANGE_BLOCKED/,
    unless: ctx => ctx.browserMode !== 'visible',
    hint: () =>
      'Der Login wurde von Kleinanzeigen abgelehnt („IP-Bereich vorübergehend gesperrt"), obwohl ein sichtbarer ' +
      'Browser läuft. Dann ist die IP tatsächlich vorübergehend gesperrt (VPN/Rechenzentrum, zu viele Versuche): ' +
      'einige Stunden warten und keine weiteren Login-Versuche starten.',
  },
  {
    test: /Page did not finish loading within ([\d.]+) seconds/,
    hint: m =>
      `Eine Seite wurde nicht innerhalb von ${m[1]} Sekunden fertig geladen. Auf langsamen Servern hilft ein größerer ` +
      'Zeitfaktor: BOT_TIMEOUT_MULTIPLIER (z. B. 3) in der docker-compose.yml setzen und den Container neu starten, ' +
      'oder timeouts.multiplier in der config.yaml erhöhen.',
  },
  {
    test: /Anzeigebereich des Browsers ist nur (\d+) Pixel breit/,
    hint: (m, ctx) =>
      `Das Browserfenster ist nur ${m[1]} Pixel breit; Kleinanzeigen liefert unter 768 Pixeln das Mobil-Layout, ` +
      'in dem Menüs nicht klickbar sind. ' +
      (ctx.attached
        ? 'Im Docker-Betrieb VNC_GEOMETRY (Standard 1280x900) prüfen und das Ansichtsfenster während eines Laufs ' +
          'nicht verkleinern.'
        : '--window-size=1440,900 in browser.arguments setzen.'),
  },
  {
    test: /Xvnc[^\n]*(ENOENT|konnte nicht gestartet)/i,
    hint: () =>
      'Xvnc ist auf diesem System nicht installiert. Der VNC-Browser gibt es nur im Docker-Image und im ' +
      'Linux-Installer. Auf macOS/Windows den Browser-Modus „Immer sichtbar" nutzen: der Bot öffnet dann ein ' +
      'normales Chrome-Fenster.',
  },
  {
    test: /Failed to connect to browser|Fehler beim Starten des Browsers/,
    hint: () =>
      'Der Browser ließ sich nicht starten. Häufigste Ursache: Ein anderer Chrome-Prozess hält das ' +
      'Browser-Profil (.temp/browser-profile) gesperrt, etwa ein hängengebliebener Lauf. Laufende Jobs und ' +
      'geöffnete Browserfenster beenden und erneut starten.',
  },
];

/** Hints for the given bot output; empty when nothing recognisable is in it. */
export function diagnoseJobOutput(output: string, ctx: DiagnosticContext): string[] {
  const hints: string[] = [];
  for (const rule of RULES) {
    if (rule.unless?.(ctx)) continue;
    const match = rule.test.exec(output);
    if (!match) continue;
    const hint = rule.hint(match, ctx, output);
    if (!hints.includes(hint)) hints.push(hint);
  }
  return hints;
}

/** Block appended to the job log so the hints show up where the user is already looking. */
export function formatHints(hints: string[]): string {
  if (hints.length === 0) return '';
  return ['', '--- Hinweise der Bot-UI ---', ...hints.map(h => `• ${h}`), ''].join('\n');
}
