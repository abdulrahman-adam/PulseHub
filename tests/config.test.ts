import { loadSimulatorConfig, loadHubConfig } from '../src/config/config';

const ENV_KEYS = [
  'PULSEHUB_HOST',
  'PULSEHUB_HUB_HOST',
  'PULSEHUB_PORT',
  'PULSEHUB_DEVICE_COUNT',
  'PULSEHUB_FREQUENCY_HZ',
  'PULSEHUB_OFFLINE_TIMEOUT_MS',
  'PULSEHUB_ANOMALY_TEMPERATURE_C',
  'PULSEHUB_DASHBOARD_REFRESH_MS',
];

function clearEnv(): void {
  for (const key of ENV_KEYS) delete process.env[key];
}

describe('loadSimulatorConfig', () => {
  afterEach(clearEnv);

  it('utilise des valeurs par defaut raisonnables sans aucun argument', () => {
    const config = loadSimulatorConfig([]);
    expect(config).toEqual({
      host: '127.0.0.1',
      port: 9000,
      deviceCount: 50,
      frequencyHz: 20,
      faults: {
        badChecksumRate: 0,
        duplicateRate: 0,
        reorderRate: 0,
        anomalyRate: 0,
        deviceStopRate: 0,
      },
    });
  });

  it('les arguments CLI (--cle=valeur) remplacent les valeurs par defaut', () => {
    const config = loadSimulatorConfig(['--devices=10', '--hz=5', '--bad-checksum-rate=0.2']);
    expect(config.deviceCount).toBe(10);
    expect(config.frequencyHz).toBe(5);
    expect(config.faults.badChecksumRate).toBe(0.2);
  });

  it("les variables d'environnement sont utilisees quand aucun argument CLI n'est fourni", () => {
    process.env.PULSEHUB_DEVICE_COUNT = '7';
    const config = loadSimulatorConfig([]);
    expect(config.deviceCount).toBe(7);
  });

  it("un argument CLI a priorite sur la variable d'environnement", () => {
    process.env.PULSEHUB_DEVICE_COUNT = '7';
    const config = loadSimulatorConfig(['--devices=99']);
    expect(config.deviceCount).toBe(99);
  });
});

describe('loadHubConfig', () => {
  afterEach(clearEnv);

  it('utilise des valeurs par defaut raisonnables sans aucun argument', () => {
    const config = loadHubConfig([]);
    expect(config).toEqual({
      host: '0.0.0.0',
      port: 9000,
      offlineTimeoutMs: 2000,
      anomalyTemperatureC: 70,
      dashboardRefreshMs: 250,
    });
  });

  it('le port est configurable via --port', () => {
    const config = loadHubConfig(['--port=9100']);
    expect(config.port).toBe(9100);
  });
});
