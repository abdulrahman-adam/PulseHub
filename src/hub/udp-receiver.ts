import dgram from 'dgram';
import { AddressInfo } from 'net';
import { decodeFrame } from './decoder';
import { PulseHubFrame } from '../protocol/frame';

export interface ReceiverStats {
  received: number;
  invalid: number;
}

export type ValidFrameHandler = (frame: PulseHubFrame, remoteInfo: dgram.RemoteInfo) => void;
export type InvalidFrameHandler = (reason: string, remoteInfo: dgram.RemoteInfo) => void;

/**
 * Ecoute un port UDP, decode chaque datagramme recu et compte les trames
 * invalides. Ne transmet que les trames valides en aval ; une trame
 * malformee est comptee mais ne bloque jamais la reception suivante.
 */
export class UdpReceiver {
  private readonly socket: dgram.Socket;
  private received = 0;
  private invalid = 0;

  constructor(
    private readonly onValidFrame: ValidFrameHandler,
    private readonly onInvalidFrame?: InvalidFrameHandler
  ) {
    this.socket = dgram.createSocket('udp4');
    this.socket.on('message', (msg, rinfo) => this.handleMessage(msg, rinfo));
  }

  listen(port: number, host: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket.once('error', reject);
      this.socket.bind(port, host, () => {
        this.socket.removeListener('error', reject);
        resolve();
      });
    });
  }

  close(): void {
    this.socket.close();
  }

  address(): AddressInfo {
    return this.socket.address();
  }

  getStats(): ReceiverStats {
    return { received: this.received, invalid: this.invalid };
  }

  private handleMessage(msg: Buffer, rinfo: dgram.RemoteInfo): void {
    this.received++;

    const result = decodeFrame(msg);
    if (!result.ok) {
      this.invalid++;
      this.onInvalidFrame?.(result.reason, rinfo);
      return;
    }

    this.onValidFrame(result.frame, rinfo);
  }
}
