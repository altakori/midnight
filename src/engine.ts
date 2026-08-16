export const SAVE_VERSION = 10;

export type Location = 'entrance' | 'lobby' | 'hall' | 'transmitter' | 'power' | 'archive' | 'studio' | 'passage' | 'booth' | 'roof';
export type ItemId = 'handheld-radio' | 'frequency-card' | 'insulated-gloves' | 'breaker-key' | 'recording-reel' | 'station-log' | 'flashlight' | 'color-filters' | 'sibling-photo' | 'roof-key' | 'memory-tape';
export type Ending = 'restore' | 'erase' | 'human' | 'illusion';
export type EditorialAction = 'record' | 'delete';
export type PuzzleStatus = 'locked' | 'active' | 'solved';
export type HotspotReward = { type: 'item'; id: ItemId } | { type: 'clue'; id: string };
export interface Hotspot { id: string; label: string; location: Location; reward: HotspotReward; requiresArchive?: boolean }
export interface Clue { id: string; title: string; text: string; location: Location }
export interface PuzzleState { status: PuzzleStatus; attempts: number; input: string[]; feedback: string }
export interface GameState {
  version: number; location: Location; inventory: ItemId[]; found: Set<string>; clues: Set<string>;
  tension: number; failedActions: number; message: string; ending?: Ending;
  editorialScore: number; ink: number; correctionFluid: number; contradictions: number;
  clueDecisions: Record<string, EditorialAction>; pendingClue?: string;
  frequency: PuzzleState; breaker: PuzzleState; recordings: PuzzleState; flashlight: PuzzleState; finalStatement: PuzzleState;
}
export type EndingAvailability = Record<Ending, boolean> & { resolved: number };

export const LOCATION_ORDER: Location[] = ['entrance', 'lobby', 'hall', 'transmitter', 'power', 'archive', 'studio', 'passage', 'booth', 'roof'];
export const LOCATIONS: Record<string, { title: string; subtitle: string; act: 1 | 2 | 3; art: string }> = {
  entrance: { title: '폭풍 속 산속 방송국 입구', subtitle: '번개가 철문을 때리고, 안에서 동생과 똑같은 목소리가 들린다.', act: 1, art: 'entrance' },
  lobby: { title: '젖은 로비', subtitle: '벽시계는 자정 30분 전에 멈췄다.', act: 1, art: 'lobby' },
  hall: { title: '긴 복도', subtitle: '낡은 스피커가 당신의 최근 기억부터 지운다.', act: 1, art: 'hall' },
  transmitter: { title: '송신실', subtitle: '폭풍 잡음 속에서 주파수 순서가 반복된다.', act: 1, art: 'transmitter' },
  power: { title: '전력실', subtitle: '차단기에 누군가 급히 남긴 연결 순서가 있다.', act: 1, art: 'power' },
  archive: { title: '방송 기록 보관실', subtitle: '날짜가 없는 테이프들이 선반에 쌓여 있다.', act: 2, art: 'archive' },
  studio: { title: '녹음실', subtitle: '마지막 녹음에서 동생과 똑같은 목소리가 들린다.', act: 2, art: 'studio' },
  passage: { title: '숨은 통로', subtitle: '색 필터를 비춘 벽에 숨은 길이 나타난다.', act: 2, art: 'passage' },
  booth: { title: '심야 방송실', subtitle: '마이크에서 기억을 지우는 거짓 방송이 반복된다.', act: 3, art: 'booth' },
  roof: { title: '안테나 지붕', subtitle: '자정이 다가온다. 목소리를 따라갈지, 방송을 지울지 결정해야 한다.', act: 3, art: 'roof' },
};

export const ITEM_INFO: Record<ItemId, { name: string; icon: string; description: string; detail: string; pickupReaction: string }> = {
  'handheld-radio': { name: '휴대용 라디오', icon: '◉', description: '부식된 건전지로도 88.0 MHz에서만 하윤의 목소리를 내는 낡은 수신기.', detail: '다이얼 유리 안쪽에 88.0을 여러 번 긁어 표시한 흔적이 있다. 건전지는 오래전에 부식됐는데도 번개가 칠 때마다 전원이 잠깐 들어오며, 잡음 속 목소리는 내 이름과 “옥상”이라는 단어를 정확히 발음한다. 수신기 뒷면의 소유자 칸은 물에 번져 비어 있다.', pickupReaction: '라디오를 드는 순간, 입구 스피커가 한 박자 늦게 같은 잡음을 따라 한다.' },
  'frequency-card': { name: '주파수 카드', icon: '▤', description: '폭풍 속에서 잡히는 주파수 범위와 88.0을 강조한 젖은 정비 카드.', detail: '80–92 MHz 구간의 신호 세기가 연필로 기록돼 있고 88.0 옆에만 “대답함”이라고 적혀 있다. 글씨는 하윤의 메모라고 생각했지만, 오래 볼수록 내 필체와 같은 꺾임이 보인다. 카드 모서리의 날짜는 오늘 밤보다 몇 년 앞서 있다.', pickupReaction: '카드를 떼자 멈춘 로비 시계의 초침이 딱 한 칸 뒤로 움직인다.' },
  'insulated-gloves': { name: '절연 장갑', icon: '♧', description: '빗물에 젖은 전선을 만질 수 있는 방송국 정비용 고무장갑.', detail: '겉은 먼지투성이지만 안쪽은 방금 벗어 둔 것처럼 따뜻하고 마른 상태다. 손가락 길이와 손바닥의 눌린 자국은 하윤보다 내 손에 정확히 맞는다. 오른쪽 장갑에는 비상 전력 세 칸을 뜻하는 작은 점 세 개가 찍혀 있다.', pickupReaction: '장갑이 있던 경비함 안쪽에 손가락으로 긁은 세 줄이 남아 있다.' },
  'breaker-key': { name: '차단기 열쇠', icon: '⚿', description: '전력실 비상 차단기 덮개와 스튜디오 보조 전원을 여는 황동 열쇠.', detail: '황동 손잡이에 “STUDIO MASTER”의 일부만 남아 있다. 송신기 아래에 테이프로 붙어 있었고, 테이프 겉면에는 “목소리보다 전원을 먼저 믿어”라는 문장이 눌러 쓰여 있다. 지문은 빗물에 씻겼지만 최근 사용한 긁힘이 선명하다.', pickupReaction: '열쇠를 떼자 송신기 출력계가 잠깐 옥상 방향으로 끝까지 기운다.' },
  'recording-reel': { name: '녹음 릴', icon: '◎', description: '23:30부터 자정까지의 사건이 네 조각으로 잘린 아날로그 녹음 릴.', detail: '폭풍 경보, 출입문 개방, 하윤의 경고, 기억 삭제 방송이 서로 다른 테이프 조각에 남아 있다. 하윤의 문장 사이에는 숨소리나 방의 잔향이 없고, 단어가 이어지는 지점마다 아주 짧은 전기 잡음이 낀다. 누군가 목소리를 녹음한 것이 아니라 잘라 붙였을 가능성이 있다.', pickupReaction: '릴을 들어 올리자 전원이 꺼진 재생기가 혼자 한 바퀴 돌아간다.' },
  'station-log': { name: '방송국 기록 일지', icon: '▥', description: '전력 사용량과 출입 시각, 자정 자동 방송의 이상 기록을 적은 관리 일지.', detail: '23:42에 외부 문이 한 번 열렸지만 출입자는 내 카드 번호 하나뿐이다. 하윤이라는 이름이나 두 번째 사람의 출입 기록은 어느 페이지에도 없다. 대신 수년 전부터 폭풍이 오는 밤마다 “가족 음성 생성—응답 성공”이라는 같은 문장이 반복돼 있다.', pickupReaction: '일지를 펼치자 선반 인터폰이 내 출입 카드 번호를 낮게 읽는다.' },
  flashlight: { name: '색 필터 손전등', icon: '✦', description: '세 색의 광량을 조절해 평범한 벽 아래 숨은 감광 문양을 드러내는 손전등.', detail: '렌즈에는 청록 2, 호박 1, 빨강 3의 눈금이 새겨져 있다. 세 빛이 겹치면 벽의 페인트가 투명해지고 오래된 통로 윤곽이 드러난다. 손잡이에는 급히 쥔 흔적이 하나뿐이며, 두 사람이 번갈아 사용한 흔적은 없다.', pickupReaction: '손전등을 빼내자 방음벽의 빛이 내 그림자만 피해 흔들린다.' },
  'color-filters': { name: '색 필터 세트', icon: '◈', description: '청록·호박·빨강 필터와 각 광량을 기록한 낡은 방송 조명 상자.', detail: '필터 가장자리의 숫자는 스튜디오 벽에 남은 색 자국과 정확히 대응한다. 상자 안쪽에는 “보이는 사람을 믿지 말고 그림자를 세어라”라는 정비 문구가 있다. 지붕 방향을 가리키는 흰 선은 누군가 최근에 덧그린 것처럼 아직 가루가 묻어난다.', pickupReaction: '상자를 여는 순간 스튜디오의 붉은 녹음등이 세 번 깜빡인다.' },
  'sibling-photo': { name: '하윤의 즉석사진', icon: '▣', description: '23:58 시각띠 아래 폭우 속 하윤의 얼굴과 뒤집힌 한 장이 겹쳐 있는, 지나치게 선명한 즉석사진.', detail: '아래 인화 시각은 하윤이 떠났다는 방송보다 18분 늦은 23:58이다. 젖은 머리의 하윤은 기억 속 모습보다 아름답고 생생하게 카메라를 바라보지만, 사진을 기울이면 얼굴의 물방울과 배경이 조금씩 달라진다. 뒷면의 “하윤과 바다에서”라는 글씨만 어떤 각도에서도 변하지 않으며, 그 문장은 하윤의 필체가 아니라 내가 오래전 일기장에 쓰던 글씨와 닮았다.', pickupReaction: '사진을 빼내자 벽 틈의 목소리가 내 숨을 반 박자 늦게 따라 한다.' },
  'roof-key': { name: '지붕 열쇠', icon: '⚿', description: '안테나 사다리 옆 철문을 여는 마지막 열쇠. 비를 맞았는데도 미지근하다.', detail: '열쇠 머리에는 7번 안테나 표식과 “한 명만 올라갈 것”이라는 경고가 새겨져 있다. 난간 쪽 자물쇠에는 맞지만, 관리 일지에는 이 열쇠가 오래전에 분실됐다고 적혀 있다. 손에 쥐면 88.0 MHz의 잡음이 아주 가까이서 들리는 듯하다.', pickupReaction: '열쇠를 쥐자 잠긴 옥상문 너머에서 누군가 한 번 노크한다.' },
  'memory-tape': { name: '기억 테이프', icon: '◌', description: '하윤의 구조 요청과 거짓 방송을 같은 파형 위에서 비교할 수 있는 원본 테이프.', detail: '“오빠”, “옥상”, “믿지 마”라는 단어의 파형이 내가 휴대전화에 남긴 오래된 가족 통화와 완전히 겹친다. 단어 사이에는 화자의 숨이나 주변 소리가 없고 송신기 발진음만 이어진다. 방송은 내 기억에서 가장 그리운 목소리를 골라 문장을 만든 것인지도 모른다.', pickupReaction: '테이프를 뽑았는데도 마이크에서 방금 낸 내 숨소리가 계속 재생된다.' },
};

export const CLUES: Clue[] = [
  { id: 'storm-note', title: '폭풍 경보 메모', text: '자정 방송은 최근 기억을 지운 뒤, 청취자가 가장 그리워하는 목소리로 빈자리를 채운다.', location: 'lobby' },
  { id: 'sibling-call', title: '하윤의 호출', text: '“거짓말을 고르면 문이 닫혀.” 숨소리도 방의 울림도 없이 단어만 또렷하다.', location: 'studio' },
  { id: 'false-script', title: '수상한 방송 내용', text: '방송에서는 하윤이 이미 산을 떠났다고 하지만, 출입 기록에는 애초에 하윤이 들어온 흔적도 없다.', location: 'booth' },
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
export function initialState(): GameState { return { version: SAVE_VERSION, location: 'entrance', inventory: [], found: new Set(), clues: new Set(), tension: 12, failedActions: 0, message: '자정까지 30분. 하윤이라고 말하는 옥상 구조 신호를 되살려야 한다.', editorialScore: 0, ink: 2, correctionFluid: 1, contradictions: 0, clueDecisions: {}, frequency: puzzle(), breaker: puzzle(), recordings: puzzle(), flashlight: puzzle(), finalStatement: puzzle() }; }
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
    && Number.isInteger(candidate.attempts) && Number(candidate.attempts) >= 0 && Number(candidate.attempts) <= 10000
    && isStringArray(candidate.input) && typeof candidate.feedback === 'string';
}
export function deserialize(raw: string): GameState {
  const value: unknown = JSON.parse(raw);
  if (!value || typeof value !== 'object') return initialState();
  const candidate = value as Partial<GameState> & { found?: unknown; clues?: unknown };
  const puzzles = [candidate.frequency, candidate.breaker, candidate.recordings, candidate.flashlight, candidate.finalStatement];
  const validEnding = candidate.ending === undefined || candidate.ending === 'restore' || candidate.ending === 'erase' || candidate.ending === 'human' || candidate.ending === 'illusion';
  const validDecisions = candidate.clueDecisions && typeof candidate.clueDecisions === 'object'
    && Object.entries(candidate.clueDecisions).every(([id, action]) => CLUE_IDS.has(id) && (action === 'record' || action === 'delete'));
  const validPending = candidate.pendingClue === undefined || (typeof candidate.pendingClue === 'string' && CLUE_IDS.has(candidate.pendingClue));

  const validNumbers = typeof candidate.tension === 'number' && Number.isFinite(candidate.tension) && candidate.tension >= 0 && candidate.tension <= 100
    && Number.isInteger(candidate.failedActions) && Number(candidate.failedActions) >= 0 && Number(candidate.failedActions) <= 10000
    && Number.isInteger(candidate.editorialScore) && Number(candidate.editorialScore) >= -3 && Number(candidate.editorialScore) <= 3
    && Number.isInteger(candidate.ink) && Number(candidate.ink) >= 0 && Number(candidate.ink) <= 2
    && Number.isInteger(candidate.correctionFluid) && Number(candidate.correctionFluid) >= 0 && Number(candidate.correctionFluid) <= 2
    && Number.isInteger(candidate.contradictions) && Number(candidate.contradictions) >= 0 && Number(candidate.contradictions) <= 3;
  if (candidate.version !== SAVE_VERSION || typeof candidate.location !== 'string' || !LOCATIONS_SET.has(candidate.location as Location)
    || !Array.isArray(candidate.inventory) || !candidate.inventory.every((id) => typeof id === 'string' && ITEM_IDS.has(id as ItemId))
    || !isStringArray(candidate.found) || !candidate.found.every((id) => FOUND_IDS.has(id))
    || !isStringArray(candidate.clues) || !candidate.clues.every((id) => CLUE_IDS.has(id)) || !puzzles.every(isPuzzleState)
    || !validEnding || !validDecisions || !validPending
    || !validNumbers || typeof candidate.message !== 'string') return initialState();
  const base = initialState();
  return { ...base, ...candidate, location: candidate.location as Location, ending: candidate.ending,
    found: new Set(candidate.found), clues: new Set(candidate.clues), inventory: [...new Set(candidate.inventory as ItemId[])],
    clueDecisions: candidate.clueDecisions as Record<string, EditorialAction>, frequency: candidate.frequency!, breaker: candidate.breaker!,
    recordings: candidate.recordings!, flashlight: candidate.flashlight!, finalStatement: candidate.finalStatement! };
}
function patch(state: GameState, change: Partial<GameState>): GameState { return { ...state, ...change }; }
export function locationAvailable(state: GameState, location: Location): boolean { const index = LOCATION_ORDER.indexOf(location); if (index < 0) return false; if (location === 'archive') return state.breaker.status === 'solved'; if (location === 'studio') return state.recordings.status === 'solved'; if (location === 'passage') return state.flashlight.status === 'solved'; if (location === 'booth') return state.flashlight.status === 'solved'; if (location === 'roof') return state.finalStatement.status === 'solved'; return index <= 4 || (index === 5 && state.breaker.status === 'solved'); }
export function availableLocations(state: GameState): Location[] { return LOCATION_ORDER.filter((location) => locationAvailable(state, location)); }
export function move(state: GameState, direction: -1 | 1): GameState {
  const available = availableLocations(state);
  const index = available.indexOf(state.location);
  const location = available[index + direction];
  if (!location) return state;
  return patch(state, { location, tension: Math.min(100, state.tension + 2), message: LOCATIONS[location].subtitle });
}
export function fail(state: GameState, message: string): GameState { return patch(state, { failedActions: state.failedActions + 1, tension: Math.min(100, state.tension + 2), message }); }
export function visibleHotspots(state: GameState): Hotspot[] { return HOTSPOTS.filter((h) => h.location === state.location && !state.found.has(`hotspot:${h.id}`) && !(h.reward.type === 'clue' && state.clues.has(h.reward.id))); }
export type EditorialActionState = { stage: 'normal' | 'warning' | 'cost' | 'deleted'; disabled: boolean; opposite: boolean; costsInk: boolean; canRestore: boolean };
export function editorialActionState(state: GameState, action: EditorialAction): EditorialActionState { const opposite = (state.editorialScore > 0 && action === 'delete') || (state.editorialScore < 0 && action === 'record'); const magnitude = Math.abs(state.editorialScore); const stage = !opposite || magnitude < 2 ? 'normal' : magnitude === 2 ? 'warning' : magnitude <= 4 ? 'cost' : 'deleted'; return { stage, disabled: stage === 'deleted' || (stage === 'cost' && state.ink < 1), opposite, costsInk: stage === 'cost', canRestore: stage === 'deleted' && state.correctionFluid > 0 }; }
export function cancelPendingClue(state: GameState): GameState { return state.pendingClue ? patch(state, { pendingClue: undefined }) : state; }
export function inspectHotspot(state: GameState, hotspotId: string): GameState { const hotspot = visibleHotspots(state).find((h) => h.id === hotspotId); if (!hotspot) return fail(state, '이미 확인했거나 지금은 확인할 수 없다.'); if (hotspot.reward.type === 'item') { const info = ITEM_INFO[hotspot.reward.id]; return patch(state, { found: new Set(state.found).add(`hotspot:${hotspot.id}`), inventory: [...state.inventory, hotspot.reward.id], message: `도구를 찾았다: ${info.name}. ${info.pickupReaction}` }); } const clue = CLUES.find((c) => c.id === hotspot.reward.id)!; return patch(state, { pendingClue: clue.id, message: `${clue.title}: 남길지 지울지 선택하자.` }); }
export function resolveEditorialChoice(state: GameState, action: EditorialAction, forceRestore = false): GameState { const id = state.pendingClue; if (!id) return fail(state, '선택할 단서가 없다.'); const status = editorialActionState(state, action); if (forceRestore ? !status.canRestore : status.disabled) return fail(state, '지금은 그 선택을 할 수 없다.'); const spot = HOTSPOTS.find((h) => h.reward.type === 'clue' && h.reward.id === id)!; const trusted = action === 'record'; return patch(state, { found: new Set(state.found).add(`hotspot:${spot.id}`), clues: new Set(state.clues).add(id), pendingClue: undefined, clueDecisions: { ...state.clueDecisions, [id]: action }, editorialScore: state.editorialScore + (trusted ? 1 : -1), ink: status.costsInk && !forceRestore ? state.ink - 1 : state.ink, correctionFluid: trusted ? state.correctionFluid : Math.min(2, state.correctionFluid + 1), tension: trusted ? Math.max(0, state.tension - 9) : Math.min(100, state.tension + 7), contradictions: state.contradictions + (status.opposite ? 1 : 0), message: trusted ? '하윤의 목소리가 또렷해졌다. “맞아. 그 기억은 진짜야.” 신호 불안 -9.' : '기억을 의심하자 숨은 편집 흔적이 드러났다. 수정액 +1, 신호 불안 +7.' }); }
export function inspect(state: GameState, item: ItemId): GameState { return patch(state, { message: ITEM_INFO[item]?.description ?? state.message }); }

const WRONG_FEEDBACK: Record<'frequency' | 'breaker' | 'recordings' | 'flashlight', (matches: number, total: number) => string> = {
  frequency: () => '아직 잡음뿐이다. 88.0 MHz에 가까워질수록 신호 막대가 켜진다.',
  breaker: (matches, total) => `${total}개 중 ${matches}개가 구조에 필요한 회로다. 전력은 딱 3칸뿐이다.`,
  recordings: (matches, total) => `${total}개 중 ${matches}개의 테이프만 제시간에 놓였다. 녹음 속 시각을 비교하자.`,
  flashlight: (matches, total) => `${total}개 중 ${matches}개의 광량이 맞았다. 청록 2 · 호박 1 · 빨강 3을 확인하자.`,
};
function attempt(state: GameState, key: 'frequency' | 'breaker' | 'recordings' | 'flashlight', input: string[], answer: string[], ready: boolean, success: string): GameState {
  const current = state[key];
  if (!ready) return fail(state, '필요한 단서와 도구를 먼저 찾아야 한다.');
  if (current.status === 'solved') return state;
  const matches = input.filter((value, index) => value.toLowerCase() === answer[index]?.toLowerCase()).length;
  const correct = input.length === answer.length && matches === answer.length;
  const next: PuzzleState = { status: correct ? 'solved' : 'active', attempts: current.attempts + 1, input, feedback: correct ? success : WRONG_FEEDBACK[key](matches, answer.length) };
  return patch(state, { [key]: next, message: next.feedback, failedActions: state.failedActions + (correct ? 0 : 1), tension: Math.min(100, state.tension + (correct ? 0 : 4)) });
}
export function attemptFrequency(state: GameState, sequence: string[]): GameState { return attempt(state, 'frequency', sequence, ['88'], state.inventory.includes('handheld-radio') && state.inventory.includes('frequency-card'), '88.0 MHz 고정. “오빠, 들려? 난 옥상에 있어!” 하윤과 똑같은 구조 신호가 잡혔다.'); }
export function connectBreaker(state: GameState, activeCircuits: string[]): GameState { const normalized = [...activeCircuits].sort(); return attempt(state, 'breaker', normalized, ['antenna', 'emergency', 'studio'], state.inventory.includes('insulated-gloves') && state.inventory.includes('breaker-key') && state.frequency.status === 'solved', '비상 전력이 터졌다. 붉은 복도등이 옥상까지 차례로 켜진다.'); }
export function arrangeRecordings(state: GameState, order: string[]): GameState { return attempt(state, 'recordings', order, ['storm', 'arrival', 'warning', 'erasure'], state.inventory.includes('recording-reel') && state.inventory.includes('station-log') && state.breaker.status === 'solved', '시간순 녹음이 재생됐다. 스튜디오에서 동생과 똑같은 목소리가 들린다.'); }
export function selectFlashlightFilter(state: GameState, levels: string[]): GameState { return attempt(state, 'flashlight', levels, ['2', '1', '3'], state.inventory.includes('flashlight') && state.inventory.includes('color-filters') && state.recordings.status === 'solved', '세 빛이 겹치자 벽이 투명해지고 옥상으로 가는 숨은 통로가 열린다.'); }
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
  return patch(state, { finalStatement: next, message: next.feedback, failedActions: state.failedActions + (correct ? 0 : 1), tension: Math.min(100, state.tension + (correct ? 0 : 5)) });
}
export function endingAvailability(state: GameState): EndingAvailability {
  const actions = CLUES.map((clue) => state.clueDecisions[clue.id]).filter((action): action is EditorialAction => action === 'record' || action === 'delete');
  const recorded = actions.filter((action) => action === 'record').length;
  const deleted = actions.filter((action) => action === 'delete').length;
  return { restore: recorded >= 2, erase: deleted >= 2, human: recorded >= 1 && deleted >= 1 && state.contradictions >= 1, illusion: deleted === CLUES.length, resolved: actions.length };
}
export function chooseEnding(state: GameState, ending: Ending): GameState {
  if (state.location !== 'roof' || state.finalStatement.status !== 'solved' || !state.inventory.includes('roof-key')) return fail(state, '거짓 방송을 밝혀내고 지붕 열쇠를 찾아야 한다.');
  if (!endingAvailability(state)[ending]) return fail(state, '지금까지 기억을 다룬 방식으로는 그 결말을 선택할 수 없다.');
  const message = ending === 'restore' ? '믿고 남긴 기억으로 동생의 이름을 되찾고 방송을 끊었다.' : ending === 'erase' ? '의심한 기록을 모두 지웠지만, 동생을 찾은 기억도 함께 사라졌다.' : ending === 'human' ? '믿음과 의심을 모두 받아들이고 동생과 기억을 맞춰 보았다.' : '난간 끝의 하윤이 내 목소리로 웃었다. 방송은 잃어버린 동생이 아니라, 동생을 잃었다는 빈자리까지 만들어 냈다.';
  return patch(state, { ending, message, tension: ending === 'erase' || ending === 'illusion' ? 100 : ending === 'restore' ? 0 : 50 });
}
