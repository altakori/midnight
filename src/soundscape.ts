import type { Location } from './engine';

const AUDIO_KEY = 'midnight-frequency-ambient-audio-v1';

function readAudioPreference(): boolean {
  try { return window.localStorage.getItem(AUDIO_KEY) !== 'off'; } catch { return true; }
}
function writeAudioPreference(enabled: boolean): void {
  try { window.localStorage.setItem(AUDIO_KEY, enabled ? 'on' : 'off'); } catch { /* Audio still works for this session. */ }
}

export type SoundCue = 'move' | 'collect' | 'error' | 'solve' | 'choice';

const CUE_FILES: Record<SoundCue, string> = {
  move: 'sfx-navigate.ogg',
  collect: 'sfx-collect.ogg',
  error: 'sfx-error.ogg',
  solve: 'sfx-solve.ogg',
  choice: 'sfx-choice.ogg',
};

const CUE_VOLUMES: Record<SoundCue, number> = {
  move: .32,
  collect: .42,
  error: .5,
  solve: .6,
  choice: .48,
};

function audioAsset(file: string): string { return `${import.meta.env.BASE_URL}audio/${file}`; }
function createAudio(file: string, loop = false): HTMLAudioElement {
  const audio = new Audio(audioAsset(file));
  audio.preload = 'auto';
  audio.loop = loop;
  audio.load();
  return audio;
}

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
  private output?: GainNode;
  private master?: GainNode;
  private musicGain?: GainNode;
  private effectsGain?: GainNode;
  private rainGain?: GainNode;
  private humGain?: GainNode;
  private signalGain?: GainNode;
  private rainFilter?: BiquadFilterNode;
  private hum?: OscillatorNode;
  private signal?: OscillatorNode;
  private started = false;
  private enabled = readAudioPreference();
  private readonly music = createAudio('station-ambient.ogg', true);
  private readonly samples = Object.fromEntries(
    Object.entries(CUE_FILES).map(([kind, file]) => {
      const sample = createAudio(file);
      sample.volume = CUE_VOLUMES[kind as SoundCue];
      return [kind, sample];
    }),
  ) as Record<SoundCue, HTMLAudioElement>;
  private readonly lastCueAt = new Map<SoundCue, number>();

  isEnabled(): boolean { return this.enabled; }

  async start(): Promise<void> {
    if (!this.enabled) return;
    this.ensureGraph();
    if (!this.context || !this.output) return;
    this.started = true;
    const resume = this.context.state === 'suspended' ? this.context.resume() : Promise.resolve();
    const music = this.music.play().catch(() => { /* Visual play remains complete if media playback is blocked. */ });
    await Promise.all([resume, music]);
    this.ramp(this.output.gain, 1, .7);
  }

  async toggle(): Promise<boolean> {
    this.enabled = !this.enabled;
    writeAudioPreference(this.enabled);
    if (this.enabled) await this.start();
    else {
      if (this.output) this.ramp(this.output.gain, 0, .22);
      this.music.pause();
    }
    return this.enabled;
  }

  sync(location: Location, tension: number, quiet: boolean): void {
    if (!this.started || !this.context || !this.output || !this.master || !this.musicGain || !this.signal || !this.signalGain || !this.rainGain || !this.humGain || !this.rainFilter) return;
    const now = this.context.currentTime;
    const danger = Math.max(0, Math.min(1, tension / 100));
    this.signal.frequency.cancelScheduledValues(now);
    this.signal.frequency.linearRampToValueAtTime(LOCATION_TONES[location] + danger * 7, now + .45);
    this.ramp(this.signalGain.gain, .006 + danger * .009, .45);
    this.ramp(this.humGain.gain, .014 + danger * .007, .45);
    this.ramp(this.rainGain.gain, .018 + danger * .011, .45);
    this.rainFilter.frequency.cancelScheduledValues(now);
    this.rainFilter.frequency.linearRampToValueAtTime(1800 + danger * 1100, now + .45);
    this.ramp(this.master.gain, .048 + danger * .012, .35);
    this.ramp(this.musicGain.gain, .13 + danger * .045, .7);
    this.ramp(this.output.gain, quiet || !this.enabled ? 0 : 1, .35);
  }

  cue(kind: SoundCue): void {
    if (!this.enabled) return;
    const now = performance.now();
    if (now - (this.lastCueAt.get(kind) ?? -Infinity) < 35) return;
    this.lastCueAt.set(kind, now);
    const play = (): void => {
      const sample = this.samples[kind];
      sample.currentTime = 0;
      void sample.play().catch(() => { /* Interaction remains functional if media playback is blocked. */ });
    };
    if (this.started) play();
    else void this.start().then(play).catch(() => { /* Interaction remains functional without audio. */ });
  }

  private ensureGraph(): void {
    if (this.context) return;
    this.context = new AudioContext();
    const context = this.context;
    this.output = context.createGain();
    this.output.gain.value = .0001;
    this.master = context.createGain();
    this.master.gain.value = .048;
    this.musicGain = context.createGain();
    this.musicGain.gain.value = .13;
    this.effectsGain = context.createGain();
    this.effectsGain.gain.value = .42;
    const compressor = context.createDynamicsCompressor();
    compressor.threshold.value = -24;
    compressor.knee.value = 18;
    compressor.ratio.value = 5;
    compressor.attack.value = .01;
    compressor.release.value = .35;
    this.master.connect(this.output);
    this.musicGain.connect(this.output);
    this.effectsGain.connect(this.output);
    this.output.connect(compressor).connect(context.destination);
    context.createMediaElementSource(this.music).connect(this.musicGain);
    Object.values(this.samples).forEach((sample) => context.createMediaElementSource(sample).connect(this.effectsGain!));

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
