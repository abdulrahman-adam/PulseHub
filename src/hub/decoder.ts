import {
  MAGIC_BYTE_0,
  MAGIC_BYTE_1,
  PROTOCOL_VERSION,
  FrameType,
  HEADER_SIZE,
  MEASURE_SIZE,
  MAX_DATAGRAM_SIZE,
  Measure,
  PulseHubFrame,
  computeChecksum,
} from '../protocol/frame';

export type DecodeResult =
  | { ok: true; frame: PulseHubFrame }
  | { ok: false; reason: string };

/**
 * Decode une trame PulseHub v1 brute (telle que recue sur le socket UDP).
 * Ne leve jamais d'exception : toute trame malformee produit { ok: false }.
 */
export function decodeFrame(buffer: Buffer): DecodeResult {
  const MIN_FRAME_SIZE = HEADER_SIZE + 1; // header + checksum, count = 0

  if (buffer.length < MIN_FRAME_SIZE) {
    return { ok: false, reason: `trame trop courte (${buffer.length} octets)` };
  }
  if (buffer.length > MAX_DATAGRAM_SIZE) {
    return { ok: false, reason: `trame trop longue (${buffer.length} octets)` };
  }
  if (buffer[0] !== MAGIC_BYTE_0 || buffer[1] !== MAGIC_BYTE_1) {
    return { ok: false, reason: 'magic invalide' };
  }

  const version = buffer.readUInt8(2);
  if (version !== PROTOCOL_VERSION) {
    return { ok: false, reason: `version non supportee: ${version}` };
  }

  const rawType = buffer.readUInt8(3);
  if (rawType !== FrameType.TELEMETRY && rawType !== FrameType.HEARTBEAT) {
    return { ok: false, reason: `type de trame inconnu: ${rawType}` };
  }
  const type = rawType as FrameType;

  const deviceId = buffer.readUInt16BE(4);
  const seq = buffer.readUInt32BE(6);
  const uptimeMs = buffer.readUInt32BE(10);
  const count = buffer.readUInt8(14);

  const expectedLength = HEADER_SIZE + count * MEASURE_SIZE + 1;
  if (buffer.length !== expectedLength) {
    return {
      ok: false,
      reason: `longueur incoherente: attendu ${expectedLength} octets pour count=${count}, recu ${buffer.length}`,
    };
  }

  const measures: Measure[] = [];
  let offset = HEADER_SIZE;
  for (let i = 0; i < count; i++) {
    const metricId = buffer.readUInt8(offset);
    const value = buffer.readInt16BE(offset + 1);
    measures.push({ metricId, value });
    offset += MEASURE_SIZE;
  }

  const checksumOffset = offset;
  const expectedChecksum = buffer.readUInt8(checksumOffset);
  const actualChecksum = computeChecksum(buffer, checksumOffset);
  if (actualChecksum !== expectedChecksum) {
    return {
      ok: false,
      reason: `checksum invalide: attendu 0x${expectedChecksum.toString(16)}, calcule 0x${actualChecksum.toString(16)}`,
    };
  }

  return {
    ok: true,
    frame: { version, type, deviceId, seq, uptimeMs, measures },
  };
}
