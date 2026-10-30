import { UdpReceiver } from './udp-receiver';
import { Sequencer } from './sequencer';
import { Summary } from './summary';
import { loadHubConfig } from '../config/config';

const STATS_INTERVAL_MS = 1000;

export interface HubHandle {
  receiver: UdpReceiver;
  summary: Summary;
}

/**
 * Demarre le hub : ecoute UDP, decodage/validation, sequencement par
 * appareil, puis synthese de l'etat de la flotte (sante de reception +
 * etat par appareil). La synthese est exposee pour etre affichee
 * (visualisation branchee dans une etape suivante).
 */
export function startHubServer(): HubHandle {
  const config = loadHubConfig();
  const sequencer = new Sequencer();
  const summary = new Summary(config.offlineTimeoutMs);

  const receiver = new UdpReceiver(
    (frame) => {
      const result = sequencer.process(frame.deviceId, frame.seq);
      if (result.accepted) {
        summary.recordAcceptedFrame(frame, result.lost);
      }
    },
    (reason, rinfo) => {
      console.warn(`[hub] trame invalide de ${rinfo.address}:${rinfo.port} - ${reason}`);
    }
  );

  receiver
    .listen(config.port, config.host)
    .then(() => {
      console.log(`[hub] a l'ecoute sur ${config.host}:${config.port}`);
    })
    .catch((err: Error) => {
      console.error(`[hub] impossible de demarrer: ${err.message}`);
      process.exitCode = 1;
    });

  const statsTimer = setInterval(() => {
    const snapshot = summary.snapshot(receiver.getStats());
    const online = snapshot.devices.filter((d) => d.status === 'online').length;
    console.log(
      `[hub] recues=${snapshot.reception.received} invalides=${snapshot.reception.invalid} ` +
        `pertes_seq=${snapshot.reception.lost} appareils=${snapshot.devices.length} en_ligne=${online}`
    );
  }, STATS_INTERVAL_MS);

  process.on('SIGINT', () => {
    clearInterval(statsTimer);
    receiver.close();
    process.exit(0);
  });

  return { receiver, summary };
}
