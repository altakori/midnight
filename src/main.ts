import './style.css';
import {
  CLUES,
  FINAL_STATEMENTS,
  ITEM_INFO,
  LOCATION_ORDER,
  LOCATIONS,
  arrangeRecordings,
  attemptFrequency,
  availableLocations,
  cancelPendingClue,
  chooseEnding,
  chooseFinalStatement,
  connectBreaker,
  deserialize,
  endingAvailability,
  fail,
  initialState,
  inspect,
  inspectHotspot,
  move,
  resolveEditorialChoice,
  selectFlashlightFilter,
  serialize,
  visibleHotspots,
  type EditorialAction,
  type Ending,
  type GameState,
  type ItemId,
} from './engine';

const SAVE_KEY = 'midnight-frequency-v8';
const LEGACY_KEYS = ['midnight-frequency-v7', 'unwritten-village-submission-v6', 'unwritten-village-submission-v5'];
const app = document.querySelector<HTMLDivElement>('#app')!;

let state = load();
let detailOpen = false;
let journalOpen = false;
let bagOpen = false;
let paused = false;
let introOpen = !sessionStorage.getItem('midnight-frequency-intro-seen');
let puzzleDraft: string[] = [];
let restoreFocusSelector = '';
let revealedItem: ItemId | null = null;
let revealTimer: number | undefined;

const PUZZLE_META = {
  transmitter: {
    key: 'frequency', title: '네 개의 주파수 다이얼', instruction: '카드의 자국과 라디오 파형을 짝지어 송신 순서를 만들자.',
    evidence: ['굵은 파형이 첫 신호다.', '세 갈래 파형은 굵은 파형 뒤다.', '긴 신호 다음에 한 번의 호출음이 온다.'],
    options: [['1', '1 · 호출음'], ['9', '9 · 긴 신호'], ['3', '3 · 세 갈래'], ['7', '7 · 굵은 파형']], limit: 4,
  },
  power: {
    key: 'breaker', title: '젖은 차단기', instruction: '패널의 세 조건을 모두 만족하도록 케이블을 연결하자.',
    evidence: ['검정 접지선은 마지막이다.', '빨강은 파랑보다 먼저다.', '노랑은 파랑 뒤, 검정 앞이다.'],
    options: [['black', '검정 · 접지'], ['yellow', '노랑 · 조명'], ['red', '빨강 · 발전'], ['blue', '파랑 · 계기']], limit: 4,
  },
  archive: {
    key: 'recordings', title: '순서가 뒤섞인 녹음', instruction: '네 테이프 속 시각을 비교해 사건 순서대로 릴에 걸자.',
    evidence: ['폭풍 경보 · 23:30', '출입문 기록 · 23:42', '하윤의 경고 · 23:55', '기억 삭제 방송 · 00:00'],
    options: [['warning', '하윤의 경고'], ['erasure', '기억 삭제 방송'], ['storm', '폭풍 경보'], ['arrival', '출입문 열림']], limit: 4,
  },
  studio: {
    key: 'flashlight', title: '빛에 반응하는 벽', instruction: '벽에 적힌 조건대로 세 필터를 차례로 비추자.',
    evidence: ['차가운 빛이 문양을 깨운다.', '비상등의 빨강은 마지막이다.', '남은 호박빛은 두 빛 사이다.'],
    options: [['red', '빨강 필터'], ['blue', '청록 필터'], ['amber', '호박 필터']], limit: 3,
  },
} as const;

const HOTSPOT_POSITION: Record<string, [number, number]> = {
  'entrance-radio': [59, 55], 'lobby-frequency': [82, 27], 'lobby-storm-note': [31, 43],
  'hall-gloves': [68, 55], 'transmitter-key': [58, 72], 'power-reel': [58, 53],
  'archive-log': [43, 58], 'studio-flashlight': [45, 73], 'studio-filters': [63, 88],
  'studio-sibling-call': [56, 68], 'passage-photo': [36, 54], 'booth-memory': [48, 72],
  'booth-false-script': [66, 70], 'roof-key': [30, 58],
};

type PuzzleLocation = keyof typeof PUZZLE_META;

function load(): GameState {
  try {
    const current = localStorage.getItem(SAVE_KEY);
    if (current) return deserialize(current);
    for (const key of LEGACY_KEYS) localStorage.removeItem(key);
  } catch {
    // Broken and old saves safely start over.
  }
  return initialState();
}

function save(): void { localStorage.setItem(SAVE_KEY, serialize(state)); }
function commit(next: GameState, keepDraft = false): void {
  state = next;
  if (!keepDraft) puzzleDraft = [];
  save();
  render();
}
function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
}
function asset(path: string): string { return `${import.meta.env.BASE_URL}${path}`; }
function itemArt(id: ItemId): string { return asset(`art/radio/items/${id}.webp`); }
function puzzleSolved(): number {
  return [state.frequency, state.breaker, state.recordings, state.flashlight, state.finalStatement].filter((puzzle) => puzzle.status === 'solved').length;
}
function objective(): string {
  if (state.ending) return '하윤과 함께 방송국을 빠져나왔다.';
  if (state.frequency.status !== 'solved') return '송신실에서 주파수 다이얼 네 개를 맞추자.';
  if (state.breaker.status !== 'solved') return '전력실 차단기에 케이블 네 개를 연결하자.';
  if (state.recordings.status !== 'solved') return '보관실 테이프를 사건 순서대로 놓자.';
  if (state.flashlight.status !== 'solved') return '스튜디오 벽에 색 필터를 비춰 숨은 문을 찾자.';
  if (state.finalStatement.status !== 'solved') return '심야 부스에서 거짓 방송 하나를 골라 빼자.';
  return '옥상으로 올라가 하윤을 찾자.';
}
function hint(): string {
  const currentAttempts = state.location === 'transmitter' ? state.frequency.attempts : state.location === 'power' ? state.breaker.attempts : state.location === 'archive' ? state.recordings.attempts : state.location === 'studio' ? state.flashlight.attempts : state.location === 'booth' ? state.finalStatement.attempts : 0;
  if (state.failedActions < 2 && currentAttempts < 1) return '장소를 가까이 보고 표시된 단서와 도구를 조사하자.';
  if (state.location === 'transmitter') return '휴대 라디오에서 소리가 바뀐 순서를 주파수 카드와 비교하자.';
  if (state.location === 'power') return '피복이 멀쩡한 선부터 연결하고 접지선으로 끝내자.';
  if (state.location === 'archive') return '폭풍 경보 → 하윤 도착 → 경고 녹음 → 기억 삭제 방송 순서다.';
  if (state.location === 'studio') return '녹음에서 들은 색은 청록, 호박, 빨강 순서다.';
  if (state.location === 'booth') return '직접 확인한 장소와 시간에 맞지 않는 방송을 고르자.';
  return '열린 장소를 다시 확인하고 놓친 장비를 찾자.';
}
function signalLabel(): string { return state.tension < 35 ? '약함' : state.tension < 70 ? '불안정' : '위험'; }

function sceneMarkup(): string {
  const location = LOCATIONS[state.location];
  const art = asset(`art/radio/${location.art}.webp`);
  const spots = visibleHotspots(state);
  const sceneClass = detailOpen ? 'detail' : 'overview';
  const hotspotButtons = detailOpen
    ? spots.map((spot) => { const [x, y] = HOTSPOT_POSITION[spot.id] ?? [50, 50]; return `<button class="physical-hotspot" style="--hotspot-x:${x}%;--hotspot-y:${y}%" data-hotspot="${spot.id}"><small>${spot.reward.type === 'item' ? '도구' : '기억'}</small><b>${escapeHtml(spot.label)}</b></button>`; }).join('')
    : '';
  const puzzle = detailOpen ? puzzleMarkup() : '';
  return `<div class="scene-image ${sceneClass}" style="background-image:url('${art}')"></div><div class="rain" aria-hidden="true"></div><div class="vignette" aria-hidden="true"></div>
    ${detailOpen ? `<button class="back-to-scene" data-close-detail>장소 전체 보기</button>${hotspotButtons}${puzzle}` : `<button class="inspect-area" data-open-detail><small>가까이 보기</small><strong>${puzzleEntryLabel()}</strong></button>`}`;
}
function puzzleEntryLabel(): string {
  if (state.location === 'transmitter') return '송신기 다이얼 확인하기';
  if (state.location === 'power') return '차단기 패널 확인하기';
  if (state.location === 'archive') return '녹음 테이블 확인하기';
  if (state.location === 'studio') return '필터와 벽 확인하기';
  if (state.location === 'booth') return '마지막 방송 내용 확인하기';
  if (state.location === 'roof') return '하윤에게 다가가기';
  return '주변 단서와 도구 확인하기';
}
function puzzleMarkup(): string {
  if (visibleHotspots(state).length > 0) return '';
  if (state.location === 'booth') return finalPuzzleMarkup();
  if (state.location === 'roof') return endingChoicesMarkup();
  if (!(state.location in PUZZLE_META)) return '';
  const location = state.location as PuzzleLocation;
  const meta = PUZZLE_META[location];
  const puzzle = state[meta.key];
  if (puzzle.status === 'solved') return `<section class="puzzle-panel solved"><span>해결 완료</span><h3>${meta.title}</h3><p>${escapeHtml(puzzle.feedback)}</p></section>`;
  const ready = puzzleReady(location);
  const slots = Array.from({ length: meta.limit }, (_, index) => `<i class="puzzle-slot ${puzzleDraft[index] ? 'filled' : ''}">${escapeHtml(optionLabel(meta.options, puzzleDraft[index]) || '·')}</i>`).join('');
  const options = meta.options.map(([value, label]) => `<button class="puzzle-piece piece-${value}" data-puzzle-value="${value}" ${puzzleDraft.includes(value) ? 'disabled' : ''}><i aria-hidden="true"></i><b>${escapeHtml(label)}</b></button>`).join('');
  const evidence = `<ul class="puzzle-evidence">${meta.evidence.map((line) => `<li>${escapeHtml(line)}</li>`).join('')}</ul>`;
  return `<section class="puzzle-panel puzzle-${meta.key} ${ready ? '' : 'locked'} ${puzzle.attempts ? 'has-attempt' : ''}" data-puzzle="${meta.key}"><span>현장 퍼즐</span><h3>${meta.title}</h3><p>${meta.instruction}</p>${evidence}${!ready ? `<em>${puzzleRequirement(location)}</em>` : `<div class="puzzle-slots">${slots}</div><div class="puzzle-pieces">${options}</div><div class="puzzle-actions"><button data-puzzle-reset>다시 놓기</button><button data-puzzle-submit ${puzzleDraft.length !== meta.limit ? 'disabled' : ''}>장비 작동</button></div>`}${puzzle.feedback ? `<small class="puzzle-feedback">${escapeHtml(puzzle.feedback)}</small>` : ''}</section>`;
}
function optionLabel(options: readonly (readonly [string, string])[], value?: string): string {
  return value ? options.find(([key]) => key === value)?.[1] ?? value : '';
}
function puzzleReady(location: PuzzleLocation): boolean {
  if (location === 'transmitter') return state.inventory.includes('handheld-radio') && state.inventory.includes('frequency-card');
  if (location === 'power') return state.frequency.status === 'solved' && state.inventory.includes('insulated-gloves') && state.inventory.includes('breaker-key');
  if (location === 'archive') return state.breaker.status === 'solved' && state.inventory.includes('recording-reel') && state.inventory.includes('station-log');
  return state.recordings.status === 'solved' && state.inventory.includes('flashlight') && state.inventory.includes('color-filters');
}
function puzzleRequirement(location: PuzzleLocation): string {
  if (location === 'transmitter') return '휴대 라디오와 주파수 카드를 먼저 찾자.';
  if (location === 'power') return '송신실 퍼즐을 풀고 절연 장갑과 차단기 열쇠를 찾자.';
  if (location === 'archive') return '전력실 퍼즐을 풀고 녹음 릴과 방송국 일지를 찾자.';
  return '보관실 퍼즐을 풀고 손전등과 색 필터를 찾자.';
}
function finalPuzzleMarkup(): string {
  if (state.finalStatement.status === 'solved') return `<section class="puzzle-panel solved"><span>거짓 방송 제거 완료</span><h3>옥상 문이 열렸다</h3><p>${escapeHtml(state.finalStatement.feedback)}</p></section>`;
  const ready = state.flashlight.status === 'solved' && state.inventory.includes('memory-tape') && state.inventory.includes('sibling-photo') && state.clues.has('false-script');
  return `<section class="puzzle-panel final-puzzle ${ready ? '' : 'locked'} ${state.finalStatement.attempts ? 'has-attempt' : ''}"><span>다섯 번째 퍼즐</span><h3>거짓 방송 하나 빼기</h3><p>사진의 시각, 기억 테이프, 방송 기록과 충돌하는 문장을 골라 송신기에서 빼자.</p>${ready ? `<div class="evidence-check"><b>사진</b><b>테이프</b><b>방송 기록</b></div><div class="statement-stack">${FINAL_STATEMENTS.map((text, index) => `<button data-statement="${index}"><span>방송 ${index + 1}</span><b>${escapeHtml(text)}</b></button>`).join('')}</div>` : '<em>동생 사진, 기억 테이프, 수상한 방송 기록이 모두 필요하다.</em>'}${state.finalStatement.feedback ? `<small class="puzzle-feedback">${escapeHtml(state.finalStatement.feedback)}</small>` : ''}</section>`;
}
function endingChoicesMarkup(): string {
  if (state.finalStatement.status !== 'solved') return '<section class="puzzle-panel locked"><h3>옥상 문이 잠겨 있다</h3><p>심야 부스에서 거짓 방송 하나를 먼저 빼자.</p></section>';
  const hasKey = state.inventory.includes('roof-key');
  if (!hasKey) return '<section class="puzzle-panel locked"><h3>하윤이 난간 끝에 있다</h3><p>사다리 옆에서 옥상 열쇠를 찾자.</p></section>';
  const choices = endingAvailability(state);
  if (choices.resolved < 2) return `<section class="puzzle-panel final-choice locked"><span>마지막 선택</span><h3>아직 어떤 기억을 믿을지 정하지 못했다</h3><p>방송국에서 찾은 기억을 두 개 이상 확인한 뒤 돌아오자.</p></section>`;
  return `<section class="puzzle-panel final-choice"><span>마지막 선택 · 지금까지의 행동이 남긴 선택지</span><h3>하윤과 어떻게 빠져나갈까?</h3><button data-ending="restore" ${choices.restore ? '' : 'disabled'}>하윤의 기억을 믿고 송신기를 끈다${choices.restore ? '' : ' · 잠김'}</button><button data-ending="erase" ${choices.erase ? '' : 'disabled'}>모든 기록을 의심하고 지운다${choices.erase ? '' : ' · 잠김'}</button><button data-ending="human" ${choices.human ? '' : 'disabled'}>서로 다른 기억을 맞춰 보고 함께 내려간다${choices.human ? '' : ' · 잠김'}</button></section>`;
}
function toolBelt(): string {
  const tools = state.inventory.filter((id): id is ItemId => Boolean(ITEM_INFO[id]));
  return `<aside class="tool-belt" aria-label="현장 가방"><div class="bag-head"><b>현장 가방 · ${tools.length}개</b><button data-bag>닫기</button></div><div class="bag-items">${tools.length ? tools.map((id) => `<button data-inspect-item="${id}" title="${escapeHtml(ITEM_INFO[id].description)}"><img src="${itemArt(id)}" alt=""><span><b>${escapeHtml(ITEM_INFO[id].name)}</b><small>${escapeHtml(ITEM_INFO[id].description)}</small></span></button>`).join('') : '<span>아직 도구가 없다.</span>'}</div></aside>`;
}
function collectibleRevealMarkup(): string {
  if (!revealedItem) return '';
  const info = ITEM_INFO[revealedItem];
  return `<aside class="collectible-reveal" role="status"><img src="${itemArt(revealedItem)}" alt=""><div><small>새 도구 획득</small><b>${escapeHtml(info.name)}</b><span>${escapeHtml(info.description)}</span></div></aside>`;
}
function journalMarkup(): string {
  const entries = [...state.clues].map((id) => {
    const clue = CLUES.find((candidate) => candidate.id === id);
    if (!clue) return '';
    const choice = state.clueDecisions[id];
    return `<article class="memory-card ${choice === 'delete' ? 'doubted' : ''}"><small>${escapeHtml(LOCATIONS[clue.location].title)}</small><h3>${escapeHtml(clue.title)}</h3><p>${escapeHtml(clue.text)}</p><b>${choice === 'delete' ? '방송이 만든 기억이라 의심해 지웠다' : '내 기억이라 믿고 남겼다'}</b></article>`;
  }).join('');
  return `<aside class="screen-overlay journal" role="dialog" aria-modal="true"><button data-journal class="overlay-close">닫기</button><span>찾은 기억 ${state.clues.size}/3</span><h2>확인한 사실</h2><p>이 사실을 퍼즐과 마지막 방송에 이용하자.</p><div>${entries || '<em>아직 확인한 기억이 없다.</em>'}</div></aside>`;
}
function memoryChoiceMarkup(): string {
  if (!state.pendingClue) return '';
  const clue = CLUES.find((candidate) => candidate.id === state.pendingClue);
  if (!clue) return '';
  return `<aside class="screen-overlay memory-choice" role="dialog" aria-modal="true" aria-labelledby="memory-title"><section><span>찾은 기억 · 이 판단은 마지막 선택을 바꾼다</span><h2 id="memory-title">${escapeHtml(clue.title)}</h2><p>${escapeHtml(clue.text)}</p><button data-memory="record">믿는다 · 이 기억으로 하윤을 찾는다</button><button data-memory="delete">의심한다 · 방송이 만든 기억으로 본다</button><button data-cancel-memory>지금은 결정하지 않는다</button></section></aside>`;
}
function endingMarkup(): string {
  if (!state.ending) return '';
  const endingClass: Record<Ending, string> = { restore: 'ending-restore', erase: 'ending-erase', human: 'ending-human' };
  const copy = state.ending === 'restore'
    ? ['구조', '자정 전에 하윤을 찾았다', '함께 송신기를 끄고 산을 내려갔다.']
    : state.ending === 'erase'
      ? ['잃은 기억', '방송은 멈췄지만 하윤을 잊었다', '아침이 왔을 때, 왜 이곳에 왔는지도 기억나지 않았다.']
      : ['귀환', '하윤과 서로의 기억을 확인했다', '두 사람은 손을 잡고 폭우 속 산을 내려갔다.'];
  return `<section class="ending-screen ${endingClass[state.ending]}" style="background-image:linear-gradient(#02080ccc,#02080cee),url('${asset('art/radio/roof.webp')}')"><div><small>${copy[0]}</small><h2>${copy[1]}</h2><p>${escapeHtml(state.message)}</p><b>${copy[2]}</b><button data-reset>처음부터 다시 하기</button></div></section>`;
}
function introMarkup(): string {
  return `<aside class="screen-overlay intro" role="dialog" aria-modal="true"><section><span>23:30 · 폭풍 속 해월 제7중계소</span><h2>자정 전에 동생 하윤을 찾아야 한다</h2><p>“방송을 믿지 마. 방송이 기억을 지워.” 하윤의 전화가 산속 폐방송국에서 끊겼다.</p><p>자정 전에 현장 퍼즐 다섯 개를 풀고 거짓 방송 하나를 빼야 한다.</p><ol><li>좌우 버튼으로 장소를 옮긴다.</li><li>장비를 가까이 보고 단서와 도구를 찾는다.</li><li>퍼즐을 풀고 옥상에서 하윤을 찾는다.</li></ol><button data-start>폐방송국에 들어가기</button></section></aside>`;
}
function render(): void {
  const location = LOCATIONS[state.location];
  const openLocations = availableLocations(state);
  const placeNumber = LOCATION_ORDER.indexOf(state.location) + 1;
  app.innerHTML = `<main class="game ${paused ? 'paused' : ''} ${detailOpen ? 'is-detail' : ''} ${state.ending ? 'has-ending' : ''}">
    <header class="game-header"><div class="brand"><span>해월 제7중계소 · 23:30</span><h1>자정 <em>주파수</em></h1></div><div class="header-objective"><span>현재 목표</span><strong>${objective()}</strong><div class="progress" aria-label="퍼즐 ${puzzleSolved()}/5 완료">${Array.from({ length: 5 }, (_, i) => `<i class="${i < puzzleSolved() ? 'done' : ''}"></i>`).join('')}</div><span class="mobile-signal" title="방송 신호 ${signalLabel()}" aria-label="방송 신호 ${signalLabel()}"><i class="${state.tension >= 35 ? 'lit' : ''}"></i><i class="${state.tension >= 65 ? 'lit' : ''}"></i><i class="${state.tension >= 90 ? 'lit' : ''}"></i></span></div><nav><i>● 저장됨</i><button data-journal>기억 ${state.clues.size}/3</button><button data-bag aria-expanded="${bagOpen}">가방 ${state.inventory.length}</button><button data-pause>${paused ? '계속' : '멈춤'}</button></nav></header>
    <section class="viewport" aria-label="${escapeHtml(location.title)}"><div class="place"><small>장소 ${String(placeNumber).padStart(2, '0')} · ${openLocations.length}/10 열림</small><h2>${escapeHtml(location.title)}</h2><p>${escapeHtml(location.subtitle)}</p></div>${sceneMarkup()}
      ${!detailOpen ? '<button class="turn left" data-turn="-1" aria-label="이전 장소">‹<span>이전</span></button><button class="turn right" data-turn="1" aria-label="다음 장소">›<span>다음</span></button>' : ''}
      <p class="message" role="status">${escapeHtml(state.message)}</p><div class="signal"><span>방송 신호 · ${signalLabel()}</span><b><i style="width:${state.tension}%"></i></b></div>
    </section>
    <p class="field-hint"><b>현장 힌트</b>${hint()}</p>${bagOpen ? toolBelt() : ''}
    ${collectibleRevealMarkup()}${journalOpen ? journalMarkup() : ''}${state.pendingClue ? memoryChoiceMarkup() : ''}${introOpen ? introMarkup() : ''}${paused ? '<aside class="pause-card"><span>조사 멈춤</span><button data-pause>계속하기</button><button data-reset>진행 초기화</button></aside>' : ''}${endingMarkup()}
  </main>`;
  bind();
  const modalFocusTarget = state.pendingClue ? '[data-memory]' : introOpen ? '[data-start]' : journalOpen ? '[data-journal].overlay-close' : paused ? '.pause-card [data-pause]' : state.ending ? '[data-reset]' : '';
  const focusTarget = modalFocusTarget || restoreFocusSelector;
  if (focusTarget) document.querySelector<HTMLElement>(focusTarget)?.focus();
  if (!modalFocusTarget) restoreFocusSelector = '';
}

function trapModalFocus(event: KeyboardEvent): boolean {
  if (event.key !== 'Tab') return false;
  const modal = document.querySelector<HTMLElement>('.screen-overlay, .pause-card, .ending-screen');
  if (!modal) return false;
  const focusable = [...modal.querySelectorAll<HTMLElement>('button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])')];
  if (!focusable.length) return false;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && (document.activeElement === first || !modal.contains(document.activeElement))) last.focus();
  else if (!event.shiftKey && (document.activeElement === last || !modal.contains(document.activeElement))) first.focus();
  else return false;
  event.preventDefault();
  return true;
}
function attemptCurrentPuzzle(): void {
  let next = state;
  if (state.location === 'transmitter') next = attemptFrequency(state, puzzleDraft);
  else if (state.location === 'power') next = connectBreaker(state, puzzleDraft);
  else if (state.location === 'archive') next = arrangeRecordings(state, puzzleDraft);
  else if (state.location === 'studio') next = selectFlashlightFilter(state, puzzleDraft);
  commit(next);
}
function dismissReveal(): void {
  revealedItem = null;
  if (revealTimer) window.clearTimeout(revealTimer);
  revealTimer = undefined;
}
function resetGame(): void {
  if (!confirm('현재 진행을 모두 지우고 처음부터 시작할까요?')) return;
  dismissReveal();
  localStorage.removeItem(SAVE_KEY);
  for (const key of LEGACY_KEYS) localStorage.removeItem(key);
  state = initialState(); detailOpen = false; journalOpen = false; bagOpen = false; paused = false; introOpen = true; puzzleDraft = []; render();
}
function bind(): void {
  document.querySelectorAll<HTMLElement>('[data-turn]').forEach((button) => button.onclick = () => { dismissReveal(); detailOpen = false; puzzleDraft = []; commit(move(state, Number(button.dataset.turn) as -1 | 1)); });
  document.querySelector<HTMLElement>('[data-open-detail]')?.addEventListener('click', () => { detailOpen = true; puzzleDraft = []; render(); });
  document.querySelector<HTMLElement>('[data-close-detail]')?.addEventListener('click', () => { detailOpen = false; puzzleDraft = []; render(); });
  document.querySelectorAll<HTMLElement>('[data-hotspot]').forEach((button) => button.onclick = () => {
    const spot = visibleHotspots(state).find((candidate) => candidate.id === button.dataset.hotspot);
    if (spot?.reward.type === 'item') {
      revealedItem = spot.reward.id;
      if (revealTimer) window.clearTimeout(revealTimer);
      revealTimer = window.setTimeout(() => { revealedItem = null; revealTimer = undefined; render(); }, 2600);
    }
    restoreFocusSelector = '[data-close-detail]'; commit(inspectHotspot(state, button.dataset.hotspot!), true);
  });
  document.querySelectorAll<HTMLElement>('[data-inspect-item]').forEach((button) => button.onclick = () => commit(inspect(state, button.dataset.inspectItem as ItemId), true));
  document.querySelectorAll<HTMLElement>('[data-puzzle-value]').forEach((button) => button.onclick = () => { const value = button.dataset.puzzleValue!; if (!puzzleDraft.includes(value)) puzzleDraft.push(value); render(); });
  document.querySelector<HTMLElement>('[data-puzzle-reset]')?.addEventListener('click', () => { puzzleDraft = []; render(); });
  document.querySelector<HTMLElement>('[data-puzzle-submit]')?.addEventListener('click', attemptCurrentPuzzle);
  document.querySelectorAll<HTMLElement>('[data-statement]').forEach((button) => button.onclick = () => commit(chooseFinalStatement(state, Number(button.dataset.statement)), true));
  document.querySelectorAll<HTMLElement>('[data-ending]').forEach((button) => button.onclick = () => commit(chooseEnding(state, button.dataset.ending as Ending)));
  document.querySelectorAll<HTMLElement>('[data-memory]').forEach((button) => button.onclick = () => commit(resolveEditorialChoice(state, button.dataset.memory as EditorialAction, false), true));
  document.querySelector<HTMLElement>('[data-cancel-memory]')?.addEventListener('click', () => commit(cancelPendingClue(state), true));
  document.querySelectorAll<HTMLElement>('[data-journal]').forEach((button) => button.onclick = () => { dismissReveal(); if (!journalOpen) restoreFocusSelector = 'header [data-journal]'; journalOpen = !journalOpen; render(); });
  document.querySelectorAll<HTMLElement>('[data-bag]').forEach((button) => button.onclick = () => { dismissReveal(); bagOpen = !bagOpen; render(); });
  document.querySelectorAll<HTMLElement>('[data-pause]').forEach((button) => button.onclick = () => { dismissReveal(); if (!paused) restoreFocusSelector = 'header [data-pause]'; paused = !paused; render(); });
  document.querySelectorAll<HTMLElement>('[data-reset]').forEach((button) => button.onclick = resetGame);
  document.querySelector<HTMLElement>('[data-start]')?.addEventListener('click', () => { restoreFocusSelector = '[data-open-detail]'; introOpen = false; sessionStorage.setItem('midnight-frequency-intro-seen', '1'); render(); });
}
window.addEventListener('keydown', (event) => {
  if (trapModalFocus(event)) return;
  if (state.pendingClue) { if (event.key === 'Escape') commit(cancelPendingClue(state), true); return; }
  if (introOpen) { if (event.key === 'Escape') { restoreFocusSelector = '[data-open-detail]'; introOpen = false; sessionStorage.setItem('midnight-frequency-intro-seen', '1'); render(); } return; }
  if (journalOpen) { if (event.key === 'Escape') { journalOpen = false; render(); } return; }
  if (paused) { if (event.key === 'Escape') { paused = false; render(); } return; }
  if (state.ending) return;
  if (event.key === 'Escape' && detailOpen) { detailOpen = false; puzzleDraft = []; render(); return; }
  if (!detailOpen && (event.key.toLowerCase() === 'a' || event.key === 'ArrowLeft')) { dismissReveal(); commit(move(state, -1)); }
  if (!detailOpen && (event.key.toLowerCase() === 'd' || event.key === 'ArrowRight')) { dismissReveal(); commit(move(state, 1)); }
});
render();
