/**
 * Chargement de la configuration depuis les arguments CLI (--cle=valeur)
 * et les variables d'environnement, avec des valeurs par defaut.
 * Rien n'est code en dur dans la logique metier.
 */

export interface SimulatorFaultConfig {
  badChecksumRate: number;
  duplicateRate: number;
  reorderRate: number;
  anomalyRate: number;
  deviceStopRate: number;
}

export interface SimulatorConfig {
  host: string;
  port: number;
  deviceCount: number;
  frequencyHz: number;
  faults: SimulatorFaultConfig;
}

export interface HubConfig {
  host: string;
  port: number;
  /** Duree sans trame recue au-dela de laquelle un appareil est juge hors ligne. */
  offlineTimeoutMs: number;
  /** Seuil de temperature (en C) au-dela duquel un appareil est signale en anomalie. */
  anomalyTemperatureC: number;
  /** Intervalle de rafraichissement du tableau de bord. */
  dashboardRefreshMs: number;
}

function parseArgs(argv: string[]): Map<string, string> {
  const result = new Map<string, string>();
  for (const arg of argv) {
    if (!arg.startsWith('--')) continue;
    const eqIndex = arg.indexOf('=');
    if (eqIndex === -1) continue;
    result.set(arg.slice(2, eqIndex), arg.slice(eqIndex + 1));
  }
  return result;
}

function stringOption(
  args: Map<string, string>,
  flag: string,
  envVar: string,
  fallback: string
): string {
  return args.get(flag) ?? process.env[envVar] ?? fallback;
}

function numberOption(
  args: Map<string, string>,
  flag: string,
  envVar: string,
  fallback: number
): number {
  const raw = args.get(flag) ?? process.env[envVar];
  if (raw === undefined) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function loadSimulatorConfig(argv: string[] = process.argv.slice(2)): SimulatorConfig {
  const args = parseArgs(argv);

  return {
    host: stringOption(args, 'host', 'PULSEHUB_HOST', '127.0.0.1'),
    port: numberOption(args, 'port', 'PULSEHUB_PORT', 9000),
    deviceCount: numberOption(args, 'devices', 'PULSEHUB_DEVICE_COUNT', 50),
    frequencyHz: numberOption(args, 'hz', 'PULSEHUB_FREQUENCY_HZ', 20),
    faults: {
      badChecksumRate: numberOption(args, 'bad-checksum-rate', 'PULSEHUB_FAULT_BAD_CHECKSUM_RATE', 0),
      duplicateRate: numberOption(args, 'duplicate-rate', 'PULSEHUB_FAULT_DUPLICATE_RATE', 0),
      reorderRate: numberOption(args, 'reorder-rate', 'PULSEHUB_FAULT_REORDER_RATE', 0),
      anomalyRate: numberOption(args, 'anomaly-rate', 'PULSEHUB_FAULT_ANOMALY_RATE', 0),
      deviceStopRate: numberOption(args, 'device-stop-rate', 'PULSEHUB_FAULT_DEVICE_STOP_RATE', 0),
    },
  };
}

export function loadHubConfig(argv: string[] = process.argv.slice(2)): HubConfig {
  const args = parseArgs(argv);

  return {
    host: stringOption(args, 'host', 'PULSEHUB_HUB_HOST', '0.0.0.0'),
    port: numberOption(args, 'port', 'PULSEHUB_PORT', 9000),
    offlineTimeoutMs: numberOption(args, 'offline-timeout-ms', 'PULSEHUB_OFFLINE_TIMEOUT_MS', 2000),
    anomalyTemperatureC: numberOption(args, 'anomaly-temperature-c', 'PULSEHUB_ANOMALY_TEMPERATURE_C', 70),
    dashboardRefreshMs: numberOption(args, 'dashboard-refresh-ms', 'PULSEHUB_DASHBOARD_REFRESH_MS', 250),
  };
}
