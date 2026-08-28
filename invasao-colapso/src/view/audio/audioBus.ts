import { SFX } from './sfx.catalog';
import type { SfxCategory, SfxId, SynthSpec } from './sfx.catalog';

/**
 * BARRAMENTO DE ÁUDIO.
 *
 * Categorias com volume próprio, silenciamento e preferência guardada. Não
 * existe asset final ainda: cada som é sintetizado a partir do catálogo,
 * declaradamente como PLACEHOLDER. Quando os arquivos chegarem, só o método
 * `play` muda — quem chama continua igual.
 *
 * Regras:
 *  - nunca inicializa o áudio sozinho: o navegador exige um gesto do usuário;
 *  - nunca lança: som é enfeite, não pode derrubar a partida;
 *  - respeita `prefers-reduced-motion` como pista de "modo discreto".
 */

const STORAGE_KEY = 'invasao-colapso:audio:v1';

export interface AudioPreferences {
  muted: boolean;
  master: number;
  categories: Partial<Record<SfxCategory, number>>;
}

const DEFAULT_PREFS: AudioPreferences = {
  muted: false,
  master: 0.7,
  categories: {},
};

function readPrefs(): AudioPreferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULT_PREFS, ...(JSON.parse(raw) as AudioPreferences) } : DEFAULT_PREFS;
  } catch {
    return DEFAULT_PREFS;
  }
}

function writePrefs(prefs: AudioPreferences): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    /* armazenamento indisponível */
  }
}

export class AudioBus {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private prefs: AudioPreferences = readPrefs();
  /** true enquanto não houve gesto do usuário. */
  private locked = true;

  get preferences(): AudioPreferences {
    return this.prefs;
  }

  get ready(): boolean {
    return this.context !== null && !this.locked;
  }

  /** Chamado no primeiro gesto real do usuário. Sem isso, nada toca. */
  unlock(): void {
    if (this.context) {
      this.locked = false;
      void this.context.resume().catch(() => undefined);
      return;
    }
    try {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      this.context = new Ctor();
      this.master = this.context.createGain();
      this.master.gain.value = this.prefs.muted ? 0 : this.prefs.master;
      this.master.connect(this.context.destination);
      this.locked = false;
    } catch {
      // Sem áudio neste navegador: o jogo segue normalmente, em silêncio.
      this.context = null;
    }
  }

  setMuted(muted: boolean): void {
    this.prefs = { ...this.prefs, muted };
    writePrefs(this.prefs);
    if (this.master) this.master.gain.value = muted ? 0 : this.prefs.master;
  }

  setMaster(volume: number): void {
    const clamped = Math.max(0, Math.min(1, volume));
    this.prefs = { ...this.prefs, master: clamped };
    writePrefs(this.prefs);
    if (this.master && !this.prefs.muted) this.master.gain.value = clamped;
  }

  setCategory(category: SfxCategory, volume: number): void {
    this.prefs = {
      ...this.prefs,
      categories: { ...this.prefs.categories, [category]: Math.max(0, Math.min(1, volume)) },
    };
    writePrefs(this.prefs);
  }

  /**
   * Toca um som do catálogo.
   *
   * Hoje sintetiza; amanhã, com o arquivo em `sfx.asset`, decodifica e toca
   * o sample. A assinatura não muda.
   */
  play(id: SfxId): void {
    const sfx = SFX[id];
    if (!sfx || !this.context || !this.master || this.locked || this.prefs.muted) return;
    const categoryGain = this.prefs.categories[sfx.category] ?? 1;
    if (categoryGain <= 0) return;
    try {
      this.synthesize(sfx.synth, categoryGain, sfx.pitchJitter ?? 0);
    } catch {
      /* som nunca derruba a partida */
    }
  }

  /** Toca uma sequência com atrasos — usado pela arena de dados. */
  playSequence(steps: { id: SfxId; atMs: number }[]): void {
    for (const step of steps) {
      window.setTimeout(() => this.play(step.id), Math.max(0, step.atMs));
    }
  }

  private synthesize(spec: SynthSpec, categoryGain: number, jitter: number): void {
    const ctx = this.context!;
    const now = ctx.currentTime;
    // Pequena variação de altura: repetições não soam idênticas.
    const wobble = 1 + (Math.random() - 0.5) * 2 * jitter;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(
      Math.max(0.0002, spec.gain * categoryGain),
      now + Math.min(0.02, spec.duration * 0.25),
    );
    gain.gain.exponentialRampToValueAtTime(0.0001, now + spec.duration);
    gain.connect(this.master!);

    const osc = ctx.createOscillator();
    osc.type = spec.wave;
    osc.frequency.setValueAtTime(spec.from * wobble, now);
    osc.frequency.exponentialRampToValueAtTime(
      Math.max(20, spec.to * wobble),
      now + spec.duration,
    );
    osc.connect(gain);
    osc.start(now);
    osc.stop(now + spec.duration + 0.02);

    // Impactos ganham um estalo de ruído por cima.
    if (spec.noise && spec.noise > 0) {
      const frames = Math.floor(ctx.sampleRate * Math.min(0.12, spec.duration));
      const buffer = ctx.createBuffer(1, Math.max(1, frames), ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i += 1) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
      }
      const noiseSource = ctx.createBufferSource();
      noiseSource.buffer = buffer;
      const noiseGain = ctx.createGain();
      noiseGain.gain.value = spec.gain * spec.noise * categoryGain;
      noiseSource.connect(noiseGain).connect(this.master!);
      noiseSource.start(now);
    }
  }
}

/** Instância única usada pela interface. */
export const audio = new AudioBus();
