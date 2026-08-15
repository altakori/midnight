export const SAVE_VERSION = 8;

export type Location = 'entrance' | 'lobby' | 'hall' | 'transmitter' | 'power' | 'archive' | 'studio' | 'passage' | 'booth' | 'roof';
export type ItemId = 'handheld-radio' | 'frequency-card' | 'insulated-gloves' | 'breaker-key' | 'recording-reel' | 'station-log' | 'flashlight' | 'color-filters' | 'sibling-photo' | 'roof-key' | 'memory-tape';
export type Ending = 'restore' | 'erase' | 'human';
export type EditorialAction = 'record' | 'delete';
export type PuzzleStatus = 'locked' | 'active' | 'solved';
export type HotspotReward = { type: 'item'; id: ItemId } | { type: 'clue'; id: string };
export interface Hotspot { id: string; label: string; location: Location; reward: HotspotReward; requiresArchive?: boolean }
export interface Clue { id: string; title: string; text: string; location: Location }
export interface PuzzleState { status: PuzzleStatus; attempts: number; input: string[]; feedback: string }
export interface GameState {
  version: number; location: Location; inventory: ItemId[]; found: Set<string>; clues: Set<string>;
  unlocked: boolean; archiveLit: boolean; shadowSeen: boolean;
  tension: number; failedActions: number; message: string; ending?: Ending;
  editorialScore: number; ink: number; correctionFluid: number; contradictions: number;
  clueDecisions: Record<string, EditorialAction>; pendingClue?: string;
  frequency: PuzzleState; breaker: PuzzleState; recordings: PuzzleState; flashlight: PuzzleState; finalStatement: PuzzleState;
  rememberedSibling: boolean;
}
export type EndingAvailability = Record<Ending, boolean> & { resolved: number };

export const LOCATION_ORDER: Location[] = ['entrance', 'lobby', 'hall', 'transmitter', 'power', 'archive', 'studio', 'passage', 'booth', 'roof'];
export const LOCATIONS: Record<string, { title: string; subtitle: string; act: 1 | 2 | 3; art: string }> = {
  entrance: { title: '폭풍 속 산속 방송국 입구', subtitle: '번개가 철문을 때리고, 안에서 동생의 목소리가 들린다.', act: 1, art: 'entrance' },
  lobby: { title: '젖은 로비', subtitle: '벽시계는 자정 30분 전에 멈췄다.', act: 1, art: 'lobby' },
  hall: { title: '긴 복도', subtitle: '낡은 스피커가 당신의 최근 기억부터 지운다.', act: 1, art: 'hall' },
  transmitter: { title: '송신실', subtitle: '폭풍 잡음 속에서 주파수 순서가 반복된다.', act: 1, art: 'transmitter' },
  power: { title: '전력실', subtitle: '차단기에 누군가 급히 남긴 연결 순서가 있다.', act: 1, art: 'power' },
  archive: { title: '방송 기록 보관실', subtitle: '날짜가 없는 테이프들이 선반에 쌓여 있다.', act: 2, art: 'archive' },
  studio: { title: '녹음실', subtitle: '마지막 녹음에서 동생의 목소리가 들린다.', act: 2, art: 'studio' },
  passage: { title: '숨은 통로', subtitle: '색 필터를 비춘 벽에 숨은 길이 나타난다.', act: 2, art: 'passage' },
  booth: { title: '심야 방송실', subtitle: '마이크에서 기억을 지우는 거짓 방송이 반복된다.', act: 3, art: 'booth' },
  roof: { title: '안테나 지붕', subtitle: '자정이 다가온다. 동생을 구할지, 방송을 지울지 결정해야 한다.', act: 3, art: 'roof' },
};

export const ITEM_INFO: Record<ItemId, { name: string; icon: string; description: string }> = {
  'handheld-radio': { name: '휴대용 라디오', icon: '◉', description: '폭풍 잡음 사이로 방송을 들을 수 있다.' },
  'frequency-card': { name: '주파수 카드', icon: '▤', description: '송신실의 숫자 네 개가 번개가 친 순서대로 적혀 있다.' },
  'insulated-gloves': { name: '절연 장갑', icon: '♧', description: '젖은 전선을 안전하게 만질 수 있다.' },
  'breaker-key': { name: '차단기 열쇠', icon: '⚿', description: '전력실의 작은 차단기 덮개를 연다.' },
  'recording-reel': { name: '녹음 릴', icon: '◎', description: '녹음 순서를 맞추면 재생할 수 있다.' },
  'station-log': { name: '방송국 기록 일지', icon: '▥', description: '테이프의 날짜와 그날 일을 확인할 수 있다.' },
  flashlight: { name: '색 필터 손전등', icon: '✦', description: '세 가지 색의 빛을 차례로 비출 수 있다.' },
  'color-filters': { name: '색 필터 세트', icon: '◈', description: '벽에 남은 빛나는 자국을 확인할 수 있다.' },
  'sibling-photo': { name: '동생 사진', icon: '▣', description: '기억이 지워져도 사진의 손글씨는 남아 있다.' },
  'roof-key': { name: '지붕 열쇠', icon: '⚿', description: '안테나 지붕으로 가는 마지막 문을 연다.' },
  'memory-tape': { name: '기억 테이프', icon: '◌', description: '진짜 목소리와 거짓 방송을 비교할 수 있다.' },
};

export const CLUES: Clue[] = [
  { id: 'storm-note', title: '폭풍 경보 메모', text: '자정 방송을 들으면 최근 기억부터 사라진다.', location: 'lobby' },
  { id: 'sibling-call', title: '하윤의 호출', text: '“거짓말을 고르면 문이 닫혀.”', location: 'studio' },
  { id: 'false-script', title: '수상한 방송 내용', text: '방송에서는 하윤이 이미 산을 떠났다고 하지만, 기록에는 오늘 밤 날짜가 적혀 있다.', location: 'booth' },
];

export const HOTSPOTS: Hotspot[] = [
  { id: 'entrance-radio', label: '문 옆 휴대 라디오', location: 'entrance', reward: { type: 'item', id: 'handheld-radio' } },
  { id: 'lobby-frequency', label: '젖은 주파수 카드', location: 'lobby', reward: { type: 'item', id: 'frequency-card' } },
  { id: 'hall-gloves', label: '경비함의 절연 장갑', location: 'hall', reward: { type: 'item', id: 'insulated-gloves' } },
  { id: 'transmitter-key', label: '송신기 아래 열쇠', location: 'transmitter', reward: { type: 'item', id: 'breaker-key' } },
  { id: 'power-reel', label: '전력실의 녹음 릴', location: 'power', reward: { type: 'item', id: 'recording-reel' } },
  { id: 'archive-log', label: '날짜가 적힌 기록 일지', location: 'archive', reward: { type: 'item', id: 'station-log' } },
  { id: 'studio-flashlight', label: '방음벽 뒤의 손전등', location: 'studio', reward: { type: 'item', id: 'flashlight' } },
  { id: 'studio-filters', label: '색 필터 상자', location: 'studio', reward: { type: 'item', id: 'color-filters' } },
  { id: 'passage-photo', label: '벽 틈의 동생 사진', location: 'passage', reward: { type: 'item', id: 'sibling-photo' } },
  { id: 'booth-memory', label: '마이크 아래의 기억 테이프', location: 'booth', reward: { type: 'item', id: 'memory-tape' } },
  { id: 'roof-key', label: '안테나 사다리의 열쇠', location: 'roof', reward: { type: 'item', id: 'roof-key' } },
  { id: 'lobby-storm-note', label: '로비의 경보 메모', location: 'lobby', reward: { type: 'clue', id: 'storm-note' } },
  { id: 'studio-sibling-call', label: '녹음실의 호출 기록', location: 'studio', reward: { type: 'clue', id: 'sibling-call' } },
  { id: 'booth-false-script', label: '방송실의 방송 기록', location: 'booth', reward: { type: 'clue', id: 'false-script' } },
];

const puzzle = (): PuzzleState => ({ status: 'locked', attempts: 0, input: [], feedback: '' });
export function initialState(): GameState { return { version: SAVE_VERSION, location: 'entrance', inventory: [], found: new Set(), clues: new Set(), unlocked: false, archiveLit: false, shadowSeen: false, tension: 0, failedActions: 0, message: '폭풍이 치는 산속 방송국에서 자정 전에 동생을 찾아야 한다.', editorialScore: 0, ink: 2, correctionFluid: 1, contradictions: 0, clueDecisions: {}, frequency: puzzle(), breaker: puzzle(), recordings: puzzle(), flashlight: puzzle(), finalStatement: puzzle(), rememberedSibling: false }; }
export function serialize(state: GameState): string { return JSON.stringify({ ...state, found: [...state.found], clues: [...state.clues] }); }
const ITEM_IDS = new Set<ItemId>(Object.keys(ITEM_INFO) as ItemId[]);
const CLUE_IDS = new Set(CLUES.map((clue) => clue.id));
const FOUND_IDS = new Set(HOTSPOTS.map((hotspot) => `hotspot:${hotspot.id}`));
const LOCATIONS_SET = new Set<Location>(LOCATION_ORDER);
const PUZZLE_STATUSES = new Set<PuzzleStatus>(['locked', 'active', 'solved']);
function isStringArray(value: unknown): value is string[] { return Array.isArray(value) && value.every((entry) => typeof entry === 'string'); }
function isPuzzleState(value: unknown): value is PuzzleState {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<PuzzleState>;
  return typeof candidate.status === 'string' && PUZZLE_STATUSES.has(candidate.status as PuzzleStatus)
    && Number.isInteger(candidate.attempts) && Number(candidate.attempts) >= 0
    && isStringArray(candidate.input) && typeof candidate.feedback === 'string';
}
export function deserialize(raw: string): GameState {
  const value: unknown = JSON.parse(raw);
  if (!value || typeof value !== 'object') return initialState();
  const candidate = value as Partial<GameState> & { found?: unknown; clues?: unknown };
  const puzzles = [candidate.frequency, candidate.breaker, candidate.recordings, candidate.flashlight, candidate.finalStatement];
  const validEnding = candidate.ending === undefined || candidate.ending === 'restore' || candidate.ending === 'erase' || candidate.ending === 'human';
  const validDecisions = candidate.clueDecisions && typeof candidate.clueDecisions === 'object'
    && Object.entries(candidate.clueDecisions).every(([id, action]) => CLUE_IDS.has(id) && (action === 'record' || action === 'delete'));
  const validPending = candidate.pendingClue === undefined || (typeof candidate.pendingClue === 'string' && CLUE_IDS.has(candidate.pendingClue));
  const booleanFields = [candidate.unlocked, candidate.archiveLit, candidate.shadowSeen, candidate.rememberedSibling];
  const numberFields = [candidate.tension, candidate.failedActions, candidate.editorialScore, candidate.ink, candidate.correctionFluid, candidate.contradictions];
  if (candidate.version !== SAVE_VERSION || typeof candidate.location !== 'string' || !LOCATIONS_SET.has(candidate.location as Location)
    || !Array.isArray(candidate.inventory) || !candidate.inventory.every((id) => typeof id === 'string' && ITEM_IDS.has(id as ItemId))
    || !isStringArray(candidate.found) || !candidate.found.every((id) => FOUND_IDS.has(id))
    || !isStringArray(candidate.clues) || !candidate.clues.every((id) => CLUE_IDS.has(id)) || !puzzles.every(isPuzzleState)
    || !validEnding || !validDecisions || !validPending || !booleanFields.every((field) => typeof field === 'boolean')
    || !numberFields.every((field) => typeof field === 'number' && Number.isFinite(field)) || typeof candidate.message !== 'string') return initialState();
  const base = initialState();
  return { ...base, ...candidate, location: candidate.location as Location, ending: candidate.ending,
    found: new Set(candidate.found), clues: new Set(candidate.clues), inventory: [...new Set(candidate.inventory as ItemId[])],
    clueDecisions: candidate.clueDecisions as Record<string, EditorialAction>, frequency: candidate.frequency!, breaker: candidate.breaker!,
    recordings: candidate.recordings!, flashlight: candidate.flashlight!, finalStatement: candidate.finalStatement! };
}
function patch(state: GameState, change: Partial<GameState>): GameState { return { ...state, ...change }; }
export function locationAvailable(state: GameState, location: Location): boolean { const index = LOCATION_ORDER.indexOf(location); if (index < 0) return false; if (location === 'archive') return state.breaker.status === 'solved'; if (location === 'studio') return state.recordings.status === 'solved'; if (location === 'passage') return state.flashlight.status === 'solved'; if (location === 'booth') return state.flashlight.status === 'solved'; if (location === 'roof') return state.finalStatement.status === 'solved'; return index <= 4 || (index === 5 && state.breaker.status === 'solved'); }
export function availableLocations(state: GameState): Location[] { return LOCATION_ORDER.filter((location) => locationAvailable(state, location)); }
export function move(state: GameState, direction: -1 | 1): GameState { const available = availableLocations(state); const index = Math.max(0, available.indexOf(state.location)); const location = available[(index + direction + available.length) % available.length] ?? available[0]; return patch(state, { location, tension: Math.min(100, state.tension + 2), message: LOCATIONS[location].subtitle }); }
export function fail(state: GameState, message: string): GameState { return patch(state, { failedActions: state.failedActions + 1, tension: Math.min(100, state.tension + 2), message }); }
export function visibleHotspots(state: GameState): Hotspot[] { return HOTSPOTS.filter((h) => h.location === state.location && !state.found.has(`hotspot:${h.id}`) && !(h.reward.type === 'clue' && state.clues.has(h.reward.id))); }
export type EditorialActionState = { stage: 'normal' | 'warning' | 'cost' | 'deleted'; disabled: boolean; opposite: boolean; costsInk: boolean; canRestore: boolean };
export function editorialActionState(state: GameState, action: EditorialAction): EditorialActionState { const opposite = (state.editorialScore > 0 && action === 'delete') || (state.editorialScore < 0 && action === 'record'); const magnitude = Math.abs(state.editorialScore); const stage = !opposite || magnitude < 2 ? 'normal' : magnitude === 2 ? 'warning' : magnitude <= 4 ? 'cost' : 'deleted'; return { stage, disabled: stage === 'deleted' || (stage === 'cost' && state.ink < 1), opposite, costsInk: stage === 'cost', canRestore: stage === 'deleted' && state.correctionFluid > 0 }; }
export function cancelPendingClue(state: GameState): GameState { return state.pendingClue ? patch(state, { pendingClue: undefined }) : state; }
export function inspectHotspot(state: GameState, hotspotId: string): GameState { const hotspot = visibleHotspots(state).find((h) => h.id === hotspotId); if (!hotspot) return fail(state, '이미 확인했거나 지금은 확인할 수 없다.'); if (hotspot.reward.type === 'item') return patch(state, { found: new Set(state.found).add(`hotspot:${hotspot.id}`), inventory: [...state.inventory, hotspot.reward.id], message: `도구를 찾았다: ${ITEM_INFO[hotspot.reward.id].name}.` }); const clue = CLUES.find((c) => c.id === hotspot.reward.id)!; return patch(state, { pendingClue: clue.id, message: `${clue.title}: 남길지 지울지 선택하자.` }); }
export function resolveEditorialChoice(state: GameState, action: EditorialAction, forceRestore = false): GameState { const id = state.pendingClue; if (!id) return fail(state, '선택할 단서가 없다.'); const status = editorialActionState(state, action); if (forceRestore ? !status.canRestore : status.disabled) return fail(state, '지금은 그 선택을 할 수 없다.'); const spot = HOTSPOTS.find((h) => h.reward.type === 'clue' && h.reward.id === id)!; return patch(state, { found: new Set(state.found).add(`hotspot:${spot.id}`), clues: new Set(state.clues).add(id), pendingClue: undefined, clueDecisions: { ...state.clueDecisions, [id]: action }, editorialScore: state.editorialScore + (action === 'record' ? 1 : -1), ink: status.costsInk && !forceRestore ? state.ink - 1 : state.ink, contradictions: state.contradictions + (status.opposite ? 1 : 0), message: action === 'record' ? '단서를 남겼다.' : '단서를 지웠지만 흔적은 남았다.' }); }
export function inspect(state: GameState, item: ItemId): GameState { return patch(state, { message: ITEM_INFO[item]?.description ?? state.message }); }

const WRONG_FEEDBACK: Record<'frequency' | 'breaker' | 'recordings' | 'flashlight', (matches: number, total: number) => string> = {
  frequency: (matches, total) => `${total}개 중 ${matches}개의 파형만 안정됐다. 카드의 자국과 소리를 다시 짝지어 보자.`,
  breaker: (matches, total) => `${total}개 중 ${matches}개의 연결만 맞게 울렸다. 앞뒤 조건을 다시 확인하자.`,
  recordings: (matches, total) => `${total}개 중 ${matches}개의 테이프만 제시간에 놓였다. 녹음 속 시각을 비교하자.`,
  flashlight: (matches, total) => `${total}개 중 ${matches}개의 색만 벽에 남았다. 처음과 마지막 색부터 정하자.`,
};
function attempt(state: GameState, key: 'frequency' | 'breaker' | 'recordings' | 'flashlight', input: string[], answer: string[], ready: boolean, success: string): GameState {
  const current = state[key];
  if (!ready) return fail(state, '필요한 단서와 도구를 먼저 찾아야 한다.');
  if (current.status === 'solved') return state;
  const matches = input.filter((value, index) => value.toLowerCase() === answer[index]?.toLowerCase()).length;
  const correct = input.length === answer.length && matches === answer.length;
  const next: PuzzleState = { status: correct ? 'solved' : 'active', attempts: current.attempts + 1, input, feedback: correct ? success : WRONG_FEEDBACK[key](matches, answer.length) };
  return patch(state, { [key]: next, message: next.feedback, failedActions: state.failedActions + (correct ? 0 : 1),
    unlocked: key === 'breaker' && correct ? true : state.unlocked, archiveLit: key === 'frequency' && correct ? true : state.archiveLit,
    shadowSeen: key === 'flashlight' && correct ? true : state.shadowSeen, tension: Math.min(100, state.tension + (correct ? 0 : 4)) });
}
export function attemptFrequency(state: GameState, sequence: string[]): GameState { return attempt(state, 'frequency', sequence, ['7', '3', '9', '1'], state.inventory.includes('handheld-radio') && state.inventory.includes('frequency-card'), '주파수가 맞았다. 방송 기록 보관실의 전원이 살아났다.'); }
export function connectBreaker(state: GameState, order: string[]): GameState { return attempt(state, 'breaker', order, ['red', 'blue', 'yellow', 'black'], state.inventory.includes('insulated-gloves') && state.inventory.includes('breaker-key') && state.frequency.status === 'solved', '차단기가 순서대로 연결됐다. 안쪽 문이 열렸다.'); }
export function arrangeRecordings(state: GameState, order: string[]): GameState { return attempt(state, 'recordings', order, ['storm', 'arrival', 'warning', 'erasure'], state.inventory.includes('recording-reel') && state.inventory.includes('station-log') && state.breaker.status === 'solved', '시간순 녹음이 재생됐다. 스튜디오에서 동생의 목소리가 들린다.'); }
export function selectFlashlightFilter(state: GameState, colors: string[]): GameState { return attempt(state, 'flashlight', colors, ['blue', 'amber', 'red'], state.inventory.includes('flashlight') && state.inventory.includes('color-filters') && state.recordings.status === 'solved', '색의 순서가 벽에 숨은 통로를 드러냈다.'); }
export const solveFrequency = attemptFrequency;
export const solveBreaker = connectBreaker;
export const solveRecordings = arrangeRecordings;
export const solveFlashlight = selectFlashlightFilter;
export const FINAL_STATEMENTS = ['하윤은 밤 11시 40분에 혼자 방송국을 떠났다.', '기억 삭제 방송은 자정에 가장 강해진다.', '숨은 통로는 스튜디오 뒤에서 옥상 계단으로 이어진다.'];
export function chooseFinalStatement(state: GameState, statementIndex: number): GameState {
  if (state.location !== 'booth' && state.location !== 'roof') return fail(state, '심야 부스에서 방송 기록을 확인해야 한다.');
  if (state.finalStatement.status === 'solved') return state;
  const evidenceReady = state.flashlight.status === 'solved' && state.inventory.includes('memory-tape') && state.inventory.includes('sibling-photo') && state.clues.has('false-script');
  if (!evidenceReady) return fail(state, '동생 사진, 기억 테이프, 수상한 방송 기록을 모두 대조해야 한다.');
  const correct = statementIndex === 0;
  const next: PuzzleState = { status: correct ? 'solved' : 'active', attempts: state.finalStatement.attempts + 1, input: [String(statementIndex)], feedback: correct ? '사진의 시각과 방송 기록이 충돌한다. 거짓 방송을 송신기에서 뺐다.' : '사진과 테이프가 그 문장을 뒷받침한다. 다른 문장을 대조하자.' };
  return patch(state, { finalStatement: next, message: next.feedback, rememberedSibling: correct,
    failedActions: state.failedActions + (correct ? 0 : 1), tension: Math.min(100, state.tension + (correct ? 0 : 5)) });
}
export function endingAvailability(state: GameState): EndingAvailability {
  const actions = CLUES.map((clue) => state.clueDecisions[clue.id]).filter((action): action is EditorialAction => action === 'record' || action === 'delete');
  const recorded = actions.filter((action) => action === 'record').length;
  const deleted = actions.filter((action) => action === 'delete').length;
  return { restore: recorded >= 2, erase: deleted >= 2, human: recorded >= 1 && deleted >= 1 && state.contradictions >= 1, resolved: actions.length };
}
export function chooseEnding(state: GameState, ending: Ending): GameState {
  if (state.location !== 'roof' || state.finalStatement.status !== 'solved' || !state.inventory.includes('roof-key')) return fail(state, '거짓 방송을 밝혀내고 지붕 열쇠를 찾아야 한다.');
  if (!endingAvailability(state)[ending]) return fail(state, '지금까지 기억을 다룬 방식으로는 그 결말을 선택할 수 없다.');
  const message = ending === 'restore' ? '믿고 남긴 기억으로 동생의 이름을 되찾고 방송을 끊었다.' : ending === 'erase' ? '의심한 기록을 모두 지웠지만, 동생을 찾은 기억도 함께 사라졌다.' : '믿음과 의심을 모두 받아들이고 동생과 기억을 맞춰 보았다.';
  return patch(state, { ending, message, tension: ending === 'erase' ? 100 : ending === 'restore' ? 0 : 50 });
}
