export const SAVE_VERSION = 5;

export type Location = 'square' | 'forest' | 'well' | 'printshop' | 'archive-entrance' | 'archive-stacks' | 'classroom' | 'chapel' | 'river' | 'editor-room';
export type ItemId = 'bent-type' | 'red-thread' | 'hook-type' | 'empty-lamp' | 'glowing-mushroom' | 'sentence-lamp' | 'archive-key' | 'chalk' | 'child-slate' | 'restored-slate' | 'red-wax' | 'candle-stub' | 'witness-candle' | 'paper-boat' | 'press-plate' | 'proof-boat';
export type FragmentId = 'child-name' | 'witness-name' | 'third-name';
export type Ending = 'restore' | 'erase';
export type HotspotReward = { type: 'item'; id: ItemId } | { type: 'clue'; id: string };
export interface Hotspot { id: string; label: string; location: Location; reward: HotspotReward; requiresArchive?: boolean }
export interface Clue { id: string; title: string; text: string; location: Location }
export interface GameState {
  version: number; location: Location; inventory: ItemId[]; found: Set<string>; clues: Set<string>;
  unlocked: boolean; archiveLit: boolean; fragments: FragmentId[]; shadowSeen: boolean;
  tension: number; failedActions: number; message: string; ending?: Ending;
}

export const LOCATION_ORDER: Location[] = ['square', 'forest', 'well', 'printshop', 'archive-entrance', 'archive-stacks', 'classroom', 'chapel', 'river', 'editor-room'];
export const LOCATIONS: Record<Location, { title: string; subtitle: string; act: 1 | 2 | 3; art: string }> = {
  square: { title: '종이 광장', subtitle: '불타지 못한 원고들이 집처럼 접혀 있다.', act: 1, art: 'square' },
  forest: { title: '여백의 숲', subtitle: '나무 사이의 빈칸이 당신의 이름을 기다린다.', act: 1, art: 'forest' },
  well: { title: '잉크 우물', subtitle: '검은 물 아래에서 금속이 천천히 회전한다.', act: 1, art: 'well' },
  printshop: { title: '폐쇄된 인쇄소', subtitle: '식은 활자판 위에 아직 따뜻한 문장이 남아 있다.', act: 1, art: 'printshop' },
  'archive-entrance': { title: '중앙기록관 입구', subtitle: '문 너머로 수천 장의 종이가 동시에 숨 쉰다.', act: 1, art: 'archive-exterior' },
  'archive-stacks': { title: '중앙기록관 서고', subtitle: '사라진 이름들이 서가 사이에서 서로를 부른다.', act: 2, art: 'archive-interior' },
  classroom: { title: '버려진 교실', subtitle: '칠판의 빈 줄이 아이들의 목소리를 삼킨다.', act: 2, art: 'classroom' },
  chapel: { title: '종이 예배당', subtitle: '촛불 없는 제단에 붉은 밀랍 자국이 남아 있다.', act: 2, art: 'chapel' },
  river: { title: '검은 강둑', subtitle: '종이배들이 물살을 거슬러 기록관 쪽으로 간다.', act: 2, art: 'riverbank' },
  'editor-room': { title: '편집자의 방', subtitle: '마지막 원고와 당신의 삭제 목록이 한 책상 위에 있다.', act: 3, art: 'editor-office' },
};

export const ITEM_INFO: Record<ItemId, { name: string; icon: string; description: string }> = {
  'bent-type': { name: '휘어진 활자', icon: '⌁', description: '끝이 갈고리처럼 휘어진 낡은 활자다.' },
  'red-thread': { name: '허수아비의 붉은 실', icon: '〰', description: '비가 오지 않았는데 축축하다.' },
  'hook-type': { name: '갈고리 활자', icon: '⟆', description: '우물 아래의 작은 물건을 걸어 올릴 수 있겠다.' },
  'empty-lamp': { name: '빈 문장 등잔', icon: '◈', description: '기름 대신 빛나는 문장을 담도록 만들어졌다.' },
  'glowing-mushroom': { name: '발광 버섯', icon: '✦', description: '교정 잉크처럼 푸르게 빛난다.' },
  'sentence-lamp': { name: '문장 등잔', icon: '✧', description: '지워진 문장만 비추는 차가운 등불이다.' },
  'archive-key': { name: '기록관 열쇠', icon: '⚿', description: '문단 기호처럼 깎인 묵직한 열쇠다.' },
  chalk: { name: '분필 조각', icon: '▪', description: '지운 글자를 다시 쓰기에 충분한 길이다.' },
  'child-slate': { name: '아이의 석판', icon: '▣', description: '이름 칸만 깨끗하게 비어 있다.' },
  'restored-slate': { name: '복원된 석판', icon: '▦', description: '희미한 아이의 이름이 칠판을 향한다.' },
  'red-wax': { name: '증언의 밀랍', icon: '●', description: '손끝에 닿으면 누군가의 성이 떠오른다.' },
  'candle-stub': { name: '꺼진 증언초', icon: '◒', description: '심지는 없지만 제단 앞에서 따뜻해진다.' },
  'witness-candle': { name: '증언의 촛불', icon: '◉', description: '불꽃 안에서 입술 모양이 반복된다.' },
  'paper-boat': { name: '이름 없는 종이배', icon: '◇', description: '접힌 안쪽에 비어 있는 서명 칸이 있다.' },
  'press-plate': { name: '젖지 않은 납판', icon: '▤', description: '강물에도 지워지지 않은 눌린 글씨가 있다.' },
  'proof-boat': { name: '납판을 실은 종이배', icon: '◆', description: '물살을 거슬러 보낼 준비가 되었다.' },
};

export const CLUES: Clue[] = [
  { id: 'square-ledger', title: '광장 관리 장부', text: '마을은 주민 대신 문장에서 빠진 글자를 세었다.', location: 'square' },
  { id: 'forest-margin', title: '나무껍질의 여백', text: '여백은 비어 있는 곳이 아니라 누군가를 숨기는 장소였다.', location: 'forest' },
  { id: 'well-song', title: '우물의 후렴', text: '노래의 후렴마다 같은 세 이름이 검은 물에 잠겼다.', location: 'well' },
  { id: 'press-order', title: '인쇄 작업지', text: '삭제 지시: 아이, 증인, 마지막 서명. 발신자는 번져 있다.', location: 'printshop' },
  { id: 'entrance-note', title: '문 안쪽의 메모', text: '열쇠는 자물쇠보다 들어갈 결심을 먼저 연다.', location: 'archive-entrance' },
  { id: 'stack-catalog', title: '삭제 서고 목록', text: '삭제된 이름은 폐기되지 않고 더 깊은 서가로 이동됐다.', location: 'archive-stacks' },
  { id: 'class-roll', title: '출석부의 빈 줄', text: '한 아이의 이름만 칠판과 출석부에서 다르게 지워졌다.', location: 'classroom' },
  { id: 'class-desk', title: '마지막 책상의 낙서', text: '선생님, 제가 없어져도 자리는 치우지 마세요.', location: 'classroom' },
  { id: 'chapel-testimony', title: '접힌 증언', text: '증언자는 보았다고 말했다. 편집자는 보지 못했다고 고쳤다.', location: 'chapel' },
  { id: 'chapel-register', title: '예배당 서명부', text: '서명 위에 굳은 밀랍이 의도적으로 덮여 있다.', location: 'chapel' },
  { id: 'river-proof', title: '강물에 젖지 않은 교정지', text: '세 번째 이름은 물에 씻기지 않는 납판에 남았다.', location: 'river' },
  { id: 'author-note', title: '필체 대조표', text: '삭제 목록의 필체는 당신과 일치한다. 날짜는 당신보다 먼저다.', location: 'editor-room' },
];

export const HOTSPOTS: Hotspot[] = [
  { id: 'square-sign', label: '찢어진 간판', location: 'square', reward: { type: 'item', id: 'bent-type' } },
  { id: 'square-book', label: '버려진 장부', location: 'square', reward: { type: 'clue', id: 'square-ledger' } },
  { id: 'forest-thread', label: '허수아비 소매', location: 'forest', reward: { type: 'item', id: 'red-thread' } },
  { id: 'forest-mushroom', label: '나무뿌리의 푸른빛', location: 'forest', reward: { type: 'item', id: 'glowing-mushroom' } },
  { id: 'forest-bark', label: '글자가 벗겨진 나무', location: 'forest', reward: { type: 'clue', id: 'forest-margin' } },
  { id: 'well-rim', label: '우물 벽의 긁힌 자국', location: 'well', reward: { type: 'clue', id: 'well-song' } },
  { id: 'press-lamp', label: '인쇄기 옆 등잔', location: 'printshop', reward: { type: 'item', id: 'empty-lamp' } },
  { id: 'press-order', label: '인쇄기 아래 작업지', location: 'printshop', reward: { type: 'clue', id: 'press-order' } },
  { id: 'entrance-note', label: '문틈의 접힌 메모', location: 'archive-entrance', reward: { type: 'clue', id: 'entrance-note' } },
  { id: 'stacks-catalog', label: '검게 칠한 서고 목록', location: 'archive-stacks', reward: { type: 'clue', id: 'stack-catalog' } },
  { id: 'class-chalk', label: '칠판 아래 분필', location: 'classroom', reward: { type: 'item', id: 'chalk' }, requiresArchive: true },
  { id: 'class-slate', label: '마지막 책상의 석판', location: 'classroom', reward: { type: 'item', id: 'child-slate' }, requiresArchive: true },
  { id: 'class-roll', label: '교탁 속 출석부', location: 'classroom', reward: { type: 'clue', id: 'class-roll' }, requiresArchive: true },
  { id: 'class-desk', label: '책상 밑의 낙서', location: 'classroom', reward: { type: 'clue', id: 'class-desk' }, requiresArchive: true },
  { id: 'chapel-wax', label: '제단의 붉은 밀랍', location: 'chapel', reward: { type: 'item', id: 'red-wax' }, requiresArchive: true },
  { id: 'chapel-candle', label: '꺼진 증언초', location: 'chapel', reward: { type: 'item', id: 'candle-stub' }, requiresArchive: true },
  { id: 'chapel-fold', label: '의자 밑의 접힌 증언', location: 'chapel', reward: { type: 'clue', id: 'chapel-testimony' }, requiresArchive: true },
  { id: 'chapel-book', label: '밀랍 덮인 서명부', location: 'chapel', reward: { type: 'clue', id: 'chapel-register' }, requiresArchive: true },
  { id: 'river-boat', label: '갈대에 걸린 종이배', location: 'river', reward: { type: 'item', id: 'paper-boat' }, requiresArchive: true },
  { id: 'river-plate', label: '물가의 검은 납판', location: 'river', reward: { type: 'item', id: 'press-plate' }, requiresArchive: true },
  { id: 'river-proof', label: '젖지 않은 교정지', location: 'river', reward: { type: 'clue', id: 'river-proof' }, requiresArchive: true },
  { id: 'editor-note', label: '책상 위 필체 대조표', location: 'editor-room', reward: { type: 'clue', id: 'author-note' }, requiresArchive: true },
];

export function initialState(): GameState { return { version: SAVE_VERSION, location: 'square', inventory: [], found: new Set(), clues: new Set(), unlocked: false, archiveLit: false, fragments: [], shadowSeen: false, tension: 0, failedActions: 0, message: '검은 종이로 오린 달 아래, 광장이 숨을 죽이고 있다.' }; }
export function serialize(state: GameState): string { return JSON.stringify({ ...state, found: [...state.found], clues: [...state.clues] }); }
export function deserialize(raw: string): GameState { const base = initialState(); const value = JSON.parse(raw); if (value.version !== SAVE_VERSION) throw Error('호환되지 않는 저장 데이터'); return { ...base, ...value, found: new Set(value.found ?? []), clues: new Set(value.clues ?? []), inventory: [...new Set<ItemId>(value.inventory ?? [])], fragments: [...new Set<FragmentId>(value.fragments ?? [])] }; }
function patch(state: GameState, change: Partial<GameState>): GameState { return { ...state, ...change }; }
export function locationAvailable(state: GameState, location: Location): boolean { if (location === 'archive-stacks') return state.unlocked; if (['classroom', 'chapel', 'river'].includes(location)) return state.archiveLit; if (location === 'editor-room') return state.archiveLit && state.fragments.length === 3; return true; }
export function availableLocations(state: GameState): Location[] { return LOCATION_ORDER.filter((location) => locationAvailable(state, location)); }
export function move(state: GameState, direction: -1 | 1): GameState { const available = availableLocations(state); const index = available.indexOf(state.location); const location = available[(index + direction + available.length) % available.length] ?? available[0]; const tension = Math.min(100, state.tension + (state.archiveLit ? 4 : 0)); return patch(state, { location, tension, shadowSeen: state.archiveLit && tension >= 20, message: LOCATIONS[location].subtitle }); }
export function fail(state: GameState, message: string): GameState { return patch(state, { failedActions: state.failedActions + 1, tension: Math.min(100, state.tension + 2), message }); }
export function visibleHotspots(state: GameState): Hotspot[] { return HOTSPOTS.filter((hotspot) => hotspot.location === state.location && !state.found.has(`hotspot:${hotspot.id}`) && (!hotspot.requiresArchive || state.archiveLit)); }
export function inspectHotspot(state: GameState, hotspotId: string): GameState { const hotspot = visibleHotspots(state).find((candidate) => candidate.id === hotspotId); if (!hotspot) return fail(state, '이미 조사했거나 지금은 손이 닿지 않는 흔적이다.'); const found = new Set(state.found).add(`hotspot:${hotspot.id}`); if (hotspot.reward.type === 'item') return patch(state, { found: found.add(hotspot.reward.id), inventory: [...state.inventory, hotspot.reward.id], message: `${ITEM_INFO[hotspot.reward.id].name}을(를) 발견했다.` }); const clue = CLUES.find((entry) => entry.id === hotspot.reward.id)!; return patch(state, { found, clues: new Set(state.clues).add(clue.id), message: `조사 기록 추가 · ${clue.title}` }); }
export function inspect(state: GameState, item: ItemId): GameState { return patch(state, { message: ITEM_INFO[item]?.description ?? state.message }); }
export function combine(state: GameState, first: ItemId, second: ItemId): GameState { if (!state.inventory.includes(first) || !state.inventory.includes(second) || first === second) return fail(state, '두 물건을 함께 사용할 수 없다.'); const pair = new Set([first, second]); if (pair.has('bent-type') && pair.has('red-thread')) return craft(state, first, second, 'hook-type', '붉은 실이 활자의 휘어진 끝을 단단히 묶었다.'); if (pair.has('empty-lamp') && pair.has('glowing-mushroom')) return craft(state, first, second, 'sentence-lamp', '푸른 빛이 등잔 안에서 지워진 문장을 만든다.'); if (pair.has('chalk') && pair.has('child-slate')) return craft(state, first, second, 'restored-slate', '분필 가루가 석판의 빈 이름 칸으로 스며든다.'); if (pair.has('red-wax') && pair.has('candle-stub')) return craft(state, first, second, 'witness-candle', '굳은 밀랍이 심지가 되어 증언의 불꽃을 세운다.'); if (pair.has('paper-boat') && pair.has('press-plate')) return craft(state, first, second, 'proof-boat', '납판을 종이배 안에 접어 넣었다.'); return fail(state, '두 물건은 서로를 밀어낸다. 다른 관계를 찾아야 한다.'); }
function craft(state: GameState, first: ItemId, second: ItemId, result: ItemId, message: string): GameState { return patch(state, { inventory: state.inventory.filter((item) => item !== first && item !== second).concat(result), found: new Set(state.found).add(result), message }); }
function addFragment(state: GameState, fragment: FragmentId, consumed: ItemId, message: string): GameState { if (state.fragments.includes(fragment)) return state; return patch(state, { inventory: state.inventory.filter((item) => item !== consumed), fragments: [...state.fragments, fragment], tension: Math.min(100, state.tension + 12), message }); }
export function useItem(state: GameState, item: ItemId, target: Location): GameState { if (!state.inventory.includes(item)) return fail(state, '먼저 소지품에서 사용할 물건을 선택하자.'); if (target === 'well' && item === 'hook-type') return patch(state, { inventory: state.inventory.filter((x) => x !== item).concat('archive-key'), found: new Set(state.found).add('archive-key'), message: '갈고리에 기록관 열쇠가 걸려 올라왔다.' }); if (target === 'archive-entrance' && item === 'archive-key') return patch(state, { inventory: state.inventory.filter((x) => x !== item), unlocked: true, message: '기록관 문이 열렸다. 안쪽의 서고가 새 장소로 이어진다.' }); if (target === 'archive-stacks' && item === 'sentence-lamp' && state.unlocked) return patch(state, { inventory: state.inventory.filter((x) => x !== item), archiveLit: true, shadowSeen: true, tension: 28, message: '삭제 명단이 드러났다. 교실·예배당·강둑에서 세 이름을 되찾아야 한다.' }); if (target === 'classroom' && item === 'restored-slate') return addFragment(state, 'child-name', item, '석판의 이름이 출석부 빈 줄로 돌아갔다. 첫 번째 이름을 복원했다.'); if (target === 'chapel' && item === 'witness-candle') return addFragment(state, 'witness-name', item, '증언의 불꽃 속에서 두 번째 이름이 되살아났다.'); if (target === 'river' && item === 'proof-boat') return addFragment(state, 'third-name', item, '종이배가 강을 거슬러 세 번째 이름을 본문으로 돌려보냈다.'); return fail(state, `${LOCATIONS[target].title}에는 ${ITEM_INFO[item].name}이(가) 반응하지 않는다.`); }
export function chooseEnding(state: GameState, ending: Ending): GameState { if (state.location !== 'editor-room' || state.fragments.length !== 3 || !state.archiveLit) return fail(state, '아직 마지막 원고를 펼칠 조건이 갖춰지지 않았다.'); return patch(state, { ending, tension: ending === 'restore' ? 0 : 100, message: ending === 'restore' ? '세 이름을 본문에 되돌렸다. 마을의 창문마다 불이 켜진다.' : '명단 끝에 내 이름을 적었다. 붉은 그림자가 나와 함께 지워진다.' }); }
