import { UdpReceiver } from './udp-receiver';
import { Sequencer } from './sequencer';
import { loadHubConfig } from '../config/config';

const STATS_INTERVAL_MS = 1000;

/**
 * Demarre le hub : ecoute UDP, decodage/validation, sequencement par
 * appareil (doublons/retards ecartes, pertes comptees). La synthese
 * complete de l'etat de la flotte sera branchee dans une etape suivante.
 */
export function startHubServer(): UdpReceiver {
  const config = loadHubConfig();
  const sequencer = new Sequencer();

  let accepted = 0;
  let discarded = 0;
  let lostTotal = 0;

  const receiver = new UdpReceiver(
    (frame) => {
      const result = sequencer.process(frame.deviceId, frame.seq);
      if (!result.accepted) {
        discarded++;
        return;
      }
      accepted++;
      lostTotal += result.lost;
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
    const stats = receiver.getStats();
    console.log(
      `[hub] recues=${stats.received} invalides=${stats.invalid} acceptees=${accepted} ecartees(doublon/retard)=${discarded} pertes_seq=${lostTotal}`
    );
  }, STATS_INTERVAL_MS);

  process.on('SIGINT', () => {
    clearInterval(statsTimer);
    receiver.close();
    process.exit(0);
  });

  return receiver;
}
