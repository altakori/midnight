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

const SAVE_KEY = 'midnight-frequency-v7';
const LEGACY_KEYS = ['unwritten-village-submission-v6', 'unwritten-village-submission-v5'];
const app = document.querySelector<HTMLDivElement>('#app')!;

let state = load();
let detailOpen = false;
let journalOpen = false;
let paused = false;
let introOpen = !sessionStorage.getItem('midnight-frequency-intro-seen');
let puzzleDraft: string[] = [];
let restoreFocusSelector = '';

const PUZZLE_META = {
  transmitter: {
    key: 'frequency', title: '네 개의 다이얼', instruction: '주파수 카드의 번개 자국을 보고 숫자 네 개를 순서대로 누르자.',
    options: [['7', '낮은 잡음'], ['3', '짧은 신호'], ['9', '긴 신호'], ['1', '아이의 호출음']], limit: 4,
  },
  power: {
    key: 'breaker', title: '젖은 차단기', instruction: '안전 표시를 보고 케이블 네 개를 순서대로 연결하자.',
    options: [['red', '빨강'], ['blue', '파랑'], ['yellow', '노랑'], ['black', '검정']], limit: 4,
  },
  archive: {
    key: 'recordings', title: '순서가 뒤섞인 녹음', instruction: '사건이 일어난 순서대로 테이프를 놓자.',
    options: [['storm', '① 폭풍 경보가 내려왔다'], ['arrival', '② 하윤이 방송국에 도착했다'], ['warning', '③ 하윤이 경고 방송을 남겼다'], ['erasure', '④ 기억 삭제 방송이 시작됐다']], limit: 4,
  },
  studio: {
    key: 'flashlight', title: '빛에 반응하는 벽', instruction: '녹음에서 들은 색 순서대로 손전등 필터를 비추자.',
    options: [['blue', '청록'], ['amber', '호박'], ['red', '빨강']], limit: 3,
  },
} as const;

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
  if (state.failedActions < 2) return '장소를 가까이 보고 표시된 단서와 도구를 조사하자.';
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
    ? spots.map((spot, index) => `<button class="physical-hotspot hotspot-${index % 3}" data-hotspot="${spot.id}"><span>${spot.reward.type === 'item' ? '도구' : '기억'}</span><strong>${escapeHtml(spot.label)}</strong></button>`).join('')
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
  const options = meta.options.map(([value, label]) => `<button data-puzzle-value="${value}" ${puzzleDraft.includes(value) ? 'disabled' : ''}><b>${escapeHtml(label)}</b></button>`).join('');
  return `<section class="puzzle-panel ${ready ? '' : 'locked'}" data-puzzle="${meta.key}"><span>현장 퍼즐</span><h3>${meta.title}</h3><p>${meta.instruction}</p>${!ready ? `<em>${puzzleRequirement(location)}</em>` : `<div class="puzzle-slots">${slots}</div><div class="puzzle-pieces">${options}</div><div class="puzzle-actions"><button data-puzzle-reset>선택 지우기</button><button data-puzzle-submit ${puzzleDraft.length !== meta.limit ? 'disabled' : ''}>순서 확인</button></div>`}${puzzle.feedback ? `<small class="puzzle-feedback">${escapeHtml(puzzle.feedback)}</small>` : ''}</section>`;
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
  const ready = state.flashlight.status === 'solved' && state.inventory.includes('memory-tape');
  return `<section class="puzzle-panel final-puzzle ${ready ? '' : 'locked'}"><span>다섯 번째 퍼즐</span><h3>거짓 방송 하나 빼기</h3><p>직접 확인한 사실과 맞지 않는 방송 하나를 골라 송신기에서 빼자.</p>${ready ? `<div class="statement-stack">${FINAL_STATEMENTS.map((text, index) => `<button data-statement="${index}"><span>방송 ${index + 1}</span><b>${escapeHtml(text)}</b></button>`).join('')}</div>` : '<em>숨은 통로에서 기억 테이프를 먼저 찾자.</em>'}${state.finalStatement.feedback ? `<small class="puzzle-feedback">${escapeHtml(state.finalStatement.feedback)}</small>` : ''}</section>`;
}
function endingChoicesMarkup(): string {
  if (state.finalStatement.status !== 'solved') return '<section class="puzzle-panel locked"><h3>옥상 문이 잠겨 있다</h3><p>심야 부스에서 거짓 방송 하나를 먼저 빼자.</p></section>';
  const hasKey = state.inventory.includes('roof-key');
  if (!hasKey) return '<section class="puzzle-panel locked"><h3>하윤이 난간 끝에 있다</h3><p>사다리 옆에서 옥상 열쇠를 찾자.</p></section>';
  return `<section class="puzzle-panel final-choice"><span>마지막 선택</span><h3>하윤과 어떻게 빠져나갈까?</h3><button data-ending="restore">하윤과 함께 송신기를 끈다</button><button data-ending="erase">방송국의 모든 기록을 지운다</button>${state.contradictions >= 1 ? '<button data-ending="human">하윤과 기억을 확인하고 함께 내려간다</button>' : ''}</section>`;
}
function toolBelt(): string {
  const tools = state.inventory.filter((id): id is ItemId => Boolean(ITEM_INFO[id]));
  return `<div class="tool-belt"><b>가방</b>${tools.length ? tools.map((id) => `<button data-inspect-item="${id}" title="${escapeHtml(ITEM_INFO[id].description)}"><i>${ITEM_INFO[id].icon}</i><span>${escapeHtml(ITEM_INFO[id].name)}</span></button>`).join('') : '<span>아직 도구가 없다.</span>'}</div>`;
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
  return `<aside class="screen-overlay memory-choice" role="dialog" aria-modal="true" aria-labelledby="memory-title"><section><span>찾은 기억</span><h2 id="memory-title">${escapeHtml(clue.title)}</h2><p>${escapeHtml(clue.text)}</p><button data-memory="record">믿는다 · 기억을 남긴다</button><button data-memory="delete">의심한다 · 기억을 지운다</button><button data-cancel-memory>지금은 결정하지 않는다</button></section></aside>`;
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
    <header><div><span>산속 실종 · 23:30</span><h1>자정 <em>주파수</em></h1></div><nav><i>● 자동 저장</i><button data-journal>기억 보기 ${state.clues.size}/3</button><button data-pause>${paused ? '계속하기' : '멈추기'}</button><button data-reset>처음부터 하기</button></nav></header>
    <section class="viewport" aria-label="${escapeHtml(location.title)}"><div class="place"><small>장소 ${String(placeNumber).padStart(2, '0')} · ${openLocations.length}/10 열림</small><h2>${escapeHtml(location.title)}</h2><p>${escapeHtml(location.subtitle)}</p></div>${sceneMarkup()}
      ${!detailOpen ? '<button class="turn left" data-turn="-1" aria-label="이전 장소">‹<span>이전</span></button><button class="turn right" data-turn="1" aria-label="다음 장소">›<span>다음</span></button>' : ''}
      <p class="message" role="status">${escapeHtml(state.message)}</p><div class="signal"><span>방송 신호 · ${signalLabel()}</span><b><i style="width:${state.tension}%"></i></b></div>
    </section>
    <section class="lower"><aside class="objective"><span>현재 목표</span><strong>${objective()}</strong><small>${hint()}</small><div class="progress">${Array.from({ length: 5 }, (_, i) => `<i class="${i < puzzleSolved() ? 'done' : ''}"></i>`).join('')}</div></aside>${toolBelt()}</section>
    ${journalOpen ? journalMarkup() : ''}${state.pendingClue ? memoryChoiceMarkup() : ''}${introOpen ? introMarkup() : ''}${paused ? '<aside class="pause-card"><span>조사 멈춤</span><button data-pause>계속하기</button></aside>' : ''}${endingMarkup()}
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
function resetGame(): void {
  if (!confirm('현재 진행을 모두 지우고 처음부터 시작할까요?')) return;
  localStorage.removeItem(SAVE_KEY);
  for (const key of LEGACY_KEYS) localStorage.removeItem(key);
  state = initialState(); detailOpen = false; journalOpen = false; paused = false; introOpen = true; puzzleDraft = []; render();
}
function bind(): void {
  document.querySelectorAll<HTMLElement>('[data-turn]').forEach((button) => button.onclick = () => { detailOpen = false; puzzleDraft = []; commit(move(state, Number(button.dataset.turn) as -1 | 1)); });
  document.querySelector<HTMLElement>('[data-open-detail]')?.addEventListener('click', () => { detailOpen = true; puzzleDraft = []; render(); });
  document.querySelector<HTMLElement>('[data-close-detail]')?.addEventListener('click', () => { detailOpen = false; puzzleDraft = []; render(); });
  document.querySelectorAll<HTMLElement>('[data-hotspot]').forEach((button) => button.onclick = () => { restoreFocusSelector = '[data-close-detail]'; commit(inspectHotspot(state, button.dataset.hotspot!), true); });
  document.querySelectorAll<HTMLElement>('[data-inspect-item]').forEach((button) => button.onclick = () => commit(inspect(state, button.dataset.inspectItem as ItemId), true));
  document.querySelectorAll<HTMLElement>('[data-puzzle-value]').forEach((button) => button.onclick = () => { const value = button.dataset.puzzleValue!; if (!puzzleDraft.includes(value)) puzzleDraft.push(value); render(); });
  document.querySelector<HTMLElement>('[data-puzzle-reset]')?.addEventListener('click', () => { puzzleDraft = []; render(); });
  document.querySelector<HTMLElement>('[data-puzzle-submit]')?.addEventListener('click', attemptCurrentPuzzle);
  document.querySelectorAll<HTMLElement>('[data-statement]').forEach((button) => button.onclick = () => commit(chooseFinalStatement(state, Number(button.dataset.statement)), true));
  document.querySelectorAll<HTMLElement>('[data-ending]').forEach((button) => button.onclick = () => commit(chooseEnding(state, button.dataset.ending as Ending)));
  document.querySelectorAll<HTMLElement>('[data-memory]').forEach((button) => button.onclick = () => commit(resolveEditorialChoice(state, button.dataset.memory as EditorialAction, false), true));
  document.querySelector<HTMLElement>('[data-cancel-memory]')?.addEventListener('click', () => commit(cancelPendingClue(state), true));
  document.querySelectorAll<HTMLElement>('[data-journal]').forEach((button) => button.onclick = () => { if (!journalOpen) restoreFocusSelector = 'header [data-journal]'; journalOpen = !journalOpen; render(); });
  document.querySelectorAll<HTMLElement>('[data-pause]').forEach((button) => button.onclick = () => { if (!paused) restoreFocusSelector = 'header [data-pause]'; paused = !paused; render(); });
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
  if (!detailOpen && (event.key.toLowerCase() === 'a' || event.key === 'ArrowLeft')) commit(move(state, -1));
  if (!detailOpen && (event.key.toLowerCase() === 'd' || event.key === 'ArrowRight')) commit(move(state, 1));
});
render();
