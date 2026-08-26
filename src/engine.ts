export const SAVE_VERSION = 11;

export type Location = 'entrance' | 'lobby' | 'hall' | 'transmitter' | 'power' | 'archive' | 'studio' | 'passage' | 'booth' | 'roof';
export type RouteLead = 'power' | 'timeline' | 'light';
export const ROUTE_LEADS: readonly { id: RouteLead; title: string; detail: string; evidence: string }[] = [
  { id: 'power', title: '전력부터', detail: '옥상과 스튜디오를 살릴 전원을 먼저 고른다.', evidence: '하윤은 수동 차단을 준비하고 안에 남았다.' },
  { id: 'timeline', title: '시간부터', detail: '기록 릴을 맞춰 하윤의 실제 동선을 복원한다.', evidence: '23:55 원본 릴이 23:40 퇴장을 반박한다.' },
  { id: 'light', title: '빛부터', detail: '숨은 문양을 밝혀 하윤의 통로를 찾는다.', evidence: '세 빛이 겹친 벽 뒤에 젖은 발자국이 있다.' },
];
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
  routeOrder: RouteLead[]; routeEvidence: string[];
  frequency: PuzzleState; breaker: PuzzleState; recordings: PuzzleState; flashlight: PuzzleState; finalStatement: PuzzleState;
}
export type EndingAvailability = Record<Ending, boolean> & { resolved: number };

export const LOCATION_ORDER: Location[] = ['entrance', 'lobby', 'hall', 'transmitter', 'power', 'archive', 'studio', 'passage', 'booth', 'roof'];
export const LOCATIONS: Record<string, { title: string; subtitle: string; act: 1 | 2 | 3; art: string }> = {
  entrance: { title: '폭풍 속 산속 방송국 입구', subtitle: '하윤의 실제 전화는 끊겼고, 안에서는 숨 없는 복제 음성이 같은 문장을 반복한다.', act: 1, art: 'entrance' },
  lobby: { title: '젖은 로비', subtitle: '폐쇄된 공명 복원 방송의 경고문과 기억 부작용 기록이 젖어 있다.', act: 1, art: 'lobby' },
  hall: { title: '긴 복도', subtitle: '정문 기록에는 23:42에 들어온 오빠 한 명만 남아 있다.', act: 1, art: 'hall' },
  transmitter: { title: '송신실', subtitle: '88.0 MHz가 과거 가족 통화를 잘라 하윤의 새 문장을 만든다.', act: 1, art: 'transmitter' },
  power: { title: '전력실', subtitle: '옥상 수동 차단을 준비한 하윤의 정비 흔적이 전력선에 남아 있다.', act: 1, art: 'power' },
  archive: { title: '방송 기록 보관실', subtitle: '23:30부터 자정까지의 원본 릴이 객관적인 사건 순서를 보존한다.', act: 2, art: 'archive' },
  studio: { title: '녹음실', subtitle: '실제 경고 릴에는 합성 음성에 없는 숨·비·스튜디오 잔향이 이어진다.', act: 2, art: 'studio' },
  passage: { title: '숨은 통로', subtitle: '젖은 발자국이 정문을 피해 스튜디오에서 옥상으로 이어진다.', act: 2, art: 'passage' },
  booth: { title: '심야 방송실', subtitle: '23:40 퇴장 방송을 23:58 사진·출입 기록·숨은 동선으로 반증한다.', act: 3, art: 'booth' },
  roof: { title: '안테나 지붕', subtitle: '실제 하윤과 합성 음성을 구분했다. 이제 확인한 증거를 어떻게 처리할지 결정한다.', act: 3, art: 'roof' },
};

export const ITEM_INFO: Record<ItemId, { name: string; icon: string; description: string; detail: string; pickupReaction: string }> = {
  'handheld-radio': { name: '휴대용 라디오', icon: '◉', description: '부식된 건전지로도 88.0 MHz에서만 하윤의 목소리를 내는 낡은 수신기.', detail: '다이얼 유리 안쪽에 88.0을 여러 번 긁어 표시한 흔적이 있다. 건전지는 오래전에 부식됐는데도 번개가 칠 때마다 전원이 잠깐 들어오며, 잡음 속 목소리는 내 이름과 “옥상”이라는 단어를 정확히 발음한다. 수신기 뒷면의 소유자 칸은 물에 번져 비어 있다.', pickupReaction: '라디오를 드는 순간, 입구 스피커가 한 박자 늦게 같은 잡음을 따라 한다.' },
  'frequency-card': { name: '주파수 카드', icon: '▤', description: '폐쇄 전 시험에서도 88.0 MHz가 같은 가족 음성을 반복 생성했음을 보여 주는 정비 카드.', detail: '80–92 MHz 시험표에서 88.0 옆에만 수년 전부터 ‘가족 음성 생성—응답 성공’이 반복돼 있다. 오늘의 하윤 호출보다 오래된 카드이므로 지금 듣는 구조 문장이 원본일 수는 없다. 뒷면에는 ‘숨과 방 잔향이 없으면 합성’이라는 기술 판정 기준이 적혀 있다.', pickupReaction: '카드를 떼자 멈춘 로비 시계의 초침이 딱 한 칸 뒤로 움직인다.' },
  'insulated-gloves': { name: '절연 장갑', icon: '♧', description: '빗물에 젖은 전선을 만질 수 있는 방송국 정비용 고무장갑.', detail: '겉면에는 산 뒤편 정비 통로의 붉은 흙이 묻어 있고 안쪽에는 작은 손자국이 남아 있다. 하윤이 정문이 아니라 통로로 들어와 옥상 수동 차단을 준비했다는 물리적 흔적이다. 오른쪽 장갑의 점 세 개는 남은 비상 전력 세 칸을 뜻한다.', pickupReaction: '장갑이 있던 경비함 안쪽에 손가락으로 긁은 세 줄이 남아 있다.' },
  'breaker-key': { name: '차단기 열쇠', icon: '⚿', description: '전력실 비상 차단기 덮개와 스튜디오 보조 전원을 여는 황동 열쇠.', detail: '황동 손잡이에 “STUDIO MASTER”의 일부만 남아 있다. 송신기 아래에 테이프로 붙어 있었고, 테이프 겉면에는 “목소리보다 전원을 먼저 믿어”라는 문장이 눌러 쓰여 있다. 지문은 빗물에 씻겼지만 최근 사용한 긁힘이 선명하다.', pickupReaction: '열쇠를 떼자 송신기 출력계가 잠깐 옥상 방향으로 끝까지 기운다.' },
  'recording-reel': { name: '녹음 릴', icon: '◎', description: '23:30부터 자정까지의 사건이 네 조각으로 잘린 아날로그 녹음 릴.', detail: '폭풍 경보, 오빠의 정문 입장, 하윤의 실제 경고, 기억 덮어쓰기 방송이 서로 다른 테이프 조각에 남아 있다. 23:55 경고에는 하윤의 숨·비·스튜디오 잔향이 끊기지 않고 이어진다. 반면 자동 방송 조각은 단어 접합부마다 전기 잡음이 나고 사람의 숨이 없다.', pickupReaction: '릴을 들어 올리자 전원이 꺼진 재생기가 혼자 한 바퀴 돌아간다.' },
  'station-log': { name: '방송국 기록 일지', icon: '▥', description: '전력 사용량과 출입 시각, 자정 자동 방송의 이상 기록을 적은 관리 일지.', detail: '23:42 정문을 연 카드는 오빠의 것 하나뿐이다. 같은 페이지에는 정문 출입 센서가 산 뒤편 정비 통로를 기록하지 않는다고 적혀 있어, 하윤의 기록 부재가 곧 부재의 증거는 아니다. 수년 전 폭풍 시험마다 ‘가족 음성 생성—응답 성공’과 기억 혼선 사고가 반복됐다.', pickupReaction: '일지를 펼치자 선반 인터폰이 내 출입 카드 번호를 낮게 읽는다.' },
  flashlight: { name: '색 필터 손전등', icon: '✦', description: '세 색의 광량을 조절해 평범한 벽 아래 숨은 감광 문양을 드러내는 손전등.', detail: '렌즈에는 청록 2, 호박 1, 빨강 3의 눈금이 새겨져 있다. 세 빛이 겹치면 벽의 페인트가 투명해지고 오래된 통로 윤곽이 드러난다. 손잡이에는 급히 쥔 흔적이 하나뿐이며, 두 사람이 번갈아 사용한 흔적은 없다.', pickupReaction: '손전등을 빼내자 방음벽의 빛이 내 그림자만 피해 흔들린다.' },
  'color-filters': { name: '색 필터 세트', icon: '◈', description: '청록·호박·빨강 필터와 각 광량을 기록한 낡은 방송 조명 상자.', detail: '필터 가장자리의 숫자는 스튜디오 벽에 남은 색 자국과 정확히 대응한다. 상자 안쪽에는 “보이는 사람을 믿지 말고 그림자를 세어라”라는 정비 문구가 있다. 지붕 방향을 가리키는 흰 선은 누군가 최근에 덧그린 것처럼 아직 가루가 묻어난다.', pickupReaction: '상자를 여는 순간 스튜디오의 붉은 녹음등이 세 번 깜빡인다.' },
  'sibling-photo': { name: '하윤의 즉석사진', icon: '▣', description: '23:58 시각띠 아래 폭우 속 하윤의 얼굴과 뒤집힌 한 장이 겹쳐 있는, 지나치게 선명한 즉석사진.', detail: '정비 카메라의 인화 시각은 23:58이며 사진 뒤로 7번 옥상 안테나 표식이 보인다. 이는 하윤이 23:40에 떠났다는 방송과 직접 충돌한다. 얼굴 일부가 번지는 현상은 송신기의 기억 간섭 때문이지만, 시각띠와 안테나의 빗물 자국은 다른 장비 기록과 일치한다.', pickupReaction: '사진을 빼내자 벽 틈의 목소리가 내 숨을 반 박자 늦게 따라 한다.' },
  'roof-key': { name: '지붕 열쇠', icon: '⚿', description: '안테나 사다리 옆 철문을 여는 마지막 열쇠. 비를 맞았는데도 미지근하다.', detail: '열쇠 머리에는 7번 안테나 표식과 “한 명만 올라갈 것”이라는 경고가 새겨져 있다. 난간 쪽 자물쇠에는 맞지만, 관리 일지에는 이 열쇠가 오래전에 분실됐다고 적혀 있다. 손에 쥐면 88.0 MHz의 잡음이 아주 가까이서 들리는 듯하다.', pickupReaction: '열쇠를 쥐자 잠긴 옥상문 너머에서 누군가 한 번 노크한다.' },
  'memory-tape': { name: '기억 테이프', icon: '◌', description: '하윤의 구조 요청과 거짓 방송을 같은 파형 위에서 비교할 수 있는 원본 테이프.', detail: '88.0 MHz의 ‘오빠·옥상·믿지 마’는 과거 가족 통화에서 잘라 낸 파형과 완전히 겹치며 단어 사이에 숨이나 방 잔향이 없다. 반면 23:55 아날로그 릴에는 하윤의 연속된 숨, 지붕을 때리는 비, 스튜디오 반사가 함께 남아 있다. 같은 목소리라도 합성 호출과 실제 경고를 구별할 수 있다.', pickupReaction: '테이프를 뽑았는데도 마이크에서 방금 낸 내 숨소리가 계속 재생된다.' },
};

export const CLUES: Clue[] = [
  { id: 'storm-note', title: '폭풍 경보 메모', text: '공명 복원 방송은 가족 음성을 합성하지만, 반복 청취하면 최근 기억을 합성 문장으로 덮어쓴다.', location: 'lobby' },
  { id: 'sibling-call', title: '하윤의 호출', text: '88.0 호출에는 숨과 방 잔향이 없어 합성이다. 23:55 원본 릴에는 하윤의 숨·비·스튜디오 울림이 연속으로 남아 있다.', location: 'studio' },
  { id: 'false-script', title: '수상한 방송 내용', text: '방송은 하윤이 23:40에 떠났다고 하지만 23:58 사진, 정비 통로 발자국, 옥상 차단 흔적이 모두 그 뒤의 실제 동선을 증명한다.', location: 'booth' },
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
export function initialState(): GameState { return { version: SAVE_VERSION, location: 'entrance', inventory: [], found: new Set(), clues: new Set(), tension: 12, failedActions: 0, message: '자정까지 30분. 하윤을 찾고, 거짓 방송이 기억을 덮기 전에 송신기를 멈추자.', editorialScore: 0, ink: 2, correctionFluid: 1, contradictions: 0, clueDecisions: {}, routeOrder: [], routeEvidence: [], frequency: puzzle(), breaker: puzzle(), recordings: puzzle(), flashlight: puzzle(), finalStatement: puzzle() }; }
export function serialize(state: GameState): string { return JSON.stringify({ ...state, found: [...state.found], clues: [...state.clues] }); }
const ITEM_IDS = new Set<ItemId>(Object.keys(ITEM_INFO) as ItemId[]);
const CLUE_IDS = new Set(CLUES.map((clue) => clue.id));
const FOUND_IDS = new Set(HOTSPOTS.map((hotspot) => `hotspot:${hotspot.id}`));
const LOCATIONS_SET = new Set<Location>(LOCATION_ORDER);
const ROUTE_IDS = new Set<RouteLead>(ROUTE_LEADS.map((route) => route.id));
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
  const validRoutes = isStringArray(candidate.routeOrder) && candidate.routeOrder.every((id) => ROUTE_IDS.has(id as RouteLead)) && new Set(candidate.routeOrder).size === candidate.routeOrder.length && candidate.routeOrder.length <= 3
    && isStringArray(candidate.routeEvidence) && candidate.routeEvidence.length === candidate.routeOrder.length
    && new Set(candidate.routeEvidence).size === candidate.routeEvidence.length
    && candidate.routeEvidence.every((id, index) => ROUTE_IDS.has(id as RouteLead) && id === candidate.routeOrder![index]);

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
    || !validEnding || !validDecisions || !validPending || !validRoutes
    || !validNumbers || typeof candidate.message !== 'string') return initialState();
  const base = initialState();
  return { ...base, ...candidate, location: candidate.location as Location, ending: candidate.ending,
    found: new Set(candidate.found), clues: new Set(candidate.clues), inventory: [...new Set(candidate.inventory as ItemId[])],
    clueDecisions: candidate.clueDecisions as Record<string, EditorialAction>, frequency: candidate.frequency!, breaker: candidate.breaker!,
    recordings: candidate.recordings!, flashlight: candidate.flashlight!, finalStatement: candidate.finalStatement! };
}
function patch(state: GameState, change: Partial<GameState>): GameState { return { ...state, ...change }; }
function leadSolved(state: GameState): number { return [state.breaker, state.recordings, state.flashlight].filter((puzzle) => puzzle.status === 'solved').length; }
export function investigationProgress(state: GameState): number {
  return Number(state.frequency.status === 'solved') + Math.min(2, leadSolved(state)) + Number(state.finalStatement.status === 'solved');
}
export function locationAvailable(state: GameState, location: Location): boolean {
  const index = LOCATION_ORDER.indexOf(location); if (index < 0) return false;
  if (location === 'transmitter') return index <= 3;
  if (location === 'power' || location === 'archive' || location === 'studio') return state.frequency.status === 'solved';
  if (location === 'passage' || location === 'booth') return leadSolved(state) >= 2;
  if (location === 'roof') return state.finalStatement.status === 'solved';
  return index <= 2;
}
export function availableLocations(state: GameState): Location[] { return LOCATION_ORDER.filter((location) => locationAvailable(state, location)); }
export function routeStatus(state: GameState): { solved: number; order: RouteLead[]; omitted: RouteLead[] } {
  const order = state.routeOrder.filter((id) => ROUTE_IDS.has(id));
  return { solved: leadSolved(state), order, omitted: ROUTE_LEADS.map((route) => route.id).filter((id) => !order.includes(id)) };
}
const ARRIVAL_REACTIONS: Partial<Record<Location, { trusted: string; doubted: string; mixed: string }>> = {
  hall: {
    trusted: '스피커 잡음 사이로 하윤의 숨이 처음으로 섞인다.',
    doubted: '스피커가 “하윤”을 말하려다 내 이름으로 고쳐 읽는다.',
    mixed: '왼쪽 스피커는 하윤, 오른쪽은 내 목소리로 같은 문장을 읽는다.',
  },
  transmitter: {
    trusted: '88.0 MHz 바늘이 손대지 않았는데 옥상 쪽으로 흔들린다.',
    doubted: '주파수 눈금 아래에서 긁어 지운 내 이름이 드러난다.',
    mixed: '같은 88.0 MHz에서 서로 다른 두 숨소리가 번갈아 잡힌다.',
  },
  passage: {
    trusted: '벽 너머에서 하윤이 내가 남긴 기억을 그대로 되읽는다.',
    doubted: '통로의 메아리가 하윤의 이름을 한 음절씩 지운다.',
    mixed: '앞에서는 하윤, 뒤에서는 내 목소리가 동시에 옥상을 가리킨다.',
  },
  booth: {
    trusted: '꺼진 마이크에 하윤의 숨이 남아 파형 하나를 만든다.',
    doubted: '방송 원고의 “하윤”이 모두 내 이름으로 덧씌워져 있다.',
    mixed: '두 목소리가 같은 문장을 읽지만 마지막 단어만 서로 다르다.',
  },
  roof: {
    trusted: '난간 끝의 하윤이 내가 믿고 남긴 문장을 먼저 말한다.',
    doubted: '난간 끝의 형체가 하윤의 목소리로 내 기억을 부정한다.',
    mixed: '하윤의 입술과 스피커의 목소리가 서로 다른 기억을 말한다.',
  },
};
export function arrivalMessage(state: GameState, location: Location): string {
  const reaction = ARRIVAL_REACTIONS[location];
  if (!reaction || !Object.keys(state.clueDecisions).length) return LOCATIONS[location].subtitle;
  return state.editorialScore > 0 ? reaction.trusted : state.editorialScore < 0 ? reaction.doubted : reaction.mixed;
}
export function move(state: GameState, direction: -1 | 1): GameState {
  const available = availableLocations(state);
  const index = available.indexOf(state.location);
  const location = available[index + direction];
  if (!location) return state;
  return patch(state, { location, tension: Math.min(100, state.tension + 2), message: arrivalMessage(state, location) });
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
  const route: RouteLead | undefined = key === 'breaker' ? 'power' : key === 'recordings' ? 'timeline' : key === 'flashlight' ? 'light' : undefined;
  const routeOrder = correct && route && !state.routeOrder.includes(route) ? [...state.routeOrder, route] : state.routeOrder;
  const routeEvidence = correct && route && !state.routeEvidence.includes(route) ? [...state.routeEvidence, route] : state.routeEvidence;
  return patch(state, { [key]: next, routeOrder, routeEvidence, message: next.feedback, failedActions: state.failedActions + (correct ? 0 : 1), tension: Math.min(100, state.tension + (correct ? 0 : 4)) });
}
export function attemptFrequency(state: GameState, sequence: string[]): GameState { return attempt(state, 'frequency', sequence, ['88'], state.inventory.includes('handheld-radio') && state.inventory.includes('frequency-card'), '88.0 MHz 고정. 하윤의 목소리는 선명하지만 숨과 방 잔향이 없다. 구조 신호가 아니라 가족 통화를 조립한 합성 문장이다.'); }
export function connectBreaker(state: GameState, activeCircuits: string[]): GameState { const normalized = [...activeCircuits].sort(); return attempt(state, 'breaker', normalized, ['antenna', 'emergency', 'studio'], state.inventory.includes('insulated-gloves') && state.inventory.includes('breaker-key') && state.frequency.status === 'solved', '비상 전력이 터졌다. 붉은 복도등이 옥상까지 차례로 켜진다.'); }
export function arrangeRecordings(state: GameState, order: string[]): GameState { return attempt(state, 'recordings', order, ['storm', 'arrival', 'warning', 'erasure'], state.inventory.includes('recording-reel') && state.inventory.includes('station-log') && state.frequency.status === 'solved', '시간축 복원 완료. 23:55 릴의 연속된 숨·비·잔향은 88.0 합성 호출과 다르며, 실제 하윤이 스튜디오에 있었음을 증명한다.'); }
export function selectFlashlightFilter(state: GameState, levels: string[]): GameState { return attempt(state, 'flashlight', levels, ['2', '1', '3'], state.inventory.includes('flashlight') && state.inventory.includes('color-filters') && state.frequency.status === 'solved', '세 빛이 겹치자 벽이 투명해지고 옥상으로 가는 숨은 통로가 열린다.'); }
export const solveFrequency = attemptFrequency;
export const solveBreaker = connectBreaker;
export const solveRecordings = arrangeRecordings;
export const solveFlashlight = selectFlashlightFilter;
export const FINAL_STATEMENTS = ['하윤은 23:40에 방송국을 떠났다.', '기억 삭제 방송은 자정에 가장 강해진다.', '숨은 통로는 스튜디오 뒤에서 옥상 계단으로 이어진다.'];
export function chooseFinalStatement(state: GameState, statementIndex: number): GameState {
  if (state.location !== 'booth' && state.location !== 'roof') return fail(state, '심야 부스에서 방송 기록을 확인해야 한다.');
  if (state.finalStatement.status === 'solved') return state;
  const evidenceReady = leadSolved(state) >= 2 && state.inventory.includes('memory-tape') && state.inventory.includes('sibling-photo') && state.clues.has('false-script');
  if (!evidenceReady) return fail(state, '동생 사진, 기억 테이프, 수상한 방송 기록을 모두 대조해야 한다.');
  const correct = statementIndex === 0;
  const next: PuzzleState = { status: correct ? 'solved' : 'active', attempts: state.finalStatement.attempts + 1, input: [String(statementIndex)], feedback: correct ? '23:58 사진과 정비 통로 동선이 23:40 퇴장 방송을 반증한다. 거짓 방송을 송신기에서 격리했다.' : '그 문장은 원본 시각·동선과 충돌하지 않는다. 23:40 퇴장 주장만 세 증거에 의해 반박된다.' };
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
  const message = ending === 'restore' ? '합성 호출은 버리고 사진·원본 릴·발자국을 따라갔다. 송신기를 부수고 옥상의 실제 하윤을 자정 전에 구조했다.' : ending === 'erase' ? '원본과 합성본을 구분하지 않고 모두 지웠다. 방송은 멈췄지만 실제 경고와 하윤을 찾으러 온 이유도 함께 손상됐다.' : ending === 'human' ? '실제 경고 릴, 합성 음성의 절단 파형, 출입·사진 시각을 원본 상태로 묶어 비상망에 송출했다. 산 아래 수신국이 위치와 조작 증거를 받아 두 사람을 구조했다.' : '실제 흔적까지 모두 합성으로 격리한 탓에 옥상의 하윤을 허상으로 오인했다. 뒤틀린 얼굴은 하윤의 변신이 아니라 방송에 손상된 내 지각이었다.';
  return patch(state, { ending, message, tension: ending === 'erase' || ending === 'illusion' ? 100 : ending === 'restore' ? 0 : 50 });
}
