import type { Location } from './engine';

const AUDIO_KEY = 'midnight-frequency-ambient-audio-v1';

function readAudioPreference(): boolean {
  try { return window.localStorage.getItem(AUDIO_KEY) !== 'off'; } catch { return true; }
}
function writeAudioPreference(enabled: boolean): void {
  try { window.localStorage.setItem(AUDIO_KEY, enabled ? 'on' : 'off'); } catch { /* Audio still works for this session. */ }
}

type Cue = 'move' | 'collect' | 'solve' | 'choice';

const LOCATION_TONES: Record<Location, number> = {
  entrance: 48,
  lobby: 51,
  hall: 46,
  transmitter: 88,
  power: 60,
  archive: 55,
  studio: 66,
  passage: 43,
  booth: 76,
  roof: 40,
};

export class StationSoundscape {
  private context?: AudioContext;
  private master?: GainNode;
  private rainGain?: GainNode;
  private humGain?: GainNode;
  private signalGain?: GainNode;
  private rainFilter?: BiquadFilterNode;
  private hum?: OscillatorNode;
  private signal?: OscillatorNode;
  private started = false;
  private enabled = readAudioPreference();

  isEnabled(): boolean { return this.enabled; }

  async start(): Promise<void> {
    if (!this.enabled) return;
    this.ensureGraph();
    if (!this.context || !this.master) return;
    if (this.context.state === 'suspended') await this.context.resume();
    this.started = true;
    this.ramp(this.master.gain, .055, .7);
  }

  async toggle(): Promise<boolean> {
    this.enabled = !this.enabled;
    writeAudioPreference(this.enabled);
    if (this.enabled) await this.start();
    else if (this.master) this.ramp(this.master.gain, 0, .22);
    return this.enabled;
  }

  sync(location: Location, tension: number, quiet: boolean): void {
    if (!this.started || !this.context || !this.master || !this.signal || !this.signalGain || !this.rainGain || !this.humGain || !this.rainFilter) return;
    const now = this.context.currentTime;
    const danger = Math.max(0, Math.min(1, tension / 100));
    this.signal.frequency.cancelScheduledValues(now);
    this.signal.frequency.linearRampToValueAtTime(LOCATION_TONES[location] + danger * 7, now + .45);
    this.ramp(this.signalGain.gain, .006 + danger * .009, .45);
    this.ramp(this.humGain.gain, .014 + danger * .007, .45);
    this.ramp(this.rainGain.gain, .018 + danger * .011, .45);
    this.rainFilter.frequency.cancelScheduledValues(now);
    this.rainFilter.frequency.linearRampToValueAtTime(1800 + danger * 1100, now + .45);
    this.ramp(this.master.gain, quiet || !this.enabled ? 0 : .055 + danger * .012, .35);
  }

  cue(kind: Cue): void {
    if (!this.started || !this.enabled || !this.context || !this.master) return;
    const now = this.context.currentTime;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = kind === 'solve' ? 'sine' : kind === 'collect' ? 'triangle' : 'sawtooth';
    const [start, end, duration, peak] = kind === 'solve'
      ? [220, 440, .52, .08]
      : kind === 'collect'
        ? [360, 180, .2, .045]
        : kind === 'choice'
          ? [92, 46, .4, .06]
          : [120, 72, .13, .025];
    oscillator.frequency.setValueAtTime(start, now);
    oscillator.frequency.exponentialRampToValueAtTime(end, now + duration);
    gain.gain.setValueAtTime(.0001, now);
    gain.gain.exponentialRampToValueAtTime(peak, now + .025);
    gain.gain.exponentialRampToValueAtTime(.0001, now + duration);
    oscillator.connect(gain).connect(this.master);
    oscillator.start(now);
    oscillator.stop(now + duration + .02);
  }

  private ensureGraph(): void {
    if (this.context) return;
    this.context = new AudioContext();
    const context = this.context;
    this.master = context.createGain();
    this.master.gain.value = .0001;
    const compressor = context.createDynamicsCompressor();
    compressor.threshold.value = -24;
    compressor.knee.value = 18;
    compressor.ratio.value = 5;
    compressor.attack.value = .01;
    compressor.release.value = .35;
    this.master.connect(compressor).connect(context.destination);

    this.rainGain = context.createGain();
    this.rainGain.gain.value = .02;
    this.rainFilter = context.createBiquadFilter();
    this.rainFilter.type = 'bandpass';
    this.rainFilter.frequency.value = 1900;
    this.rainFilter.Q.value = .45;
    const rain = context.createBufferSource();
    rain.buffer = this.noiseBuffer(context);
    rain.loop = true;
    rain.connect(this.rainFilter).connect(this.rainGain).connect(this.master);
    rain.start();

    this.humGain = context.createGain();
    this.humGain.gain.value = .014;
    this.hum = context.createOscillator();
    this.hum.type = 'sine';
    this.hum.frequency.value = 49;
    this.hum.connect(this.humGain).connect(this.master);
    this.hum.start();

    this.signalGain = context.createGain();
    this.signalGain.gain.value = .006;
    this.signal = context.createOscillator();
    this.signal.type = 'triangle';
    this.signal.frequency.value = LOCATION_TONES.entrance;
    this.signal.connect(this.signalGain).connect(this.master);
    this.signal.start();
  }

  private noiseBuffer(context: AudioContext): AudioBuffer {
    const buffer = context.createBuffer(1, context.sampleRate * 2, context.sampleRate);
    const data = buffer.getChannelData(0);
    let seed = 0x51f15e;
    for (let index = 0; index < data.length; index += 1) {
      seed ^= seed << 13;
      seed ^= seed >>> 17;
      seed ^= seed << 5;
      data[index] = ((seed >>> 0) / 0xffffffff) * 2 - 1;
    }
    return buffer;
  }

  private ramp(parameter: AudioParam, value: number, seconds: number): void {
    if (!this.context) return;
    const now = this.context.currentTime;
    parameter.cancelScheduledValues(now);
    parameter.setValueAtTime(Math.max(.0001, parameter.value), now);
    parameter.exponentialRampToValueAtTime(Math.max(.0001, value), now + seconds);
  }
}

export const stationSoundscape = new StationSoundscape();
