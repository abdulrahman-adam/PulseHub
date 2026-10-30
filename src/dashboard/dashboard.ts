import { FleetSummary } from '../hub/summary';

const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const CLEAR_SCREEN = '\x1b[2J\x1b[H';

function color(text: string, code: string): string {
  return `${code}${text}${RESET}`;
}

function kpiLine(label: string, value: number, alertColor?: string): string {
  const text = `${label.padEnd(26)} ${value}`;
  return alertColor && value > 0 ? color(text, alertColor) : text;
}

function formatAge(lastSeenAt: number, now: number): string {
  return `${(Math.max(0, now - lastSeenAt) / 1000).toFixed(1)}s`;
}

function formatNumber(value: number | null, digits: number): string {
  return value === null ? '-' : value.toFixed(digits);
}

/** Construit le texte complet du tableau de bord pour un instantane donne. */
export function renderDashboard(snapshot: FleetSummary, now: number = Date.now()): string {
  const total = snapshot.devices.length;
  const online = snapshot.devices.filter((d) => d.status === 'online').length;
  const offline = total - online;
  const anomalous = snapshot.devices.filter((d) => d.temperatureAnomalous).length;

  const lines: string[] = [
    color(`${BOLD}PulseHub — etat de la flotte${RESET}`, CYAN),
    '',
    kpiLine('Appareils (total)', total),
    kpiLine('En ligne', online),
    kpiLine('Hors ligne', offline, RED),
    kpiLine('Temperatures anormales', anomalous, YELLOW),
    kpiLine('Trames recues', snapshot.reception.received),
    kpiLine('Trames invalides', snapshot.reception.invalid, RED),
    kpiLine('Trames perdues (sequence)', snapshot.reception.lost, YELLOW),
    '',
    color('ID     Temp(C)  Tension(V)  Courant(A)  Etat        Vu il y a', DIM),
  ];

  const devices = [...snapshot.devices].sort((a, b) => a.deviceId - b.deviceId);

  for (const device of devices) {
    const temp = formatNumber(device.temperatureC, 2).padEnd(9);
    const volt = formatNumber(device.voltageV, 3).padEnd(12);
    const curr = formatNumber(device.currentA, 3).padEnd(12);
    const statusText = (device.status === 'online' ? 'en ligne' : 'hors ligne').padEnd(12);
    const statusColored = color(statusText, device.status === 'online' ? GREEN : RED);
    const tempColored = device.temperatureAnomalous ? color(temp, YELLOW) : temp;

    lines.push(String(device.deviceId).padEnd(7) + tempColored + volt + curr + statusColored + formatAge(device.lastSeenAt, now));
  }

  if (devices.length === 0) {
    lines.push(color('(aucun appareil recu pour le moment)', DIM));
  }

  return lines.join('\n');
}

/** Redessine le tableau de bord en boucle (ecran efface a chaque image). */
export function startDashboardLoop(getSnapshot: () => FleetSummary, intervalMs: number): NodeJS.Timeout {
  const render = (): void => {
    process.stdout.write(CLEAR_SCREEN + renderDashboard(getSnapshot()) + '\n');
  };

  render();
  return setInterval(render, intervalMs);
}
