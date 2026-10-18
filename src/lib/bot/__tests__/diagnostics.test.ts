import { describe, it, expect } from 'vitest';
import { diagnoseJobOutput, formatHints } from '../diagnostics';

const desktop = { browserMode: 'auto', attached: false } as const;
const docker = { browserMode: 'visible', attached: true } as const;

describe('diagnoseJobOutput', () => {
  it('explains IP_RANGE_BLOCKED as headless detection and points to the visible mode', () => {
    const out = 'TimeoutError: Auth0-Verifikation nach Absenden blieb unklar: STILL_ON_PASSWORD_PAGE + IP_RANGE_BLOCKED';
    const [hint, ...rest] = diagnoseJobOutput(out, desktop);
    expect(rest).toHaveLength(0);
    expect(hint).toContain('Headless-Browser');
    expect(hint).toContain('Immer sichtbar');
  });

  it('does not blame headless when a visible browser is already in use', () => {
    const out = 'STILL_ON_PASSWORD_PAGE + IP_RANGE_BLOCKED';
    const [hint] = diagnoseJobOutput(out, docker);
    expect(hint).toContain('vorübergehend gesperrt');
    expect(hint).not.toContain('Immer sichtbar');
  });

  it('points slow page loads at the timeout factor and names the seconds from the log', () => {
    const [hint] = diagnoseJobOutput('[FEHLER] TimeoutError: Page did not finish loading within 15.0 seconds.', docker);
    expect(hint).toContain('15.0 Sekunden');
    expect(hint).toContain('BOT_TIMEOUT_MULTIPLIER');
  });

  it('reads the viewport width from the bot warning and adapts the advice to Docker vs desktop', () => {
    const out = '[WARNUNG] Der Anzeigebereich des Browsers ist nur 474 Pixel breit; kleinanzeigen.de liefert ...';
    expect(diagnoseJobOutput(out, docker)[0]).toMatch(/474 Pixel[\s\S]*VNC_GEOMETRY/);
    expect(diagnoseJobOutput(out, desktop)[0]).toMatch(/474 Pixel[\s\S]*--window-size/);
  });

  it('recognises a missing Xvnc on a desktop', () => {
    const [hint] = diagnoseJobOutput('Xvnc konnte nicht gestartet werden (ENOENT)', desktop);
    expect(hint).toContain('Immer sichtbar');
  });

  it('recognises a browser that did not start', () => {
    const [hint] = diagnoseJobOutput('Exception: Failed to connect to browser', desktop);
    expect(hint).toContain('Profil');
  });

  it('returns several hints for several symptoms, without duplicates', () => {
    const out = [
      'Failed to connect to browser',
      'Fehler beim Starten des Browsers',
      'Page did not finish loading within 15.0 seconds.',
    ].join('\n');
    expect(diagnoseJobOutput(out, desktop)).toHaveLength(2);
  });

  it('stays silent on healthy output', () => {
    expect(diagnoseJobOutput('[INFO] FERTIG: 6 Anzeigen von 6 Anzeigen heruntergeladen', desktop)).toEqual([]);
  });
});

describe('formatHints', () => {
  it('is empty without hints, so job logs of healthy runs are unchanged', () => {
    expect(formatHints([])).toBe('');
  });

  it('renders a labelled bullet block', () => {
    const block = formatHints(['eins', 'zwei']);
    expect(block).toContain('--- Hinweise der Bot-UI ---');
    expect(block).toContain('• eins');
    expect(block).toContain('• zwei');
  });
});
