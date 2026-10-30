import { Sequencer } from '../src/hub/sequencer';

describe('Sequencer', () => {
  it('accepte la premiere trame d\'un appareil sans aucune perte', () => {
    const sequencer = new Sequencer();
    expect(sequencer.process(1, 1)).toEqual({ accepted: true, lost: 0 });
  });

  it('accepte des sequences consecutives sans perte', () => {
    const sequencer = new Sequencer();
    sequencer.process(1, 1);
    expect(sequencer.process(1, 2)).toEqual({ accepted: true, lost: 0 });
    expect(sequencer.process(1, 3)).toEqual({ accepted: true, lost: 0 });
  });

  it('compte les trous de sequence comme des pertes', () => {
    const sequencer = new Sequencer();
    sequencer.process(1, 1);
    expect(sequencer.process(1, 5)).toEqual({ accepted: true, lost: 3 }); // 2,3,4 manquants
  });

  it('ecarte un doublon exact (meme seq deja vue)', () => {
    const sequencer = new Sequencer();
    sequencer.process(1, 10);
    expect(sequencer.process(1, 10)).toEqual({ accepted: false, lost: 0 });
  });

  it('ecarte une trame en retard (seq inferieure au dernier accepte)', () => {
    const sequencer = new Sequencer();
    sequencer.process(1, 10);
    sequencer.process(1, 11);
    expect(sequencer.process(1, 9)).toEqual({ accepted: false, lost: 0 });
  });

  it('une trame ecartee ne deplace pas le curseur de sequence', () => {
    const sequencer = new Sequencer();
    sequencer.process(1, 10);
    sequencer.process(1, 10); // doublon, ecarte
    // la prochaine trame attendue reste bien seq 11, sans perte comptee
    expect(sequencer.process(1, 11)).toEqual({ accepted: true, lost: 0 });
  });

  it('suit chaque appareil independamment', () => {
    const sequencer = new Sequencer();
    sequencer.process(1, 1);
    sequencer.process(1, 2);
    // l'appareil 2 commence a seq 1 sans etre affecte par l'appareil 1
    expect(sequencer.process(2, 1)).toEqual({ accepted: true, lost: 0 });
  });
});
