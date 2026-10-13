import type { Location } from './engine';

const AUDIO_KEY = 'midnight-frequency-ambient-audio-v1';
const MUSIC_VOLUME_KEY = 'midnight-frequency-music-volume-v1';

function readAudioPreference(): boolean {
  try { return window.localStorage.getItem(AUDIO_KEY) !== 'off'; } catch { return true; }
}
function writeAudioPreference(enabled: boolean): void {
  try { window.localStorage.setItem(AUDIO_KEY, enabled ? 'on' : 'off'); } catch { /* Audio still works for this session. */ }
}
function readMusicVolume(): number {
  try {
    const raw = window.localStorage.getItem(MUSIC_VOLUME_KEY);
    if (raw === null) return .55;
    const saved = Number(raw);
    return Number.isFinite(saved) && saved >= 0 && saved <= 1 ? saved : .55;
  } catch { return .55; }
}

export type SoundCue = 'move' | 'collect' | 'error' | 'solve' | 'choice';
export type PuzzleControlCue = 'switch' | 'tape' | 'slider';

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
  private stormGain?: GainNode;
  private humGain?: GainNode;
  private signalGain?: GainNode;
  private rainFilter?: BiquadFilterNode;
  private hum?: OscillatorNode;
  private signal?: OscillatorNode;
  private started = false;
  private enabled = readAudioPreference();
  private musicLevel = readMusicVolume();
  private lastTension = 0;
  private readonly music = createAudio('station-ambient.ogg', true);
  private readonly samples = Object.fromEntries(
    Object.entries(CUE_FILES).map(([kind, file]) => {
      const sample = createAudio(file);
      sample.volume = CUE_VOLUMES[kind as SoundCue];
      return [kind, sample];
    }),
  ) as Record<SoundCue, HTMLAudioElement>;
  private readonly lastCueAt = new Map<SoundCue, number>();
  private lastControlAt = 0;

  isEnabled(): boolean { return this.enabled; }
  getMusicVolume(): number { return Math.round(this.musicLevel * 100); }
  setMusicVolume(percent: number): void {
    this.musicLevel = Math.min(1, Math.max(0, percent / 100));
    try { window.localStorage.setItem(MUSIC_VOLUME_KEY, String(this.musicLevel)); } catch { /* Private mode can reject storage. */ }
    if (this.musicGain) this.ramp(this.musicGain.gain, (.18 + this.lastTension / 2500) * this.musicLevel, .08);
  }

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
    this.lastTension = tension;
    this.signal.frequency.cancelScheduledValues(now);
    this.signal.frequency.linearRampToValueAtTime(LOCATION_TONES[location] + danger * 7, now + .45);
    this.ramp(this.signalGain.gain, .006 + danger * .009, .45);
    this.ramp(this.humGain.gain, .014 + danger * .007, .45);
    this.ramp(this.rainGain.gain, .075 + danger * .035, .45);
    if (this.stormGain) this.ramp(this.stormGain.gain, .018 + danger * .016, .55);
    this.rainFilter.frequency.cancelScheduledValues(now);
    this.rainFilter.frequency.linearRampToValueAtTime(1350 + danger * 700, now + .45);
    this.ramp(this.master.gain, .13 + danger * .035, .35);
    this.ramp(this.musicGain.gain, (.18 + danger * .04) * this.musicLevel, .7);
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

  frequencyStep(mhz: number): void {
    this.playProcedural(() => this.playFrequencyStep(mhz));
  }

  control(kind: PuzzleControlCue): void {
    const now = performance.now();
    if (now - this.lastControlAt < 32) return;
    this.lastControlAt = now;
    this.playProcedural(() => this.playControl(kind));
  }

  solve(stage: number): void {
    this.playProcedural(() => this.playPuzzleSolve(stage));
  }

  private ensureGraph(): void {
    if (this.context) return;
    this.context = new AudioContext();
    const context = this.context;
    this.output = context.createGain();
    this.output.gain.value = .0001;
    this.master = context.createGain();
    this.master.gain.value = .13;
    this.musicGain = context.createGain();
    this.musicGain.gain.value = .18 * this.musicLevel;
    this.effectsGain = context.createGain();
    this.effectsGain.gain.value = .5;
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
    this.rainGain.gain.value = .08;
    this.rainFilter = context.createBiquadFilter();
    this.rainFilter.type = 'bandpass';
    this.rainFilter.frequency.value = 1450;
    this.rainFilter.Q.value = .32;
    const rain = context.createBufferSource();
    rain.buffer = this.rainBuffer(context);
    rain.loop = true;
    rain.connect(this.rainFilter).connect(this.rainGain).connect(this.master);
    rain.start();

    this.stormGain = context.createGain();
    this.stormGain.gain.value = .02;
    const stormFilter = context.createBiquadFilter();
    stormFilter.type = 'lowpass';
    stormFilter.frequency.value = 420;
    stormFilter.Q.value = .65;
    const storm = context.createBufferSource();
    storm.buffer = this.noiseBuffer(context, 0x7a4d21);
    storm.loop = true;
    storm.connect(stormFilter).connect(this.stormGain).connect(this.master);
    storm.start();

    const gust = context.createOscillator();
    const gustDepth = context.createGain();
    gust.type = 'sine';
    gust.frequency.value = .11;
    gustDepth.gain.value = .035;
    gust.connect(gustDepth).connect(this.rainGain.gain);
    gust.start();

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

  private noiseBuffer(context: AudioContext, initialSeed = 0x51f15e): AudioBuffer {
    const buffer = context.createBuffer(1, context.sampleRate * 2, context.sampleRate);
    const data = buffer.getChannelData(0);
    let seed = initialSeed;
    for (let index = 0; index < data.length; index += 1) {
      seed ^= seed << 13;
      seed ^= seed >>> 17;
      seed ^= seed << 5;
      data[index] = ((seed >>> 0) / 0xffffffff) * 2 - 1;
    }
    return buffer;
  }

  private rainBuffer(context: AudioContext): AudioBuffer {
    const buffer = context.createBuffer(1, context.sampleRate * 3, context.sampleRate);
    const data = buffer.getChannelData(0);
    let seed = 0x4d3a91;
    let wash = 0;
    for (let index = 0; index < data.length; index += 1) {
      seed ^= seed << 13;
      seed ^= seed >>> 17;
      seed ^= seed << 5;
      const white = ((seed >>> 0) / 0xffffffff) * 2 - 1;
      wash = wash * .91 + white * .09;
      const drop = (seed & 0x3ff) < 3 ? white * .5 : 0;
      data[index] = white * .28 + wash * .58 + drop;
    }
    return buffer;
  }

  private playProcedural(play: () => void): void {
    if (!this.enabled) return;
    if (this.started) play();
    else void this.start().then(play).catch(() => { /* Interaction remains functional without audio. */ });
  }

  private playFrequencyStep(mhz: number): void {
    if (!this.context || !this.effectsGain) return;
    const context = this.context;
    const now = context.currentTime;
    const distance = Math.min(8, Math.abs(88 - mhz));
    const clarity = 1 - distance / 8;
    const burst = context.createBufferSource();
    burst.buffer = this.noiseBuffer(context, 0x880000 + Math.round(mhz * 10));
    const filter = context.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 620 + clarity * 2600;
    filter.Q.value = .65 + clarity * 2.2;
    const gain = context.createGain();
    gain.gain.setValueAtTime(.13 - clarity * .075, now);
    gain.gain.exponentialRampToValueAtTime(.0001, now + .16);
    burst.connect(filter).connect(gain).connect(this.effectsGain);
    burst.start(now);
    burst.stop(now + .18);

    const carrier = context.createOscillator();
    const carrierGain = context.createGain();
    carrier.type = clarity > .72 ? 'sine' : 'triangle';
    carrier.frequency.setValueAtTime(175 + (mhz - 80) * 13, now);
    carrierGain.gain.setValueAtTime(.008 + clarity * .04, now);
    carrierGain.gain.exponentialRampToValueAtTime(.0001, now + .18);
    carrier.connect(carrierGain).connect(this.effectsGain);
    carrier.start(now);
    carrier.stop(now + .19);
  }

  private playControl(kind: PuzzleControlCue): void {
    if (!this.context || !this.effectsGain) return;
    const context = this.context;
    const now = context.currentTime;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = kind === 'switch' ? 'square' : kind === 'tape' ? 'sawtooth' : 'triangle';
    const startFrequency = kind === 'switch' ? 145 : kind === 'tape' ? 92 : 310;
    oscillator.frequency.setValueAtTime(startFrequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(kind === 'slider' ? 220 : 58, now + .075);
    gain.gain.setValueAtTime(kind === 'switch' ? .11 : .07, now);
    gain.gain.exponentialRampToValueAtTime(.0001, now + (kind === 'tape' ? .14 : .09));
    oscillator.connect(gain).connect(this.effectsGain);
    oscillator.start(now);
    oscillator.stop(now + (kind === 'tape' ? .15 : .1));
  }

  private playPuzzleSolve(stage: number): void {
    if (!this.context || !this.effectsGain) return;
    const context = this.context;
    const now = context.currentTime;
    const root = 196 + Math.max(0, Math.min(4, stage - 1)) * 14;
    [1, 1.25, 1.5].forEach((ratio, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = index === 0 ? 'triangle' : 'sine';
      oscillator.frequency.setValueAtTime(root * ratio, now + index * .075);
      oscillator.frequency.exponentialRampToValueAtTime(root * ratio * 1.045, now + .7);
      gain.gain.setValueAtTime(.0001, now);
      gain.gain.exponentialRampToValueAtTime(.038 / (index + 1), now + .12 + index * .075);
      gain.gain.exponentialRampToValueAtTime(.0001, now + .9);
      oscillator.connect(gain).connect(this.effectsGain!);
      oscillator.start(now + index * .075);
      oscillator.stop(now + .94);
    });
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
