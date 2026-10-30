import { MetricId, Measure } from '../protocol/frame';

export interface DeviceReading {
  deviceId: number;
  seq: number;
  uptimeMs: number;
  measures: Measure[];
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Represente un appareil simule (alimentation, controleur LED ou ampli).
 * Genere des mesures plausibles avec une legere derive aleatoire, et tient
 * son propre compteur de sequence et son horloge de demarrage, comme le
 * ferait un vrai appareil embarque.
 */
export class SimulatedDevice {
  readonly deviceId: number;

  private seq = 0;
  private readonly startedAt = Date.now();
  private stopped = false;

  private temperatureC: number;
  private voltageMv: number;
  private currentMa: number;

  constructor(deviceId: number) {
    this.deviceId = deviceId;
    // valeurs de base variees par appareil, pour un affichage moins uniforme
    this.temperatureC = 22 + (deviceId % 8);
    this.voltageMv = 11500 + (deviceId % 5) * 200; // alimentation basse tension ~12V DC
    this.currentMa = 300 + (deviceId % 10) * 50;
  }

  isStopped(): boolean {
    return this.stopped;
  }

  /** Simule un arret definitif de l'appareil : il ne repondra plus. */
  stop(): void {
    this.stopped = true;
  }

  /**
   * Produit la prochaine lecture de l'appareil. `anomalous` force une
   * valeur hors norme (surchauffe) pour pouvoir tester les regles d'alerte.
   */
  nextReading(anomalous: boolean): DeviceReading {
    this.seq += 1;
    this.drift(anomalous);

    const measures: Measure[] = [
      { metricId: MetricId.TEMPERATURE, value: Math.round(this.temperatureC * 100) },
      { metricId: MetricId.VOLTAGE, value: Math.round(this.voltageMv) },
      { metricId: MetricId.CURRENT, value: Math.round(this.currentMa) },
    ];

    return {
      deviceId: this.deviceId,
      seq: this.seq,
      uptimeMs: Date.now() - this.startedAt,
      measures,
    };
  }

  private drift(anomalous: boolean): void {
    this.temperatureC += (Math.random() - 0.5) * 0.4;
    this.voltageMv += (Math.random() - 0.5) * 40;
    this.currentMa += (Math.random() - 0.5) * 20;

    if (anomalous) {
      // surchauffe simulee : pic bien au-dessus du seuil d'alerte habituel (70 C)
      this.temperatureC = 75 + Math.random() * 15;
    }

    this.temperatureC = clamp(this.temperatureC, -20, 120);
    this.voltageMv = clamp(this.voltageMv, 0, 32767);
    this.currentMa = clamp(this.currentMa, 0, 32767);
  }
}
