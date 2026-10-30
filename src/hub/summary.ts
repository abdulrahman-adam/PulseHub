import { PulseHubFrame, Measure, MetricId } from '../protocol/frame';

export type DeviceStatus = 'online' | 'offline';

export interface DeviceState {
  deviceId: number;
  temperatureC: number | null;
  voltageV: number | null;
  currentA: number | null;
  status: DeviceStatus;
  lastSeenAt: number;
  lastSeq: number;
}

export interface ReceptionCounts {
  received: number;
  invalid: number;
}

export interface ReceptionHealth extends ReceptionCounts {
  lost: number;
}

export interface FleetSummary {
  reception: ReceptionHealth;
  devices: DeviceState[];
}

const toNaturalUnit: Record<MetricId, (rawValue: number) => number> = {
  [MetricId.TEMPERATURE]: (raw) => raw / 100, // centiemes de C -> C
  [MetricId.VOLTAGE]: (raw) => raw / 1000, // mV -> V
  [MetricId.CURRENT]: (raw) => raw / 1000, // mA -> A
};

function extractMeasure(measures: Measure[], metricId: MetricId): number | undefined {
  const measure = measures.find((m) => m.metricId === metricId);
  return measure === undefined ? undefined : toNaturalUnit[metricId](measure.value);
}

/**
 * Maintient l'etat courant de la flotte : derniere lecture connue par
 * appareil (temperature/tension/courant en unites naturelles), horodatage
 * de derniere reception, statut en ligne/hors ligne (par timeout), et le
 * total des pertes de sequence remontees par le sequenceur.
 */
export class Summary {
  private readonly devices = new Map<number, DeviceState>();
  private lostTotal = 0;

  constructor(private readonly offlineTimeoutMs: number) {}

  /** A appeler pour chaque trame acceptee par le sequenceur. */
  recordAcceptedFrame(frame: PulseHubFrame, lost: number, now: number = Date.now()): void {
    this.lostTotal += lost;
    const existing = this.devices.get(frame.deviceId);

    this.devices.set(frame.deviceId, {
      deviceId: frame.deviceId,
      temperatureC: extractMeasure(frame.measures, MetricId.TEMPERATURE) ?? existing?.temperatureC ?? null,
      voltageV: extractMeasure(frame.measures, MetricId.VOLTAGE) ?? existing?.voltageV ?? null,
      currentA: extractMeasure(frame.measures, MetricId.CURRENT) ?? existing?.currentA ?? null,
      status: 'online',
      lastSeenAt: now,
      lastSeq: frame.seq,
    });
  }

  /** Photo instantanee de l'etat de la flotte, combinee aux compteurs de reception du hub. */
  snapshot(reception: ReceptionCounts, now: number = Date.now()): FleetSummary {
    const devices = Array.from(this.devices.values()).map((device) => ({
      ...device,
      status: this.computeStatus(device.lastSeenAt, now),
    }));

    return {
      reception: { ...reception, lost: this.lostTotal },
      devices,
    };
  }

  private computeStatus(lastSeenAt: number, now: number): DeviceStatus {
    return now - lastSeenAt > this.offlineTimeoutMs ? 'offline' : 'online';
  }
}
