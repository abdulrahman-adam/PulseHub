import { renderDashboard } from '../src/dashboard/dashboard';
import { FleetSummary } from '../src/hub/summary';

function stripAnsi(text: string): string {
  // eslint-disable-next-line no-control-regex
  return text.replace(/\x1b\[[0-9;]*m/g, '');
}

describe('renderDashboard', () => {
  it('affiche des valeurs a zero quand la flotte est vide (etat de depart)', () => {
    const snapshot: FleetSummary = { reception: { received: 0, invalid: 0, lost: 0 }, devices: [] };
    const output = stripAnsi(renderDashboard(snapshot));

    expect(output).toMatch(/Appareils \(total\)\s+0/);
    expect(output).toMatch(/En ligne\s+0/);
    expect(output).toMatch(/Hors ligne\s+0/);
    expect(output).toMatch(/Temperatures anormales\s+0/);
    expect(output).toMatch(/Trames recues\s+0/);
    expect(output).toMatch(/Trames invalides\s+0/);
    expect(output).toMatch(/Trames perdues \(sequence\)\s+0/);
    expect(output).toContain('aucun appareil recu pour le moment');
  });

  it('compte correctement en ligne / hors ligne / temperatures anormales', () => {
    const snapshot: FleetSummary = {
      reception: { received: 100, invalid: 3, lost: 2 },
      devices: [
        { deviceId: 1, temperatureC: 25, voltageV: 12, currentA: 1, status: 'online', temperatureAnomalous: false, lastSeenAt: 0, lastSeq: 1 },
        { deviceId: 2, temperatureC: 80, voltageV: 12, currentA: 1, status: 'online', temperatureAnomalous: true, lastSeenAt: 0, lastSeq: 1 },
        { deviceId: 3, temperatureC: null, voltageV: null, currentA: null, status: 'offline', temperatureAnomalous: false, lastSeenAt: 0, lastSeq: 1 },
      ],
    };

    const output = stripAnsi(renderDashboard(snapshot, 0));

    expect(output).toMatch(/Appareils \(total\)\s+3/);
    expect(output).toMatch(/En ligne\s+2/);
    expect(output).toMatch(/Hors ligne\s+1/);
    expect(output).toMatch(/Temperatures anormales\s+1/);
    expect(output).toMatch(/Trames recues\s+100/);
    expect(output).toMatch(/Trames invalides\s+3/);
    expect(output).toMatch(/Trames perdues \(sequence\)\s+2/);
    expect(output).toMatch(/^3\s/m); // appareil 3, sans mesure, reste liste (valeurs '-')
  });
});
