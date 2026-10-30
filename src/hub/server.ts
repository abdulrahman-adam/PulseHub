import { UdpReceiver } from './udp-receiver';
import { Sequencer } from './sequencer';
import { Summary } from './summary';
import { loadHubConfig, HubConfig } from '../config/config';

export interface HubHandle {
  receiver: UdpReceiver;
  summary: Summary;
  config: HubConfig;
}

/**
 * Demarre le hub : ecoute UDP, decodage/validation, sequencement par
 * appareil, puis synthese de l'etat de la flotte (sante de reception +
 * etat par appareil). Aucun log en continu ici : la visualisation
 * (dashboard) est la vraie vue temps reel, branchee par l'appelant via
 * la synthese et les stats exposees dans le HubHandle retourne.
 */
export function startHubServer(): HubHandle {
  const config = loadHubConfig();
  const sequencer = new Sequencer();
  const summary = new Summary(config.offlineTimeoutMs, config.anomalyTemperatureC);

  const receiver = new UdpReceiver((frame) => {
    const result = sequencer.process(frame.deviceId, frame.seq);
    if (result.accepted) {
      summary.recordAcceptedFrame(frame, result.lost);
    }
  });

  receiver.listen(config.port, config.host).catch((err: Error) => {
    console.error(`[hub] impossible de demarrer: ${err.message}`);
    process.exitCode = 1;
  });

  process.on('SIGINT', () => {
    receiver.close();
    process.exit(0);
  });

  return { receiver, summary, config };
}
