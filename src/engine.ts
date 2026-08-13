export type Verb = 'ask' | 'hide' | 'trust' | 'forge' | 'reveal' | 'cut';
export type ChoiceKind = 'normal' | 'warning' | 'cost' | 'crossed' | 'locked';
export type Ending = 'quiet-escape' | 'public-escape' | 'caught' | 'forgotten' | 'deadline';

export interface Choice {
  id: string;
  label: string;
  hint: string;
  next: string;
  verb: Verb;
  time?: number;
  suspicion?: number;
  trust?: number;
  requires?: Partial<Pick<GameState, 'time' | 'suspicion' | 'trust' | 'checkpoint'>>;
  contradiction?: [Verb, Verb];
}

export interface Scene {
  id: string;
  checkpoint: 0 | 1 | 2 | 3;
  kicker: string;
  title: string;
  body: string[];
  note?: string;
  choices: Choice[];
}

export interface GameState {
  sceneId: string;
  time: number;
  suspicion: number;
  trust: number;
  ink: number;
  checkpoint: number;
  turn: number;
  verbUses: Record<Verb, number>;
  verbs: Verb[];
  log: string[];
  feedback: string;
  ended?: Ending;
}

export const SAVE_VERSION = 3;
export const VERBS: { key: Verb; label: string }[] = [
  { key: 'ask', label: '묻기' },
  { key: 'hide', label: '숨기기' },
  { key: 'trust', label: '믿기' },
  { key: 'forge', label: '위조하기' },
  { key: 'reveal', label: '드러내기' },
  { key: 'cut', label: '끊기' },
];

const blankUses = (): Record<Verb, number> => ({ ask: 0, hide: 0, trust: 0, forge: 0, reveal: 0, cut: 0 });

export function initialState(): GameState {
  return {
    sceneId: 'desk', time: 9, suspicion: 0, trust: 1, ink: 1, checkpoint: 0, turn: 0,
    verbUses: blankUses(), verbs: [], log: [],
    feedback: '편집자는 아직 당신을 분류하지 못했습니다.',
  };
}

const copy = (state: GameState): GameState => ({
  ...state,
  verbUses: { ...state.verbUses },
  verbs: [...state.verbs],
  log: [...state.log],
});

function missesRequirement(state: GameState, choice: Choice): boolean {
  if (!choice.requires) return false;
  const { time, suspicion, trust, checkpoint } = choice.requires;
  return (time !== undefined && state.time < time)
    || (suspicion !== undefined && state.suspicion < suspicion)
    || (trust !== undefined && state.trust < trust)
    || (checkpoint !== undefined && state.checkpoint < checkpoint);
}

export function choiceKind(state: GameState, choice: Choice): ChoiceKind {
  if (missesRequirement(state, choice)) return 'locked';
  const uses = state.verbUses[choice.verb];
  if (uses >= 3) return 'crossed';
  if (uses === 2) return 'cost';
  if (uses === 1) return 'warning';
  return 'normal';
}

function checkpointFor(sceneId: string): number {
  if (sceneId === 'checkpoint-1' || sceneId === 'corridor') return 1;
  if (sceneId === 'checkpoint-2' || sceneId === 'print-floor') return 2;
  if (sceneId === 'final') return 3;
  return 0;
}

function applyFailure(state: GameState): void {
  if (state.time <= 0) state.ended = 'deadline';
  else if (state.suspicion >= 8) state.ended = 'caught';
  else if (state.trust <= -2) state.ended = 'forgotten';
}

export function choose(state: GameState, choice: Choice): GameState {
  const kind = choiceKind(state, choice);
  if (kind === 'crossed' || kind === 'locked' || state.ended) return state;

  const next = copy(state);
  const repeatTime = kind === 'cost' ? 1 : 0;
  const repeatSuspicion = kind === 'cost' ? 1 : 0;
  next.sceneId = choice.next;
  next.turn += 1;
  next.time -= (choice.time ?? 1) + repeatTime;
  next.suspicion = Math.max(0, next.suspicion + (choice.suspicion ?? 0) + repeatSuspicion);
  next.trust += choice.trust ?? 0;
  next.verbUses[choice.verb] += 1;
  if (!next.verbs.includes(choice.verb)) next.verbs.push(choice.verb);
  next.checkpoint = Math.max(next.checkpoint, checkpointFor(next.sceneId));

  const stage = kind === 'cost'
    ? `세 번째 ‘${choice.verb}’: 시간 -1, 의심 +1. 이제 이 동사는 삭제되었습니다.`
    : kind === 'warning'
      ? `두 번째 ‘${choice.verb}’: 편집자가 붉은 밑줄을 그었습니다. 다음 사용에는 대가가 붙습니다.`
      : `‘${choice.verb}’가 인물 설정에 기록되었습니다.`;
  next.feedback = `${choice.label} — ${stage}`;
  next.log.push(next.feedback);
  applyFailure(next);
  return next;
}

export function restoreVerb(state: GameState, verb: Verb): GameState {
  if (state.ink < 1 || state.verbUses[verb] < 3 || state.ended) return state;
  const next = copy(state);
  next.ink -= 1;
  next.time -= 2;
  next.suspicion += 2;
  next.verbUses[verb] = 1;
  next.feedback = `수정액으로 ‘${verb}’를 복원했습니다. 시간 -2, 의심 +2. 다음 사용은 경고 단계입니다.`;
  next.log.push(next.feedback);
  applyFailure(next);
  return next;
}

export function verbIsAvailable(state: GameState, verb: Verb): boolean {
  return state.verbs.includes(verb) && state.verbUses[verb] < 3;
}

export function resolveEnding(state: GameState, choice?: Choice): Ending | undefined {
  if (state.ended) return state.ended;
  if (state.sceneId !== 'final' || !choice) return undefined;
  if (choice.id === 'final-fail') return 'forgotten';
  if (!choice.contradiction?.every((verb) => verbIsAvailable(state, verb))) return 'caught';
  if (choice.id === 'final-public' && state.trust < 3) return 'forgotten';
  if (choice.id === 'final-quiet' && state.suspicion > 6) return 'caught';
  return choice.id === 'final-public' ? 'public-escape' : 'quiet-escape';
}

export function serialize(state: GameState): string {
  return JSON.stringify({ v: SAVE_VERSION, ...state });
}

export function deserialize(raw: string): GameState {
  const value = JSON.parse(raw);
  if (value.v !== SAVE_VERSION) throw new Error('old save');
  const { v: _version, ...state } = value;
  return state as GameState;
}
