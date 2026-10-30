import { UdpReceiver } from './udp-receiver';
import { loadHubConfig } from '../config/config';

const STATS_INTERVAL_MS = 1000;

/**
 * Demarre le hub : ecoute UDP, decodage/validation, comptage des trames
 * invalides. Le sequenceur et la synthese seront branches sur
 * onValidFrame dans une etape suivante.
 */
export function startHubServer(): UdpReceiver {
  const config = loadHubConfig();

  const receiver = new UdpReceiver(
    (frame, rinfo) => {
      void frame;
      void rinfo;
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
    console.log(`[hub] trames recues=${stats.received} invalides=${stats.invalid}`);
  }, STATS_INTERVAL_MS);

  process.on('SIGINT', () => {
    clearInterval(statsTimer);
    receiver.close();
    process.exit(0);
  });

  return receiver;
}
