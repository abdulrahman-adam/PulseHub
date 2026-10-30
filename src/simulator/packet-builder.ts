import {
  MAGIC_BYTE_0,
  MAGIC_BYTE_1,
  PROTOCOL_VERSION,
  FrameType,
  HEADER_SIZE,
  MEASURE_SIZE,
  Measure,
  computeChecksum,
} from '../protocol/frame';

export interface BuildFrameOptions {
  type: FrameType;
  deviceId: number;
  seq: number;
  uptimeMs: number;
  measures: Measure[];
}

/** Construit une trame PulseHub v1 valide (header + mesures + checksum). */
export function buildFrame(options: BuildFrameOptions): Buffer {
  const { type, deviceId, seq, uptimeMs, measures } = options;
  const count = measures.length;
  const totalSize = HEADER_SIZE + count * MEASURE_SIZE + 1;
  const buffer = Buffer.alloc(totalSize);

  buffer.writeUInt8(MAGIC_BYTE_0, 0);
  buffer.writeUInt8(MAGIC_BYTE_1, 1);
  buffer.writeUInt8(PROTOCOL_VERSION, 2);
  buffer.writeUInt8(type, 3);
  buffer.writeUInt16BE(deviceId, 4);
  buffer.writeUInt32BE(seq, 6);
  buffer.writeUInt32BE(uptimeMs, 10);
  buffer.writeUInt8(count, 14);

  let offset = HEADER_SIZE;
  for (const measure of measures) {
    buffer.writeUInt8(measure.metricId, offset);
    buffer.writeInt16BE(measure.value, offset + 1);
    offset += MEASURE_SIZE;
  }

  const checksum = computeChecksum(buffer, offset);
  buffer.writeUInt8(checksum, offset);

  return buffer;
}
