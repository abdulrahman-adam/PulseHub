import dgram from 'dgram';
import { buildFrame } from './packet-builder';
import { SimulatedDevice } from './device';
import { FrameType } from '../protocol/frame';
import { loadSimulatorConfig } from '../config/config';

/** Inverse le dernier octet (checksum) pour simuler une trame corrompue. */
function corruptChecksum(frame: Buffer): Buffer {
  const corrupted = Buffer.from(frame);
  const last = corrupted.length - 1;
  corrupted[last] = corrupted[last] ^ 0xff;
  return corrupted;
}

function main(): void {
  const config = loadSimulatorConfig();
  const socket = dgram.createSocket('udp4');

  const devices: SimulatedDevice[] = Array.from(
    { length: config.deviceCount },
    (_, index) => new SimulatedDevice(index + 1)
  );

  const send = (buffer: Buffer): void => {
    socket.send(buffer, config.port, config.host, (err) => {
      if (err) console.error(`[simulator] envoi UDP echoue: ${err.message}`);
    });
  };

  const tickIntervalMs = 1000 / config.frequencyHz;

  const timer = setInterval(() => {
    for (const device of devices) {
      if (device.isStopped()) continue;

      if (Math.random() < config.faults.deviceStopRate) {
        device.stop();
        console.log(`[simulator] appareil ${device.deviceId} s'arrete (defaut simule)`);
        continue;
      }

      const anomalous = Math.random() < config.faults.anomalyRate;
      const reading = device.nextReading(anomalous);
      const frame = buildFrame({
        type: FrameType.TELEMETRY,
        deviceId: reading.deviceId,
        seq: reading.seq,
        uptimeMs: reading.uptimeMs,
        measures: reading.measures,
      });

      const outgoing =
        Math.random() < config.faults.badChecksumRate ? corruptChecksum(frame) : frame;

      if (Math.random() < config.faults.reorderRate) {
        // retarde l'envoi pour qu'elle arrive apres la trame suivante (desordre reel sur le reseau)
        setTimeout(() => send(outgoing), tickIntervalMs * 2);
      } else {
        send(outgoing);
      }

      if (Math.random() < config.faults.duplicateRate) {
        send(outgoing);
      }
    }
  }, tickIntervalMs);

  console.log(
    `[simulator] ${config.deviceCount} appareils -> ${config.host}:${config.port} a ${config.frequencyHz} Hz`
  );

  process.on('SIGINT', () => {
    clearInterval(timer);
    socket.close();
    process.exit(0);
  });
}

if (require.main === module) {
  main();
}
