export interface SequenceResult {
  accepted: boolean;
  /** Nombre de trames manquantes juste avant celle-ci (0 si rejetee). */
  lost: number;
}

interface DeviceSequenceState {
  lastSeq: number;
}

/**
 * Suit, par appareil, le dernier numero de sequence accepte. Les doublons
 * et les trames en retard (seq deja vue, seq <= dernier accepte) sont
 * ecartes. Un saut de sequence est compte comme des pertes.
 */
export class Sequencer {
  private readonly stateByDevice = new Map<number, DeviceSequenceState>();

  process(deviceId: number, seq: number): SequenceResult {
    const state = this.stateByDevice.get(deviceId);

    if (state === undefined) {
      this.stateByDevice.set(deviceId, { lastSeq: seq });
      return { accepted: true, lost: 0 };
    }

    if (seq <= state.lastSeq) {
      return { accepted: false, lost: 0 };
    }

    const lost = seq - state.lastSeq - 1;
    state.lastSeq = seq;
    return { accepted: true, lost };
  }
}
