import { SimulatedDevice } from '../src/simulator/device';
import { MetricId } from '../src/protocol/frame';

function temperatureOf(reading: ReturnType<SimulatedDevice['nextReading']>): number {
  const measure = reading.measures.find((m) => m.metricId === MetricId.TEMPERATURE);
  if (!measure) throw new Error('mesure de temperature manquante');
  return measure.value / 100;
}

describe('SimulatedDevice', () => {
  it('produit des mesures de temperature/tension/courant des la premiere lecture', () => {
    const device = new SimulatedDevice(1);
    const reading = device.nextReading(false);

    expect(reading.deviceId).toBe(1);
    expect(reading.seq).toBe(1);
    expect(reading.measures).toHaveLength(3);
    expect(reading.measures.map((m) => m.metricId).sort()).toEqual([
      MetricId.TEMPERATURE,
      MetricId.VOLTAGE,
      MetricId.CURRENT,
    ]);
  });

  it('incremente seq a chaque lecture', () => {
    const device = new SimulatedDevice(1);
    expect(device.nextReading(false).seq).toBe(1);
    expect(device.nextReading(false).seq).toBe(2);
    expect(device.nextReading(false).seq).toBe(3);
  });

  it("reste arrete apres stop()", () => {
    const device = new SimulatedDevice(1);
    expect(device.isStopped()).toBe(false);
    device.stop();
    expect(device.isStopped()).toBe(true);
  });

  it(
    'redescend progressivement vers sa temperature de base apres un pic anormal ' +
      '(regression : la derive aleatoire seule ne ramenait jamais la valeur a la normale)',
    () => {
      const device = new SimulatedDevice(1);
      const spikeTemp = temperatureOf(device.nextReading(true));
      expect(spikeTemp).toBeGreaterThanOrEqual(75);

      let lastTemp = spikeTemp;
      for (let i = 0; i < 60; i++) {
        lastTemp = temperatureOf(device.nextReading(false));
      }

      // base de l'appareil 1 : 22 + (1 % 8) = 23 C
      expect(lastTemp).toBeLessThan(30);
    }
  );

  it('deux appareils derivent independamment', () => {
    const device1 = new SimulatedDevice(1);
    const device2 = new SimulatedDevice(2);

    device1.nextReading(true); // pic sur l'appareil 1 seulement

    const temp1 = temperatureOf(device1.nextReading(false));
    const temp2 = temperatureOf(device2.nextReading(false));

    expect(temp1).toBeGreaterThan(temp2);
  });
});
