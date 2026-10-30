import { decodeFrame } from '../src/hub/decoder';
import { buildFrame } from '../src/simulator/packet-builder';
import { FrameType, MetricId, computeChecksum } from '../src/protocol/frame';

describe('decodeFrame', () => {
  it("decode la trame HEARTBEAT exemple du sujet (appareil 7, seq 1, uptime 1000ms)", () => {
    // 50 48 01 02 00 07 00 00 00 01 00 00 03 E8 00 + checksum F6
    const bytes = Buffer.from([
      0x50, 0x48, 0x01, 0x02, 0x00, 0x07, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00,
      0x03, 0xe8, 0x00, 0xf6,
    ]);

    const result = decodeFrame(bytes);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.frame).toEqual({
      version: 1,
      type: FrameType.HEARTBEAT,
      deviceId: 7,
      seq: 1,
      uptimeMs: 1000,
      measures: [],
    });
  });

  it('le checksum de la trame exemple du sujet vaut bien 0xF6', () => {
    const headerSansChecksum = Buffer.from([
      0x50, 0x48, 0x01, 0x02, 0x00, 0x07, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00,
      0x03, 0xe8, 0x00,
    ]);
    expect(computeChecksum(headerSansChecksum, headerSansChecksum.length)).toBe(0xf6);
  });

  it('rejette une trame dont le checksum est faux', () => {
    const bytes = Buffer.from([
      0x50, 0x48, 0x01, 0x02, 0x00, 0x07, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00,
      0x03, 0xe8, 0x00, 0x00, // checksum errone, attendu 0xF6
    ]);
    const result = decodeFrame(bytes);
    expect(result.ok).toBe(false);
  });

  it('rejette un magic invalide', () => {
    const bytes = Buffer.from([
      0x00, 0x00, 0x01, 0x02, 0x00, 0x07, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00,
      0x03, 0xe8, 0x00, 0xf6,
    ]);
    expect(decodeFrame(bytes).ok).toBe(false);
  });

  it('rejette une version non supportee', () => {
    const bytes = Buffer.from([
      0x50, 0x48, 0x02, 0x02, 0x00, 0x07, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00,
      0x03, 0xe8, 0x00, 0xf6,
    ]);
    expect(decodeFrame(bytes).ok).toBe(false);
  });

  it('rejette une trame plus courte que le minimum', () => {
    expect(decodeFrame(Buffer.from([0x50, 0x48, 0x01])).ok).toBe(false);
  });

  it('rejette une trame dont la longueur ne correspond pas a count', () => {
    // count=1 annonce une mesure (3 octets de plus) mais la trame s'arrete avant
    const bytes = Buffer.from([
      0x50, 0x48, 0x01, 0x02, 0x00, 0x07, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00,
      0x03, 0xe8, 0x01, 0xf6,
    ]);
    expect(decodeFrame(bytes).ok).toBe(false);
  });

  it('decode une trame TELEMETRY avec plusieurs mesures (round-trip via buildFrame)', () => {
    const frame = buildFrame({
      type: FrameType.TELEMETRY,
      deviceId: 42,
      seq: 123,
      uptimeMs: 999_999,
      measures: [
        { metricId: MetricId.TEMPERATURE, value: 4250 },
        { metricId: MetricId.VOLTAGE, value: 23000 },
        { metricId: MetricId.CURRENT, value: 1500 },
      ],
    });

    const result = decodeFrame(frame);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.frame.deviceId).toBe(42);
    expect(result.frame.seq).toBe(123);
    expect(result.frame.measures).toEqual([
      { metricId: MetricId.TEMPERATURE, value: 4250 },
      { metricId: MetricId.VOLTAGE, value: 23000 },
      { metricId: MetricId.CURRENT, value: 1500 },
    ]);
  });

  it('gere correctement une valeur negative (int16 signe)', () => {
    const frame = buildFrame({
      type: FrameType.TELEMETRY,
      deviceId: 1,
      seq: 1,
      uptimeMs: 0,
      measures: [{ metricId: MetricId.TEMPERATURE, value: -500 }], // -5.00 C
    });

    const result = decodeFrame(frame);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.frame.measures[0].value).toBe(-500);
  });
});
