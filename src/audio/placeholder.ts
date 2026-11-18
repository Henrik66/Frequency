// Placeholder sound for the spike: a synth voice per station, static noise between,
// dial clicks and event blips. Real ElevenLabs music replaces the station voices later.
import type { StationId } from '../sim/stations';
import type { World, WorldEvent } from '../sim/world';

export interface PlaceholderAudio {
  resume(): void;
  update(world: World): void;
  event(e: WorldEvent): void;
}

export function createPlaceholderAudio(): PlaceholderAudio {
  let ctx: AudioContext | undefined;
  let master: GainNode;
  let noiseGain: GainNode;
  let noiseFilter: BiquadFilterNode;
  const stationGain = {} as Record<StationId, GainNode>;

  function build(c: AudioContext) {
    master = c.createGain();
    master.gain.value = 0.5;
    const limiter = c.createDynamicsCompressor();
    master.connect(limiter).connect(c.destination);

    // Static: looping white noise through a band-pass that sweeps with the dial.
    const buf = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
    const data = buf.getChannelData(0);
    let seed = 1;
    for (let i = 0; i < data.length; i++) {
      seed = (seed * 16807) % 2147483647;
      data[i] = (seed / 2147483647) * 2 - 1;
    }
    const noise = c.createBufferSource();
    noise.buffer = buf;
    noise.loop = true;
    noiseFilter = c.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.Q.value = 0.8;
    noiseGain = c.createGain();
    noiseGain.gain.value = 0;
    noise.connect(noiseFilter).connect(noiseGain).connect(master);
    noise.start();

    // Each station: a small chord with a pulsing gain at the shared 90 BPM grid.
    const voice = (id: StationId, type: OscillatorType, freqs: number[], pulseHz: number) => {
      const g = c.createGain();
      g.gain.value = 0;
      const pulse = c.createGain();
      pulse.gain.value = 0.5;
      const lfo = c.createOscillator();
      lfo.frequency.value = pulseHz;
      const lfoAmt = c.createGain();
      lfoAmt.gain.value = 0.5;
      lfo.connect(lfoAmt).connect(pulse.gain);
      lfo.start();
      const lp = c.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = type === 'sine' ? 2000 : 1400;
      for (const f of freqs) {
        const o = c.createOscillator();
        o.type = type;
        o.frequency.value = f;
        o.connect(lp);
        o.start();
      }
      lp.connect(pulse).connect(g).connect(master);
      stationGain[id] = g;
    };
    // D minor family: D, F, A.
    voice('velvet', 'sine', [146.83, 174.61, 220.0], 0.75);
    voice('riot', 'sawtooth', [73.42, 110.0], 6);
    voice('forecast', 'triangle', [293.66, 349.23, 440.0], 0.25);
    voice('rewind', 'square', [220.0, 174.61], 1.5);
  }

  function blip(freq: number, dur: number, type: OscillatorType = 'square', vol = 0.15, slide = 0) {
    if (!ctx) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(master);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  return {
    resume() {
      if (!ctx) {
        ctx = new AudioContext({ latencyHint: 'interactive' });
        build(ctx);
      }
      void ctx.resume();
    },
    update(world) {
      if (!ctx) return;
      const t = ctx.currentTime;
      let maxS = 0;
      for (const id of Object.keys(stationGain) as StationId[]) {
        const s = world.strengths[id];
        maxS = Math.max(maxS, s);
        stationGain[id].gain.setTargetAtTime(0.12 * s * s, t, 0.03);
      }
      noiseGain.gain.setTargetAtTime(0.07 * (1 - maxS), t, 0.03);
      noiseFilter.frequency.setTargetAtTime(300 + (world.dial.freq - 88) * 180, t, 0.03);
    },
    event(e) {
      switch (e) {
        case 'tick':
          return blip(2400, 0.015, 'square', 0.04);
        case 'lock':
          return blip(880, 0.12, 'sine', 0.12);
        case 'thud':
          return blip(90, 0.18, 'sine', 0.35, -40);
        case 'jump':
          return blip(330, 0.09, 'triangle', 0.1, 220);
        case 'land':
          return blip(120, 0.06, 'sine', 0.12);
        case 'die':
          return blip(300, 0.35, 'sawtooth', 0.12, -250);
        case 'win':
          return blip(523, 0.4, 'triangle', 0.15, 520);
        case 'tape':
          return blip(1046, 0.25, 'sine', 0.15, 200);
      }
    },
  };
}
