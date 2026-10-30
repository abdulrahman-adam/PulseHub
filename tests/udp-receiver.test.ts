import dgram from 'dgram';
import { UdpReceiver } from '../src/hub/udp-receiver';
import { buildFrame } from '../src/simulator/packet-builder';
import { FrameType, MetricId, PulseHubFrame } from '../src/protocol/frame';

function sendAsync(socket: dgram.Socket, buffer: Buffer, port: number): Promise<void> {
  return new Promise((resolve, reject) => {
    socket.send(buffer, port, '127.0.0.1', (err) => (err ? reject(err) : resolve()));
  });
}

function waitUntil(condition: () => boolean, timeoutMs = 2000): Promise<void> {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const check = (): void => {
      if (condition()) return resolve();
      if (Date.now() - start > timeoutMs) return reject(new Error('timeout en attente de la condition'));
      setTimeout(check, 10);
    };
    check();
  });
}

describe('UdpReceiver', () => {
  it('decode les trames valides, compte les invalides, et ne plante pas', async () => {
    const validFrames: PulseHubFrame[] = [];
    const invalidReasons: string[] = [];

    const receiver = new UdpReceiver(
      (frame) => validFrames.push(frame),
      (reason) => invalidReasons.push(reason)
    );

    await receiver.listen(0, '127.0.0.1');
    const { port } = receiver.address();
    const client = dgram.createSocket('udp4');

    const validFrame = buildFrame({
      type: FrameType.TELEMETRY,
      deviceId: 7,
      seq: 1,
      uptimeMs: 10,
      measures: [{ metricId: MetricId.TEMPERATURE, value: 2500 }],
    });
    const garbage = Buffer.from([0x00, 0x00, 0x01, 0x02]); // magic invalide

    await sendAsync(client, validFrame, port);
    await sendAsync(client, garbage, port);
    await waitUntil(() => receiver.getStats().received === 2);

    expect(receiver.getStats()).toEqual({ received: 2, invalid: 1 });
    expect(validFrames).toEqual([
      { version: 1, type: FrameType.TELEMETRY, deviceId: 7, seq: 1, uptimeMs: 10, measures: [{ metricId: MetricId.TEMPERATURE, value: 2500 }] },
    ]);
    expect(invalidReasons).toHaveLength(1);

    client.close();
    receiver.close();
  });

  it('continue a recevoir apres plusieurs trames invalides consecutives', async () => {
    const validFrames: PulseHubFrame[] = [];
    const receiver = new UdpReceiver((frame) => validFrames.push(frame));

    await receiver.listen(0, '127.0.0.1');
    const { port } = receiver.address();
    const client = dgram.createSocket('udp4');

    for (let i = 0; i < 5; i++) {
      await sendAsync(client, Buffer.from([0xff, 0xff, 0x01, 0x02]), port);
    }
    const validFrame = buildFrame({
      type: FrameType.HEARTBEAT,
      deviceId: 3,
      seq: 1,
      uptimeMs: 0,
      measures: [],
    });
    await sendAsync(client, validFrame, port);

    await waitUntil(() => receiver.getStats().received === 6);

    expect(receiver.getStats()).toEqual({ received: 6, invalid: 5 });
    expect(validFrames).toHaveLength(1);

    client.close();
    receiver.close();
  });
});
