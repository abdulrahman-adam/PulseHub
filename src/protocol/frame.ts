/**
 * Definition du protocole PulseHub v1 (imposee par le sujet).
 * Partagee par le decodeur (hub) et le generateur de trames (simulateur)
 * pour eviter de dupliquer le format binaire aux deux endroits.
 */

export const MAGIC_BYTE_0 = 0x50; // 'P'
export const MAGIC_BYTE_1 = 0x48; // 'H'
export const PROTOCOL_VERSION = 1;

export enum FrameType {
  TELEMETRY = 0x01,
  HEARTBEAT = 0x02,
}

export enum MetricId {
  TEMPERATURE = 1, // centiemes de degre C
  VOLTAGE = 2, // millivolts
  CURRENT = 3, // milliamperes
}

// Taille du header avant les mesures : magic(2) + version(1) + type(1)
// + deviceId(2) + seq(4) + uptimeMs(4) + count(1) = 15 octets (offsets 0..14)
export const HEADER_SIZE = 15;

// Taille d'une mesure : metricId (uint8) + value (int16)
export const MEASURE_SIZE = 3;

export const CHECKSUM_SIZE = 1;

export const MAX_DATAGRAM_SIZE = 512;

export const MAX_MEASURES_PER_FRAME = Math.floor(
  (MAX_DATAGRAM_SIZE - HEADER_SIZE - CHECKSUM_SIZE) / MEASURE_SIZE
);

export interface Measure {
  metricId: MetricId;
  value: number;
}

export interface PulseHubFrame {
  version: number;
  type: FrameType;
  deviceId: number;
  seq: number;
  uptimeMs: number;
  measures: Measure[];
}

/** XOR de length octets de buffer, a partir de l'offset 0. */
export function computeChecksum(buffer: Buffer, length: number): number {
  let xor = 0;
  for (let i = 0; i < length; i++) {
    xor ^= buffer[i];
  }
  return xor;
}
