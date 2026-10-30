import { Summary } from '../src/hub/summary';
import { FrameType, MetricId, PulseHubFrame } from '../src/protocol/frame';

function telemetryFrame(deviceId: number, seq: number, measures: PulseHubFrame['measures']): PulseHubFrame {
  return { version: 1, type: FrameType.TELEMETRY, deviceId, seq, uptimeMs: 0, measures };
}

describe('Summary', () => {
  it('ne contient aucun appareil avant la premiere trame', () => {
    const summary = new Summary(2000);
    const snapshot = summary.snapshot({ received: 0, invalid: 0 });
    expect(snapshot.devices).toEqual([]);
    expect(snapshot.reception).toEqual({ received: 0, invalid: 0, lost: 0 });
  });

  it('affiche identifiant, temperature, tension, courant et statut en ligne pour un appareil', () => {
    const summary = new Summary(2000);
    const now = 1_000_000;

    summary.recordAcceptedFrame(
      telemetryFrame(7, 1, [
        { metricId: MetricId.TEMPERATURE, value: 4250 }, // 42.50 C
        { metricId: MetricId.VOLTAGE, value: 12000 }, // 12.000 V
        { metricId: MetricId.CURRENT, value: 1500 }, // 1.500 A
      ]),
      0,
      now
    );

    const snapshot = summary.snapshot({ received: 1, invalid: 0 }, now);

    expect(snapshot.devices).toEqual([
      {
        deviceId: 7,
        temperatureC: 42.5,
        voltageV: 12,
        currentA: 1.5,
        status: 'online',
        lastSeenAt: now,
        lastSeq: 1,
      },
    ]);
  });

  it("conserve les dernieres valeurs connues quand une trame n'apporte pas de mesures (ex. HEARTBEAT)", () => {
    const summary = new Summary(2000);
    const t0 = 1_000_000;

    summary.recordAcceptedFrame(
      telemetryFrame(7, 1, [{ metricId: MetricId.TEMPERATURE, value: 3000 }]),
      0,
      t0
    );
    summary.recordAcceptedFrame({ ...telemetryFrame(7, 2, []), type: FrameType.HEARTBEAT }, 0, t0 + 50);

    const snapshot = summary.snapshot({ received: 2, invalid: 0 }, t0 + 50);
    const device = snapshot.devices[0];

    expect(device.temperatureC).toBe(30);
    expect(device.lastSeenAt).toBe(t0 + 50);
    expect(device.lastSeq).toBe(2);
  });

  it("passe un appareil hors ligne quand le timeout est depasse", () => {
    const summary = new Summary(2000);
    const t0 = 1_000_000;

    summary.recordAcceptedFrame(telemetryFrame(7, 1, []), 0, t0);

    expect(summary.snapshot({ received: 1, invalid: 0 }, t0 + 1999).devices[0].status).toBe('online');
    expect(summary.snapshot({ received: 1, invalid: 0 }, t0 + 2001).devices[0].status).toBe('offline');
  });

  it('cumule les pertes de sequence remontees par le sequenceur', () => {
    const summary = new Summary(2000);
    summary.recordAcceptedFrame(telemetryFrame(1, 1, []), 0, 0);
    summary.recordAcceptedFrame(telemetryFrame(1, 5, []), 3, 10); // 3 trames manquantes

    const snapshot = summary.snapshot({ received: 2, invalid: 0 }, 10);
    expect(snapshot.reception.lost).toBe(3);
  });

  it('suit chaque appareil independamment', () => {
    const summary = new Summary(2000);
    summary.recordAcceptedFrame(telemetryFrame(1, 1, [{ metricId: MetricId.TEMPERATURE, value: 2000 }]), 0, 0);
    summary.recordAcceptedFrame(telemetryFrame(2, 1, [{ metricId: MetricId.TEMPERATURE, value: 5000 }]), 0, 0);

    const snapshot = summary.snapshot({ received: 2, invalid: 0 }, 0);
    expect(snapshot.devices).toHaveLength(2);
    expect(snapshot.devices.find((d) => d.deviceId === 1)?.temperatureC).toBe(20);
    expect(snapshot.devices.find((d) => d.deviceId === 2)?.temperatureC).toBe(50);
  });
});
