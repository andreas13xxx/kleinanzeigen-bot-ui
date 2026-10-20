const DAYS = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];

const isNum = (v: string) => /^\d+$/.test(v);
const isStep = (v: string) => /^\*\/\d+$/.test(v);
const isList = (v: string) => /^\d+(,\d+)*$/.test(v);
const pad = (v: string) => v.padStart(2, '0');

/**
 * Human-readable German label for a 5-field cron expression. Anything that is not
 * understood is returned verbatim, so the label never claims something wrong.
 */
export function describeCron(expr: string): string {
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) return expr;
  const [minute, hour, dom, month, dow] = parts;
  if (month !== '*') return expr;

  // Every N hours, e.g. 0 */8 * * *
  if (isNum(minute) && isStep(hour) && dom === '*' && dow === '*') {
    const n = hour.slice(2);
    return minute === '0' ? `Alle ${n} Stunden` : `Alle ${n} Stunden (Minute ${minute})`;
  }

  // Remaining shapes need a fixed minute and one or more fixed hours
  if (!isNum(minute) || !isList(hour)) return expr;
  const times = hour.split(',').map((h) => `${h}:${pad(minute)}`).join(', ');

  if (dom === '*' && dow === '*') return `Täglich ${times}`;
  if (dom === '*' && /^[0-7]$/.test(dow)) return `${DAYS[Number(dow) % 7]}s ${times}`;
  if (dow === '*' && isStep(dom)) return `Alle ${dom.slice(2)} Tage ${times}`;
  if (dow === '*' && isList(dom)) return `Am ${dom.split(',').join('., ')}. des Monats ${times}`;
  return expr;
}
