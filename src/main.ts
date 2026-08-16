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

const SAVE_KEY = 'midnight-frequency-v10';
const GALLERY_KEY = 'midnight-frequency-endings-v1';
const LEGACY_KEYS = ['midnight-frequency-v9', 'midnight-frequency-v8', 'midnight-frequency-v7', 'unwritten-village-submission-v6', 'unwritten-village-submission-v5'];
const app = document.querySelector<HTMLDivElement>('#app')!;

const ENDING_INFO: Record<Ending, { kicker: string; title: string; summary: string }> = {
  restore: { kicker: 'ENDING 01 · 구조', title: '자정 전에 하윤을 찾았다', summary: '믿고 남긴 기억으로 송신기를 끄고 하윤과 산을 내려갔다.' },
  erase: { kicker: 'ENDING 02 · 잃은 기억', title: '방송은 멈췄지만 하윤을 잊었다', summary: '모든 기록을 지운 대가로 이곳에 온 이유까지 사라졌다.' },
  human: { kicker: 'ENDING 03 · 귀환', title: '서로 다른 기억을 맞춰 보았다', summary: '믿음과 의심을 함께 품고 하윤과 폭우 속을 빠져나왔다.' },
  illusion: { kicker: 'ENDING 04 · 없는 목소리', title: '하윤은 방송이 만든 허상이었다', summary: '88.0 MHz는 가장 그리운 목소리와 그 목소리를 잃은 기억까지 만들어 냈다.' },
};
const ENDINGS = Object.keys(ENDING_INFO) as Ending[];

let state = load();
let detailOpen = false;
let journalOpen = false;
let bagOpen = false;
let paused = false;
let galleryOpen = false;
let selectedItem: ItemId | null = null;
let jumpScareOpen = false;
let introOpen = !sessionStorage.getItem('midnight-frequency-intro-seen');
let puzzleDraft: string[] = [];
let restoreFocusSelector = '';
let revealedItem: ItemId | null = null;
let revealTimer: number | undefined;
let rewardBeat: { kicker: string; title: string; text: string; major: boolean } | null = null;
let rewardTimer: number | undefined;
let scareTimer: number | undefined;
const unlockedEndings = loadUnlockedEndings();

const PUZZLE_META = {
  transmitter: {
    key: 'frequency', title: '하윤의 구조 주파수', instruction: '다이얼을 천천히 돌려 목소리가 가장 선명한 지점에 고정하자.',
    evidence: ['카드에 80–90 MHz가 표시돼 있다.', '88 근처에서 “옥상”이라는 말이 들린다.', '신호 막대가 모두 차면 고정할 수 있다.'],
    options: [] as readonly (readonly [string, string])[], limit: 1,
  },
  power: {
    key: 'breaker', title: '비상 전력 분배', instruction: '남은 전력 3칸으로 구조에 꼭 필요한 회로만 켜자.',
    evidence: ['옥상 안테나가 신호를 보낸다.', '비상등이 탈출로를 밝힌다.', '스튜디오에서 하윤의 원본 녹음을 찾을 수 있다.'],
    options: [['antenna', '옥상 안테나'], ['emergency', '비상등'], ['studio', '스튜디오'], ['heating', '난방'], ['sign', '외부 간판']], limit: 3,
  },
  archive: {
    key: 'recordings', title: '순서가 뒤섞인 녹음', instruction: '네 테이프 속 시각을 비교해 사건 순서대로 릴에 걸자.',
    evidence: ['폭풍 경보 · 23:30', '출입문 기록 · 23:42', '하윤의 경고 · 23:55', '기억 삭제 방송 · 00:00'],
    options: [['warning', '하윤의 경고'], ['erasure', '기억 삭제 방송'], ['storm', '폭풍 경보'], ['arrival', '출입문 열림']], limit: 4,
  },
  studio: {
    key: 'flashlight', title: '숨은 문 빛 혼합기', instruction: '세 필터의 광량을 조절해 벽의 흰 문양을 완성하자.',
    evidence: ['청록은 2칸.', '호박은 가장 약한 1칸.', '빨강은 가장 강한 3칸.'],
    options: [] as readonly (readonly [string, string])[], limit: 3,
  },
} as const;

const HOTSPOT_LAYOUT: Record<string, { x: number; y: number; scale?: number; rotate?: number }> = {
  'entrance-radio': { x: 56, y: 69, scale: .86, rotate: -7 },
  'lobby-frequency': { x: 27, y: 68, scale: .78, rotate: -10 },
  'lobby-storm-note': { x: 75, y: 46, scale: .72, rotate: 4 },
  'hall-gloves': { x: 77, y: 69, scale: .92, rotate: 7 },
  'transmitter-key': { x: 56, y: 78, scale: .72, rotate: 12 },
  'power-reel': { x: 48, y: 79, scale: .9, rotate: -5 },
  'archive-log': { x: 51, y: 73, scale: .84, rotate: -8 },
  'studio-flashlight': { x: 28, y: 76, scale: .82, rotate: -13 },
  'studio-filters': { x: 51, y: 84, scale: .76, rotate: 3 },
  'studio-sibling-call': { x: 70, y: 68, scale: .7, rotate: 8 },
  'passage-photo': { x: 72, y: 58, scale: .78, rotate: 7 },
  'booth-memory': { x: 49, y: 76, scale: .86, rotate: -6 },
  'booth-false-script': { x: 68, y: 62, scale: .7, rotate: 5 },
  'roof-key': { x: 18, y: 69, scale: .78, rotate: -11 },
};

type PuzzleLocation = keyof typeof PUZZLE_META;

function loadUnlockedEndings(): Set<Ending> {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(GALLERY_KEY) ?? '[]');
    if (Array.isArray(parsed)) return new Set(parsed.filter((ending): ending is Ending => typeof ending === 'string' && ENDINGS.includes(ending as Ending)));
  } catch {
    // A malformed gallery never blocks the game.
  }
  return new Set();
}
function unlockEnding(ending: Ending): void {
  unlockedEndings.add(ending);
  localStorage.setItem(GALLERY_KEY, JSON.stringify([...unlockedEndings]));
}
function playIllusionSound(): void {
  const audio = new Audio(asset('audio/hayun-illusion.mp3'));
  audio.volume = .72;
  void audio.play().catch(() => { /* The ending remains readable if autoplay is blocked. */ });
}

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
  const solvedBefore = puzzleSolvedFor(state);
  const endingBefore = state.ending;
  state = next;
  if (state.ending && state.ending !== endingBefore) unlockEnding(state.ending);
  if (!keepDraft) puzzleDraft = [];
  const solvedAfter = puzzleSolvedFor(state);
  if (solvedAfter > solvedBefore) showReward(solvedAfter);
  save();
  render();
}
function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
}
function asset(path: string): string { return `${import.meta.env.BASE_URL}${path}`; }
function itemArt(id: ItemId): string { return asset(`art/radio/items/${id}.webp`); }
function puzzleSolvedFor(value: GameState): number { return [value.frequency, value.breaker, value.recordings, value.flashlight, value.finalStatement].filter((puzzle) => puzzle.status === 'solved').length; }
function puzzleSolved(): number { return puzzleSolvedFor(state); }
function objective(): string {
  if (state.ending === 'illusion') return '88.0 MHz가 만든 하윤의 정체를 확인했다.';
  if (state.ending === 'erase') return '방송을 지웠지만 하윤에 대한 기억도 사라졌다.';
  if (state.ending) return '하윤과 함께 방송국을 빠져나왔다.';
  if (state.frequency.status !== 'solved') {
    const hasFrequencyTools = state.inventory.includes('handheld-radio') && state.inventory.includes('frequency-card');
    return hasFrequencyTools ? '송신실에서 하윤의 88.0 MHz 신호를 잡자.' : '입구와 로비를 조사해 88.0 MHz 장비를 모으자.';
  }
  if (state.breaker.status !== 'solved') return '전력실에서 구조용 회로 3개만 켜자.';
  if (state.recordings.status !== 'solved') return '보관실 테이프를 사건 순서대로 놓자.';
  if (state.flashlight.status !== 'solved') return '세 색의 광량을 맞춰 숨은 문을 열자.';
  if (state.finalStatement.status !== 'solved') return '심야 부스에서 거짓 방송 하나를 골라 빼자.';
  return '옥상으로 올라가 하윤을 찾자.';
}
function hint(): string {
  const currentAttempts = state.location === 'transmitter' ? state.frequency.attempts : state.location === 'power' ? state.breaker.attempts : state.location === 'archive' ? state.recordings.attempts : state.location === 'studio' ? state.flashlight.attempts : state.location === 'booth' ? state.finalStatement.attempts : 0;
  if (state.failedActions < 2 && currentAttempts < 1) return '장소를 가까이 보고 표시된 단서와 도구를 조사하자.';
  if (state.location === 'transmitter') return '88.0 MHz에 가까울수록 신호 막대와 하윤의 목소리가 강해진다.';
  if (state.location === 'power') return '옥상 안테나, 비상등, 스튜디오만 켜면 전력 3칸을 정확히 쓴다.';
  if (state.location === 'archive') return '폭풍 경보 → 하윤 도착 → 경고 녹음 → 기억 삭제 방송 순서다.';
  if (state.location === 'studio') return '청록 2, 호박 1, 빨강 3. 순서가 아니라 각 빛의 세기다.';
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
    ? spots.map((spot) => {
      const layout = HOTSPOT_LAYOUT[spot.id] ?? { x: 50, y: 50, scale: 1, rotate: 0 };
      const isItem = spot.reward.type === 'item';
      const visual = spot.reward.type === 'item'
        ? `<img src="${itemArt(spot.reward.id)}" alt="" draggable="false">`
        : '<i class="clue-paper" aria-hidden="true"><u></u><u></u><u></u></i>';
      return `<button class="physical-hotspot ${isItem ? 'item-prop' : 'clue-prop'}" style="--hotspot-x:${layout.x}%;--hotspot-y:${layout.y}%;--prop-scale:${layout.scale ?? 1};--prop-rotate:${layout.rotate ?? 0}deg" data-hotspot="${spot.id}" aria-label="${isItem ? '도구' : '기억 단서'} 찾기: ${escapeHtml(spot.label)}">${visual}<span>${isItem ? '도구' : '기억'}</span><b>${escapeHtml(spot.label)}</b></button>`;
    }).join('')
    : '';
  const puzzle = detailOpen ? puzzleMarkup() : '';
  return `<div class="scene-image ${sceneClass}" style="background-image:url('${art}')"></div><div class="rain" aria-hidden="true"></div><div class="vignette" aria-hidden="true"></div>
    ${detailOpen ? `<div class="scene-backdrop-exit" data-close-detail aria-hidden="true"></div><button class="back-to-scene" data-close-detail aria-label="가까이 보기에서 장소 전체로 돌아가기"><i aria-hidden="true">←</i> 뒤로</button>${state.found.size === 0 ? '<p class="detail-guide"><b>첫 조사</b> · 장면 속 도구 그림을 누르면 가방에 들어갑니다. 빈 배경을 누르면 돌아갑니다.</p>' : ''}${hotspotButtons}${puzzle}` : `<button class="inspect-area" data-open-detail><small>가까이 보기</small><strong>${puzzleEntryLabel()}</strong></button>`}`;
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
  if (location === 'transmitter') return frequencyDialMarkup(ready);
  if (location === 'power') return breakerPanelMarkup(ready);
  if (location === 'studio') return lightMixerMarkup(ready);
  const slots = Array.from({ length: meta.limit }, (_, index) => {
    const value = puzzleDraft[index];
    return `<button class="puzzle-slot ${value ? 'filled' : ''}" data-puzzle-remove="${index}" ${value ? `aria-label="${index + 1}번째 ${escapeHtml(optionLabel(meta.options, value))} 제거"` : 'disabled aria-label="빈 순서 칸"'}>${escapeHtml(optionLabel(meta.options, value) || '·')}</button>`;
  }).join('');
  const options = meta.options.map(([value, label]) => `<button class="puzzle-piece piece-${value}" data-puzzle-value="${value}" ${puzzleDraft.includes(value) ? 'disabled' : ''}><i aria-hidden="true"></i><b>${escapeHtml(label)}</b></button>`).join('');
  const evidence = `<ul class="puzzle-evidence">${meta.evidence.map((line) => `<li>${escapeHtml(line)}</li>`).join('')}</ul>`;
  return `<section class="puzzle-panel puzzle-${meta.key} ${ready ? '' : 'locked'} ${puzzle.attempts ? 'has-attempt' : ''}" data-puzzle="${meta.key}"><span>현장 퍼즐</span><h3>${meta.title}</h3><p>${meta.instruction}</p>${evidence}${!ready ? `<em>${puzzleRequirement(location)}</em>` : `<div class="puzzle-slots">${slots}</div><p class="slot-help">잘못 놓은 테이프는 위 순서 칸을 눌러 뺄 수 있다.</p><div class="puzzle-pieces">${options}</div><div class="puzzle-actions"><button data-puzzle-reset>모두 지우기</button><button data-puzzle-submit ${puzzleDraft.length !== meta.limit ? 'disabled' : ''}>장비 작동</button></div>`}${puzzle.feedback ? `<small class="puzzle-feedback">${escapeHtml(puzzle.feedback)}</small>` : ''}</section>`;
}
function evidenceMarkup(lines: readonly string[]): string { return `<ul class="puzzle-evidence">${lines.map((line) => `<li>${escapeHtml(line)}</li>`).join('')}</ul>`; }
function frequencyDialMarkup(ready: boolean): string {
  const meta = PUZZLE_META.transmitter;
  const puzzle = state.frequency;
  const value = Number(puzzleDraft[0] ?? 84);
  const strength = Math.max(0, 100 - Math.abs(88 - value) * 25);
  const heard = strength >= 95 ? '“오빠… 옥상… 들려?”' : strength >= 55 ? '“…빠… 옥… 들…”' : '치지직— 신호 없음';
  return `<section class="puzzle-panel frequency-console ${ready ? '' : 'locked'}"><span>직접 조작 · 다이얼</span><h3>${meta.title}</h3><p>${meta.instruction}</p>${evidenceMarkup(meta.evidence)}${!ready ? `<em>${puzzleRequirement('transmitter')}</em>` : `<div class="frequency-readout"><output data-frequency-output>${value.toFixed(1)} MHz</output><div class="wave-strength" style="--signal:${strength}%">${[20,40,60,80,100].map((threshold) => `<i class="${strength >= threshold ? 'lit' : ''}"></i>`).join('')}</div><blockquote data-frequency-voice>${heard}</blockquote></div><input class="frequency-range" data-frequency-range type="range" min="80" max="92" step="1" value="${value}" aria-label="주파수 다이얼"><button class="power-submit" data-puzzle-submit ${value !== 88 ? 'disabled' : ''}>이 주파수에 고정</button>${puzzle.feedback ? `<small class="puzzle-feedback">${escapeHtml(puzzle.feedback)}</small>` : ''}`}</section>`;
}
function breakerPanelMarkup(ready: boolean): string {
  const meta = PUZZLE_META.power;
  const puzzle = state.breaker;
  const active = new Set(puzzleDraft);
  const remaining = Math.max(0, 3 - active.size);
  return `<section class="puzzle-panel breaker-console ${ready ? '' : 'locked'}"><span>직접 조작 · 전력 선택</span><h3>${meta.title}</h3><p>${meta.instruction}</p>${evidenceMarkup(meta.evidence)}${!ready ? `<em>${puzzleRequirement('power')}</em>` : `<div class="power-budget"><b>남은 전력</b><strong>${'●'.repeat(remaining)}${'○'.repeat(3 - remaining)}</strong></div><div class="breaker-switches">${meta.options.map(([value,label]) => `<button data-breaker="${value}" class="${active.has(value) ? 'active' : ''}" aria-pressed="${active.has(value)}" ${!active.has(value) && active.size >= 3 ? 'disabled' : ''}><i></i><span>${label}</span></button>`).join('')}</div><button class="power-submit" data-puzzle-submit ${active.size !== 3 ? 'disabled' : ''}>비상 전력 투입</button>${puzzle.feedback ? `<small class="puzzle-feedback">${escapeHtml(puzzle.feedback)}</small>` : ''}`}</section>`;
}
function lightMixerMarkup(ready: boolean): string {
  const meta = PUZZLE_META.studio;
  const puzzle = state.flashlight;
  const levels = [0,1,2].map((index) => Number(puzzleDraft[index] ?? 0));
  const names = ['청록', '호박', '빨강'];
  const colors = ['cyan', 'amber', 'red'];
  const accuracy = levels.filter((level,index) => level === [2,1,3][index]).length;
  return `<section class="puzzle-panel light-console ${ready ? '' : 'locked'}" style="--cyan-level:${levels[0]};--amber-level:${levels[1]};--red-level:${levels[2]}"><span>직접 조작 · 빛 혼합</span><h3>${meta.title}</h3><p>${meta.instruction}</p>${evidenceMarkup(meta.evidence)}${!ready ? `<em>${puzzleRequirement('studio')}</em>` : `<div class="light-preview"><i></i><b data-light-status>${accuracy === 3 ? '문양 완성' : `문양 조각 ${accuracy}/3`}</b></div><div class="light-sliders">${levels.map((level,index) => `<label class="light-${colors[index]}"><span>${names[index]} <output data-light-output="${index}">${level}</output></span><input data-light-index="${index}" type="range" min="0" max="3" step="1" value="${level}"></label>`).join('')}</div><button class="power-submit" data-puzzle-submit ${accuracy !== 3 ? 'disabled' : ''}>숨은 문에 빛 쏘기</button>${puzzle.feedback ? `<small class="puzzle-feedback">${escapeHtml(puzzle.feedback)}</small>` : ''}`}</section>`;
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
function storyRecapMarkup(): string {
  const decisions = CLUES.map((clue) => {
    const choice = state.clueDecisions[clue.id];
    if (!choice) return '';
    return `<li><b>${escapeHtml(clue.title)}</b><span>${choice === 'record' ? '믿고 남김' : '방송이 만든 기억으로 의심함'}</span></li>`;
  }).join('');
  return `<aside class="story-recap"><span>옥상 앞 최종 정리</span><h4>지금까지 확인한 사실</h4><ul class="recap-facts"><li>출입 기록에 하윤은 없었다.</li><li>구조 음성은 과거 가족 통화의 파형을 이어 붙인 흔적이 있다.</li><li>23:58 사진은 하윤이 23:40 떠났다는 방송과 충돌한다.</li></ul><h4>내가 판단한 기억</h4><ul class="recap-decisions">${decisions || '<li><span>아직 판단한 기억이 없다.</span></li>'}</ul></aside>`;
}
function endingChoicesMarkup(): string {
  if (state.finalStatement.status !== 'solved') return '<section class="puzzle-panel locked"><h3>옥상 문이 잠겨 있다</h3><p>심야 부스에서 거짓 방송 하나를 먼저 빼자.</p></section>';
  const hasKey = state.inventory.includes('roof-key');
  if (!hasKey) return '<section class="puzzle-panel locked"><h3>하윤이 난간 끝에 있다</h3><p>사다리 옆에서 옥상 열쇠를 찾자.</p></section>';
  const choices = endingAvailability(state);
  const recap = storyRecapMarkup();
  if (choices.resolved < 2) return `<section class="puzzle-panel final-choice locked"><span>마지막 선택</span><h3>아직 어떤 기억을 믿을지 정하지 못했다</h3><p>방송국에서 찾은 기억을 두 개 이상 확인한 뒤 돌아오자.</p>${recap}</section>`;
  return `<section class="puzzle-panel final-choice"><span>마지막 선택 · 지금까지의 행동이 남긴 선택지</span><h3>난간 끝의 목소리를 어떻게 받아들일까?</h3>${recap}<button data-ending="restore" ${choices.restore ? '' : 'disabled'}>하윤의 기억을 믿고 송신기를 끈다${choices.restore ? '' : ' · 잠김: 기억을 2개 이상 믿어야 함'}</button><button data-ending="erase" ${choices.erase ? '' : 'disabled'}>모든 기록을 의심하고 지운다${choices.erase ? '' : ' · 잠김: 기억을 2개 이상 의심해야 함'}</button><button data-ending="human" ${choices.human ? '' : 'disabled'}>서로 다른 기억을 맞춰 보고 함께 내려간다${choices.human ? '' : ' · 잠김: 믿은 기억과 의심한 기억이 모두 필요함'}</button><button class="illusion-choice" data-ending="illusion" ${choices.illusion ? '' : 'disabled'}>88.0 MHz의 목소리가 어디서 왔는지 확인한다${choices.illusion ? '' : ' · 잠김: 세 기억을 모두 의심해야 함'}</button></section>`;
}
function toolBelt(): string {
  const tools = state.inventory.filter((id): id is ItemId => Boolean(ITEM_INFO[id]));
  return `<aside class="tool-belt" aria-label="현장 가방"><div class="bag-head"><b>현장 가방 · ${tools.length}개</b><button data-bag aria-label="가방 닫기">← 뒤로</button></div><div class="bag-items">${tools.length ? tools.map((id) => `<button data-inspect-item="${id}" aria-label="${escapeHtml(ITEM_INFO[id].name)} 크게 보고 조사 기록 읽기"><img src="${itemArt(id)}" alt=""><span><b>${escapeHtml(ITEM_INFO[id].name)}</b><small>${escapeHtml(ITEM_INFO[id].description)}</small><em>눌러서 크게 보기</em></span></button>`).join('') : '<span>아직 도구가 없다.</span>'}</div></aside>`;
}
function collectibleRevealMarkup(): string {
  if (!revealedItem) return '';
  const info = ITEM_INFO[revealedItem];
  return `<aside class="collectible-reveal" role="status"><img src="${itemArt(revealedItem)}" alt=""><div><small>새 도구 획득</small><b>${escapeHtml(info.name)}</b><span>${escapeHtml(info.description)}</span><em>${escapeHtml(info.pickupReaction)}</em></div></aside>`;
}
function itemDetailMarkup(): string {
  if (!selectedItem) return '';
  const info = ITEM_INFO[selectedItem];
  return `<aside class="screen-overlay item-detail" role="dialog" aria-modal="true" aria-labelledby="item-detail-title" data-backdrop="item"><section><button class="modal-back" data-close-item aria-label="아이템 상세 닫고 가방으로 돌아가기">← 가방으로</button><div class="item-art-stage"><img src="${itemArt(selectedItem)}" alt="${escapeHtml(info.name)} 확대 그림"></div><div class="item-copy"><small>현장 조사 기록</small><h2 id="item-detail-title">${escapeHtml(info.name)}</h2><p class="item-summary">${escapeHtml(info.description)}</p><hr><p>${escapeHtml(info.detail)}</p></div></section></aside>`;
}
function galleryMarkup(): string {
  if (!galleryOpen) return '';
  const cards = ENDINGS.map((ending) => {
    const info = ENDING_INFO[ending];
    const unlocked = unlockedEndings.has(ending);
    const art = ending === 'illusion' ? itemArt('sibling-photo') : asset('art/radio/roof.webp');
    return `<article class="ending-card ${unlocked ? 'unlocked' : 'locked'} ${ending === 'illusion' ? 'haunted' : ''}" style="--ending-art:url('${art}')"><div aria-hidden="true"></div><small>${unlocked ? escapeHtml(info.kicker) : 'ENDING ?? · 잠김'}</small><h3>${unlocked ? escapeHtml(info.title) : '아직 확인하지 않은 결말'}</h3><p>${unlocked ? escapeHtml(info.summary) : '다른 방식으로 기억을 판단하고 옥상에 도달하세요.'}</p></article>`;
  }).join('');
  return `<aside class="screen-overlay ending-gallery" role="dialog" aria-modal="true" aria-labelledby="gallery-title" data-backdrop="gallery"><section><button class="modal-back" data-close-gallery>← 메인으로</button><span>영구 기록 · ${unlockedEndings.size}/${ENDINGS.length}</span><h2 id="gallery-title">엔딩 갤러리</h2><p>진행을 초기화해도 확인한 결말은 이곳에 남습니다.</p><div class="ending-grid">${cards}</div></section></aside>`;
}
function jumpScareMarkup(): string {
  if (!jumpScareOpen) return '';
  return `<aside class="jump-scare" role="dialog" aria-modal="true" aria-label="없는 목소리 공포 장면" aria-live="assertive" tabindex="-1"><img src="${itemArt('sibling-photo')}" alt="사진 속 하윤의 얼굴이 화면 앞으로 다가온다"><div aria-hidden="true"></div><p>오빠… 나는 처음부터 없었어.</p></aside>`;
}
function rewardMarkup(): string {
  if (!rewardBeat) return '';
  return `<aside class="reward-beat ${rewardBeat.major ? 'major' : 'choice'}" role="status"><button data-dismiss-reward aria-label="보상 알림 닫기">×</button><small>${escapeHtml(rewardBeat.kicker)}</small><h2>${escapeHtml(rewardBeat.title)}</h2><p>${escapeHtml(rewardBeat.text)}</p>${rewardBeat.major ? '<div><i></i><i></i><i></i><i></i><i></i></div>' : ''}</aside>`;
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
  const info = ENDING_INFO[state.ending];
  const art = state.ending === 'illusion' ? itemArt('sibling-photo') : asset('art/radio/roof.webp');
  return `<section class="ending-screen ending-${state.ending}" style="background-image:linear-gradient(#02080ccc,#02080cee),url('${art}')"><div><small>${escapeHtml(info.kicker)}</small><h2>${escapeHtml(info.title)}</h2><p>${escapeHtml(state.message)}</p><b>${escapeHtml(info.summary)}</b><div class="ending-actions"><button data-gallery>엔딩 갤러리 ${unlockedEndings.size}/${ENDINGS.length}</button><button data-reset>처음부터 다시 하기</button></div></div></section>`;
}
function introMarkup(): string {
  return `<aside class="screen-overlay intro" role="dialog" aria-modal="true"><section><span>23:30 · 폭풍 속 해월 제7중계소</span><h2>자정까지 30분.<br>옥상의 하윤을 구하라.</h2><p class="intro-call">“오빠, 방송을 믿지 마. <b>88.0</b>을 찾아.”</p><p>전화가 끊겼다. 자정이 되면 방송은 하윤의 위치와 당신의 기억을 모두 지운다.</p><ol><li>장소를 옮겨 빛나는 물건을 찾는다.</li><li>서로 다른 네 장비를 직접 조작한다.</li><li>마지막 다섯 번째 퍼즐에서 거짓 방송을 판별하고 옥상으로 올라간다.</li></ol><small class="playtime-note">실시간 제한은 없습니다. 탐색 속도는 결말에 영향을 주지 않습니다.</small><small class="horror-note">공포 화면과 짧은 음성 연출이 포함됩니다.</small><div class="intro-actions"><button data-start>구조 신호 찾기</button><button data-gallery>엔딩 갤러리 ${unlockedEndings.size}/${ENDINGS.length}</button></div></section></aside>`;
}
function render(): void {
  const location = LOCATIONS[state.location];
  const openLocations = availableLocations(state);
  const placeNumber = LOCATION_ORDER.indexOf(state.location) + 1;
  const openLocationIndex = openLocations.indexOf(state.location);
  app.innerHTML = `<main class="game ${paused ? 'paused' : ''} ${detailOpen ? 'is-detail' : ''} ${state.ending ? 'has-ending' : ''}">
    <header class="game-header"><div class="brand"><span>해월 제7중계소 · 23:30</span><h1>자정 <em>주파수</em></h1></div><div class="header-objective"><span>현재 목표</span><strong>${objective()}</strong><div class="progress" aria-label="퍼즐 ${puzzleSolved()}/5 완료">${Array.from({ length: 5 }, (_, i) => `<i class="${i < puzzleSolved() ? 'done' : ''}"></i>`).join('')}</div><span class="mobile-signal" title="방송 신호 ${signalLabel()}" aria-label="방송 신호 ${signalLabel()}"><i class="${state.tension >= 35 ? 'lit' : ''}"></i><i class="${state.tension >= 65 ? 'lit' : ''}"></i><i class="${state.tension >= 90 ? 'lit' : ''}"></i></span></div><nav><i>● 저장됨</i><button data-journal>기억 ${state.clues.size}/3</button><button data-bag aria-expanded="${bagOpen}">가방 ${state.inventory.length}</button><button data-gallery>엔딩 ${unlockedEndings.size}/${ENDINGS.length}</button><button data-pause>${paused ? '계속' : '멈춤'}</button></nav></header>
    <section class="viewport" aria-label="${escapeHtml(location.title)}"><div class="place"><small>장소 ${String(placeNumber).padStart(2, '0')} · ${openLocations.length}/10 열림</small><h2>${escapeHtml(location.title)}</h2><p>${escapeHtml(location.subtitle)}</p></div>${sceneMarkup()}
      ${!detailOpen ? `<button class="turn left" data-turn="-1" aria-label="${openLocationIndex > 0 ? '이전 장소' : '이전 장소 없음'}" ${openLocationIndex > 0 ? '' : 'disabled'}>‹<span>이전</span></button><button class="turn right" data-turn="1" aria-label="${openLocationIndex < openLocations.length - 1 ? '다음 장소' : '다음 장소 없음'}" ${openLocationIndex < openLocations.length - 1 ? '' : 'disabled'}>›<span>다음</span></button>` : ''}
      <p class="message" role="status">${escapeHtml(state.message)}</p><div class="signal"><span>방송 신호 · ${signalLabel()}</span><b><i style="width:${state.tension}%"></i></b></div>
    </section>
    <p class="field-hint"><b>현장 힌트</b>${hint()}</p>${bagOpen ? `<div class="bag-backdrop" data-close-bag aria-hidden="true"></div>${toolBelt()}` : ''}
    ${collectibleRevealMarkup()}${rewardMarkup()}${journalOpen ? journalMarkup() : ''}${state.pendingClue ? memoryChoiceMarkup() : ''}${introOpen ? introMarkup() : ''}${paused ? '<aside class="pause-card"><span>조사 멈춤</span><button data-pause>계속하기</button><button data-reset>진행 초기화</button></aside>' : ''}${endingMarkup()}${itemDetailMarkup()}${galleryMarkup()}${jumpScareMarkup()}
  </main>`;
  bind();
  const modalFocusTarget = jumpScareOpen ? '.jump-scare' : selectedItem ? '[data-close-item]' : galleryOpen ? '[data-close-gallery]' : state.pendingClue ? '[data-memory]' : introOpen ? '[data-start]' : journalOpen ? '[data-journal].overlay-close' : paused ? '.pause-card [data-pause]' : state.ending ? '[data-gallery]' : detailOpen ? '[data-close-detail]' : '';
  const focusTarget = modalFocusTarget || restoreFocusSelector;
  if (focusTarget) document.querySelector<HTMLElement>(focusTarget)?.focus();
  if (!modalFocusTarget) restoreFocusSelector = '';
}

function trapModalFocus(event: KeyboardEvent): boolean {
  if (event.key !== 'Tab') return false;
  const modals = document.querySelectorAll<HTMLElement>('.screen-overlay, .pause-card, .ending-screen, .jump-scare');
  const modal = modals[modals.length - 1];
  if (!modal) return false;
  const focusable = [...modal.querySelectorAll<HTMLElement>('button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])')];
  if (!focusable.length) {
    if (modal.matches('.jump-scare')) { modal.focus(); event.preventDefault(); return true; }
    return false;
  }
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
  const currentPuzzle = state.location === 'transmitter' ? next.frequency : state.location === 'power' ? next.breaker : state.location === 'archive' ? next.recordings : next.flashlight;
  commit(next, currentPuzzle.status !== 'solved');
}
function dismissReveal(): void {
  revealedItem = null;
  if (revealTimer) window.clearTimeout(revealTimer);
  revealTimer = undefined;
}
function dismissReward(): void {
  rewardBeat = null;
  if (rewardTimer) window.clearTimeout(rewardTimer);
  rewardTimer = undefined;
}
function showReward(stage: number): void {
  const titles = ['목소리 신호 포착', '비상 전력 복구', '사건 순서 복원', '숨은 통로 개방', '거짓 방송 제거'];
  dismissReward();
  rewardBeat = { kicker: `옥상 신호 복구 ${stage}/5`, title: titles[stage - 1] ?? '경로 개방', text: state.message, major: true };
  rewardTimer = window.setTimeout(() => { rewardBeat = null; rewardTimer = undefined; render(); }, 3300);
}
function resetGame(): void {
  if (!confirm('현재 진행을 모두 지우고 처음부터 시작할까요?')) return;
  dismissReveal(); dismissReward();
  localStorage.removeItem(SAVE_KEY);
  for (const key of LEGACY_KEYS) localStorage.removeItem(key);
  if (scareTimer) window.clearTimeout(scareTimer);
  state = initialState(); detailOpen = false; journalOpen = false; bagOpen = false; paused = false; galleryOpen = false; selectedItem = null; jumpScareOpen = false; introOpen = true; puzzleDraft = []; render();
}
function closeItemDetail(): void { selectedItem = null; render(); }
function closeGallery(): void { galleryOpen = false; render(); }
function closeJumpScare(): void {
  jumpScareOpen = false;
  if (scareTimer) window.clearTimeout(scareTimer);
  scareTimer = undefined;
  render();
}
function closeSceneDetail(): void {
  detailOpen = false;
  puzzleDraft = [];
  restoreFocusSelector = '[data-open-detail]';
  render();
}
function closeBag(): void {
  bagOpen = false;
  restoreFocusSelector = 'header [data-bag]';
  render();
}
function bind(): void {
  document.querySelectorAll<HTMLElement>('[data-turn]').forEach((button) => button.onclick = () => { dismissReveal(); detailOpen = false; puzzleDraft = []; commit(move(state, Number(button.dataset.turn) as -1 | 1)); });
  document.querySelector<HTMLElement>('[data-open-detail]')?.addEventListener('click', () => { restoreFocusSelector = '[data-open-detail]'; detailOpen = true; puzzleDraft = []; render(); });
  document.querySelectorAll<HTMLElement>('[data-close-detail]').forEach((element) => element.addEventListener('click', closeSceneDetail));
  document.querySelectorAll<HTMLElement>('[data-hotspot]').forEach((button) => button.onclick = () => {
    const spot = visibleHotspots(state).find((candidate) => candidate.id === button.dataset.hotspot);
    if (spot?.reward.type === 'item') {
      revealedItem = spot.reward.id;
      if (revealTimer) window.clearTimeout(revealTimer);
      revealTimer = window.setTimeout(() => { revealedItem = null; revealTimer = undefined; render(); }, 4200);
    }
    restoreFocusSelector = '[data-close-detail]'; commit(inspectHotspot(state, button.dataset.hotspot!), true);
  });
  document.querySelectorAll<HTMLElement>('[data-inspect-item]').forEach((button) => button.onclick = () => {
    const id = button.dataset.inspectItem as ItemId;
    dismissReveal(); restoreFocusSelector = `[data-inspect-item="${id}"]`; selectedItem = id; state = inspect(state, id); save(); render();
  });
  document.querySelectorAll<HTMLElement>('[data-puzzle-value]').forEach((button) => button.onclick = () => { const value = button.dataset.puzzleValue!; if (!puzzleDraft.includes(value)) puzzleDraft.push(value); render(); });
  document.querySelectorAll<HTMLElement>('[data-puzzle-remove]').forEach((button) => button.onclick = () => { puzzleDraft.splice(Number(button.dataset.puzzleRemove), 1); render(); });
  document.querySelector<HTMLInputElement>('[data-frequency-range]')?.addEventListener('input', (event) => {
    const input = event.currentTarget as HTMLInputElement; puzzleDraft = [input.value];
    const value = Number(input.value); const strength = Math.max(0, 100 - Math.abs(88 - value) * 25);
    const panel = input.closest<HTMLElement>('.frequency-console');
    const output = panel?.querySelector<HTMLOutputElement>('[data-frequency-output]'); if (output) output.value = `${value.toFixed(1)} MHz`;
    const voice = panel?.querySelector<HTMLElement>('[data-frequency-voice]'); if (voice) voice.textContent = strength >= 95 ? '“오빠… 옥상… 들려?”' : strength >= 55 ? '“…빠… 옥… 들…”' : '치지직— 신호 없음';
    panel?.querySelectorAll<HTMLElement>('.wave-strength i').forEach((bar,index) => bar.classList.toggle('lit', strength >= (index + 1) * 20));
    const submit = panel?.querySelector<HTMLButtonElement>('[data-puzzle-submit]'); if (submit) submit.disabled = value !== 88;
  });
  document.querySelectorAll<HTMLButtonElement>('[data-breaker]').forEach((button) => button.onclick = () => {
    const value = button.dataset.breaker!; puzzleDraft = puzzleDraft.includes(value) ? puzzleDraft.filter((entry) => entry !== value) : [...puzzleDraft, value]; render();
  });
  document.querySelectorAll<HTMLInputElement>('[data-light-index]').forEach((input) => input.addEventListener('input', (event) => {
    const slider = event.currentTarget as HTMLInputElement; const index = Number(slider.dataset.lightIndex);
    puzzleDraft = [0,1,2].map((position) => position === index ? slider.value : puzzleDraft[position] ?? '0');
    const panel = slider.closest<HTMLElement>('.light-console'); const keys = ['cyan','amber','red'];
    panel?.style.setProperty(`--${keys[index]}-level`, slider.value);
    const output = panel?.querySelector<HTMLOutputElement>(`[data-light-output="${index}"]`); if (output) output.value = slider.value;
    const accuracy = puzzleDraft.filter((value,position) => Number(value) === [2,1,3][position]).length;
    const status = panel?.querySelector<HTMLElement>('[data-light-status]'); if (status) status.textContent = accuracy === 3 ? '문양 완성' : `문양 조각 ${accuracy}/3`;
    const submit = panel?.querySelector<HTMLButtonElement>('[data-puzzle-submit]'); if (submit) submit.disabled = accuracy !== 3;
  }));
  document.querySelector<HTMLElement>('[data-puzzle-reset]')?.addEventListener('click', () => { puzzleDraft = []; render(); });
  document.querySelector<HTMLElement>('[data-puzzle-submit]')?.addEventListener('click', attemptCurrentPuzzle);
  document.querySelectorAll<HTMLElement>('[data-statement]').forEach((button) => button.onclick = () => commit(chooseFinalStatement(state, Number(button.dataset.statement)), true));
  document.querySelectorAll<HTMLElement>('[data-ending]').forEach((button) => button.onclick = () => {
    const next = chooseEnding(state, button.dataset.ending as Ending);
    if (next.ending === 'illusion' && state.ending !== 'illusion') {
      playIllusionSound(); jumpScareOpen = true;
      if (scareTimer) window.clearTimeout(scareTimer);
      scareTimer = window.setTimeout(() => { jumpScareOpen = false; scareTimer = undefined; render(); }, 2600);
    }
    commit(next);
  });
  document.querySelectorAll<HTMLElement>('[data-memory]').forEach((button) => button.onclick = () => {
    const action = button.dataset.memory as EditorialAction; const next = resolveEditorialChoice(state, action, false);
    dismissReward(); rewardBeat = { kicker: '선택이 즉시 신호를 바꿨다', title: action === 'record' ? '기억을 믿었다' : '기억을 의심했다', text: next.message, major: false };
    rewardTimer = window.setTimeout(() => { rewardBeat = null; rewardTimer = undefined; render(); }, 2800); commit(next, true);
  });
  document.querySelector<HTMLElement>('[data-dismiss-reward]')?.addEventListener('click', () => { dismissReward(); render(); });
  document.querySelector<HTMLElement>('[data-cancel-memory]')?.addEventListener('click', () => commit(cancelPendingClue(state), true));
  document.querySelectorAll<HTMLElement>('[data-journal]').forEach((button) => button.onclick = () => { dismissReveal(); if (!journalOpen) restoreFocusSelector = 'header [data-journal]'; journalOpen = !journalOpen; render(); });
  document.querySelectorAll<HTMLElement>('[data-bag]').forEach((button) => button.onclick = () => { dismissReveal(); if (bagOpen) closeBag(); else { bagOpen = true; restoreFocusSelector = '.bag-head [data-bag]'; render(); } });
  document.querySelector<HTMLElement>('[data-close-bag]')?.addEventListener('click', closeBag);
  document.querySelectorAll<HTMLElement>('[data-pause]').forEach((button) => button.onclick = () => { dismissReveal(); if (!paused) restoreFocusSelector = 'header [data-pause]'; paused = !paused; render(); });
  document.querySelectorAll<HTMLElement>('[data-gallery]').forEach((button) => button.onclick = () => { if (!galleryOpen) restoreFocusSelector = '[data-gallery]'; galleryOpen = !galleryOpen; render(); });
  document.querySelector<HTMLElement>('[data-close-gallery]')?.addEventListener('click', closeGallery);
  document.querySelector<HTMLElement>('[data-close-item]')?.addEventListener('click', closeItemDetail);
  document.querySelectorAll<HTMLElement>('[data-backdrop]').forEach((backdrop) => backdrop.onclick = (event) => {
    if (event.target !== event.currentTarget) return;
    if (backdrop.dataset.backdrop === 'item') closeItemDetail(); else closeGallery();
  });
  document.querySelectorAll<HTMLElement>('[data-reset]').forEach((button) => button.onclick = resetGame);
  document.querySelector<HTMLElement>('[data-start]')?.addEventListener('click', () => { restoreFocusSelector = '[data-open-detail]'; introOpen = false; sessionStorage.setItem('midnight-frequency-intro-seen', '1'); render(); });
}
window.addEventListener('keydown', (event) => {
  if (trapModalFocus(event)) return;
  if (jumpScareOpen) { if (event.key === 'Escape') closeJumpScare(); return; }
  if (selectedItem) { if (event.key === 'Escape') closeItemDetail(); return; }
  if (galleryOpen) { if (event.key === 'Escape') closeGallery(); return; }
  if (state.pendingClue) { if (event.key === 'Escape') commit(cancelPendingClue(state), true); return; }
  if (introOpen) { if (event.key === 'Escape') { restoreFocusSelector = '[data-open-detail]'; introOpen = false; sessionStorage.setItem('midnight-frequency-intro-seen', '1'); render(); } return; }
  if (journalOpen) { if (event.key === 'Escape') { journalOpen = false; render(); } return; }
  if (bagOpen) { if (event.key === 'Escape') { bagOpen = false; render(); } return; }
  if (paused) { if (event.key === 'Escape') { paused = false; render(); } return; }
  if (state.ending) return;
  if (event.key === 'Escape' && detailOpen) { closeSceneDetail(); return; }
  if (!detailOpen && (event.key.toLowerCase() === 'a' || event.key === 'ArrowLeft')) { dismissReveal(); commit(move(state, -1)); }
  if (!detailOpen && (event.key.toLowerCase() === 'd' || event.key === 'ArrowRight')) { dismissReveal(); commit(move(state, 1)); }
});
render();
