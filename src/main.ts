import './style.css';
import { stationSoundscape } from './soundscape';
import {
  CLUES,
  FINAL_STATEMENTS,
  ITEM_INFO,
  LOCATION_ORDER,
  LOCATIONS,
  ROUTE_LEADS,
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
  investigationProgress,
  move,
  resolveEditorialChoice,
  routeStatus,
  selectFlashlightFilter,
  serialize,
  visibleHotspots,
  type EditorialAction,
  type Ending,
  type GameState,
  type ItemId,
} from './engine';

const SAVE_KEY = 'midnight-frequency-v11';
const GALLERY_KEY = 'midnight-frequency-endings-v1';
const SIDE_NAV_TUTORIAL_KEY = 'midnight-frequency-side-nav-tutorial-v1';
const LEGACY_KEYS = ['midnight-frequency-v10', 'midnight-frequency-v9', 'midnight-frequency-v8', 'midnight-frequency-v7', 'unwritten-village-submission-v6', 'unwritten-village-submission-v5'];
const app = document.querySelector<HTMLDivElement>('#app')!;
type StorageKind = 'local' | 'session';
function browserStorage(kind: StorageKind): Storage | null {
  try { return kind === 'local' ? window.localStorage : window.sessionStorage; } catch { return null; }
}
function storageGet(kind: StorageKind, key: string): string | null {
  try { return browserStorage(kind)?.getItem(key) ?? null; } catch { return null; }
}
function storageSet(kind: StorageKind, key: string, value: string): void {
  try { browserStorage(kind)?.setItem(key, value); } catch { /* Restricted storage must not block play. */ }
}
function storageRemove(kind: StorageKind, key: string): void {
  try { browserStorage(kind)?.removeItem(key); } catch { /* Restricted storage must not block play. */ }
}

const ENDING_INFO: Record<Ending, { kicker: string; title: string; summary: string }> = {
  restore: { kicker: 'ENDING 01 · 구조', title: '합성 음성 너머의 하윤을 구조했다', summary: '가짜 호출은 버리고 사진·원본 릴·발자국을 따라 옥상의 실제 하윤을 구조했다. 송신기는 파괴돼 실험 기록 일부는 사라졌다.' },
  erase: { kicker: 'ENDING 02 · 잃은 기억', title: '원본까지 지워 하윤을 놓쳤다', summary: '합성과 원본을 구분하지 않고 모두 지웠다. 방송은 멈췄지만 하윤의 실제 경고와 찾아온 이유도 손상됐다.' },
  human: { kicker: 'ENDING 03 · 공개 방송', title: '비상망에 비교 증거를 송출했다', summary: '실제 경고 릴, 합성 파형, 사진·출입 시각을 한 묶음으로 보냈다. 외부 수신국이 두 사람을 구조하고 음성 조작 실험을 확인했다.' },
  illusion: { kicker: 'ENDING 04 · 오판', title: '실제 하윤을 합성 음성으로 오인했다', summary: '모든 흔적을 조작으로 분류한 결과 옥상의 실제 하윤에게 다가가지 않았다. 방송은 사람을 허상으로 보게 만드는 데 성공했다.' },
};
const ENDINGS = Object.keys(ENDING_INFO) as Ending[];
const ENDING_STORY: Record<Ending, { art: string; quote: string; beats: string[] }> = {
  restore: {
    art: 'ending-restore.webp',
    quote: '“가짜 목소리가 아니라, 네 숨을 따라왔어.”',
    beats: [
      '23:58 사진, 23:55 원본 릴, 정비 통로의 젖은 발자국이 같은 옥상을 가리켰다. 합성 호출이 아니라 서로 독립된 세 물리 증거였다.',
      '송신기를 부수자 숨 없는 88.0 호출이 끊겼다. 난간 아래 하윤의 실제 숨과 비에 젖은 옷자락만 남았고, 나는 그 손을 잡았다.',
      '00:07. 산길 아래 구조 차량의 불빛이 안개를 갈랐다. 뒤에서 중계소가 완전히 어두워졌지만, 맞잡은 손의 온도만은 지워지지 않았다.',
    ],
  },
  erase: {
    art: 'ending-erase.webp',
    quote: '“내가 여기까지 누구를 찾으러 왔더라.”',
    beats: [
      '23:59. 합성 파형만 지우려던 삭제가 사진 시각, 실제 경고 릴, 통로 기록까지 번졌다. 원본과 복제본을 분리하지 않은 대가였다.',
      '옥상 인터폰에는 하윤의 연속된 숨이 남아 있었지만, 그 숨을 찾아야 할 이유가 떠오르지 않았다. 마이크는 한 번 숨을 들이켠 뒤 침묵했다.',
      '새벽 구조대는 혼자 앉아 있는 나를 발견했다. 손에는 빈 사진 한 장뿐이었고, 산을 내려오는 내내 한 자리가 비어 있다는 사실만 설명할 수 없었다.',
    ],
  },
  human: {
    art: 'ending-human.webp',
    quote: '“진짜와 가짜를 나란히 보내면, 밖에서도 구별할 수 있어.”',
    beats: [
      '23:57. 23:55 실제 경고 릴, 과거 통화를 잘라 만든 합성 파형, 23:58 사진과 정문 시각을 하나의 증거 묶음으로 만들었다.',
      '실제 릴에는 숨·비·방 잔향이 있었고 합성본에는 절단 잡음만 있었다. 둘을 나란히 88.0 비상망에 보내 외부 수신자가 직접 비교할 수 있게 했다.',
      '00:03. 산 아래 아마추어 무선국 세 곳이 신호를 받아 위치를 역추적했고 구조대가 옥상으로 향했다. 두 사람은 구조됐고, 파형·시각·동선은 공명 복원 실험의 외부 증거가 됐다.',
    ],
  },
  illusion: {
    art: 'hayun-jumpscare.webp',
    quote: '“오빠, 숨이 들리는데도 내가 가짜로 보여?”',
    beats: [ENDING_INFO.illusion.summary],
  },
};

let state = load();
let detailOpen = false;
let journalOpen = false;
let bagOpen = false;
let paused = false;
let galleryOpen = false;
let replayEnding: Ending | null = null;
let sideNavTutorialOpen = storageGet('local', SIDE_NAV_TUTORIAL_KEY) !== 'seen';
let selectedItem: ItemId | null = null;
let jumpScareOpen = false;
let introOpen = !storageGet('session', 'midnight-frequency-intro-seen');
let puzzleDraft: string[] = [];
let restoreFocusSelector = '';
let revealedItem: ItemId | null = null;
let revealTimer: number | undefined;
let rewardBeat: { kicker: string; title: string; text: string; major: boolean } | null = null;
let rewardTimer: number | undefined;
let scareTimer: number | undefined;
let jumpScareRequestedFullscreen = false;
let rotationPromptDismissed = storageGet('session', 'midnight-frequency-rotation-dismissed') === '1';
let orientationNotice = '';
const unlockedEndings = loadUnlockedEndings();
const jumpScareAudio = new Audio(asset('audio/hayun-jumpscare.mp3'));
jumpScareAudio.preload = 'auto';
jumpScareAudio.volume = .95;
jumpScareAudio.load();
const imagePreloads = [
  ...(Object.keys(ITEM_INFO) as ItemId[]).map((id) => itemArt(id)),
  ...ENDINGS.map((ending) => asset(`art/radio/${ENDING_STORY[ending].art}`)),
].map((src) => {
  const image = new Image();
  image.decoding = 'async';
  image.fetchPriority = 'high';
  image.src = src;
  void image.decode().catch(() => { /* Normal image loading remains the fallback. */ });
  return image;
});
void imagePreloads;
function primeSoundscape(): void { void stationSoundscape.start().catch(() => { /* Visual play remains complete if Web Audio is unavailable. */ }); }
window.addEventListener('pointerdown', primeSoundscape, { once: true, capture: true });
window.addEventListener('keydown', primeSoundscape, { once: true, capture: true });

type LockableOrientation = ScreenOrientation & { lock?: (orientation: 'landscape') => Promise<void>; unlock?: () => void };
function fullscreenActive(): boolean { return Boolean(document.fullscreenElement); }
function phoneLayoutActive(): boolean {
  return window.matchMedia('(max-width:760px), (max-width:980px) and (max-height:520px)').matches;
}
function refreshOrientationUi(): void {
  const active = fullscreenActive();
  document.querySelectorAll<HTMLElement>('[data-landscape]').forEach((button) => {
    button.textContent = active ? '창모드' : '가로 전체';
    button.setAttribute('aria-label', active ? '전체화면 종료' : '가로 전체화면 전환');
  });
  document.querySelector('.rotation-prompt')?.remove();
  let notice = document.querySelector<HTMLElement>('.orientation-notice');
  if (!orientationNotice || phoneLayoutActive()) {
    notice?.remove();
    return;
  }
  if (!notice) {
    notice = document.createElement('p');
    notice.className = 'orientation-notice';
    notice.setAttribute('role', 'status');
    document.querySelector('.game')?.append(notice);
  }
  notice.textContent = orientationNotice;
}
async function toggleLandscapeMode(): Promise<void> {
  if (fullscreenActive()) {
    try { (screen.orientation as LockableOrientation).unlock?.(); } catch { /* Unlock support varies. */ }
    await document.exitFullscreen().catch(() => { /* The browser may already have exited. */ });
    orientationNotice = '전체화면을 종료했습니다.';
    refreshOrientationUi();
    return;
  }
  try {
    await document.documentElement.requestFullscreen();
    const orientation = screen.orientation as LockableOrientation;
    if (orientation.lock) {
      await orientation.lock('landscape');
      orientationNotice = '가로 전체화면으로 전환했습니다.';
    } else {
      orientationNotice = phoneLayoutActive() ? '' : '전체화면입니다. 기기를 직접 가로로 돌려 주세요.';
    }
  } catch {
    orientationNotice = phoneLayoutActive() ? '' : '이 브라우저는 가로 잠금을 허용하지 않습니다. 기기를 직접 가로로 돌려 주세요.';
  }
  rotationPromptDismissed = true;
  storageSet('session', 'midnight-frequency-rotation-dismissed', '1');
  refreshOrientationUi();
}
function rotationPromptMarkup(): string {
  if (rotationPromptDismissed) return '';
  return '<aside class="rotation-prompt" role="dialog" aria-label="가로 화면 권장"><b>폰에서는 가로 화면을 권장합니다</b><p>장면과 퍼즐을 더 넓게 보려면 가로 전체화면으로 전환하세요.</p><div><button data-landscape>가로 전체화면</button><button data-dismiss-rotation>세로로 계속</button></div></aside>';
}
const phoneLandscapeQuery = window.matchMedia('(max-width:980px) and (orientation:landscape) and (max-height:520px)');
phoneLandscapeQuery.addEventListener('change', (event) => {
  if (!event.matches || !orientationNotice) return;
  orientationNotice = '';
  document.querySelector('.orientation-notice')?.remove();
});

const PUZZLE_META = {
  transmitter: {
    key: 'frequency', title: '합성 호출 주파수', instruction: '88.0을 고정한 뒤, 목소리에 숨과 방 잔향이 있는지 확인하자.',
    evidence: ['정비 카드는 88.0이 과거에도 같은 가족 음성을 만들었다고 기록한다.', '합성 호출에는 단어 사이 숨과 방 잔향이 없다.', '실제 전화는 “목소리보다 숨을 확인해”라고 경고했다.'],
    options: [] as readonly (readonly [string, string])[], limit: 1,
  },
  power: {
    key: 'breaker', title: '비상 전력 분배', instruction: '남은 전력 3칸으로 구조에 꼭 필요한 회로만 켜자.',
    evidence: ['옥상 안테나가 신호를 보낸다.', '비상등이 탈출로를 밝힌다.', '스튜디오에서 하윤의 원본 녹음을 찾을 수 있다.'],
    options: [['antenna', '옥상 안테나'], ['emergency', '비상등'], ['studio', '스튜디오'], ['heating', '난방'], ['sign', '외부 간판']], limit: 3,
  },
  archive: {
    key: 'recordings', title: '순서가 뒤섞인 녹음', instruction: '네 테이프 속 시각을 비교해 사건 순서대로 릴에 걸자.',
    evidence: ['자동 방송 재가동 · 23:30', '오빠의 정문 입장 · 23:42', '숨과 잔향이 있는 실제 경고 · 23:55', '기억 덮어쓰기 예정 · 00:00'],
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
    const parsed: unknown = JSON.parse(storageGet('local', GALLERY_KEY) ?? '[]');
    if (Array.isArray(parsed)) return new Set(parsed.filter((ending): ending is Ending => typeof ending === 'string' && ENDINGS.includes(ending as Ending)));
  } catch {
    // A malformed gallery never blocks the game.
  }
  return new Set();
}
function unlockEnding(ending: Ending): void {
  unlockedEndings.add(ending);
  storageSet('local', GALLERY_KEY, JSON.stringify([...unlockedEndings]));
}
function playJumpScareSound(): void {
  if (!stationSoundscape.isEnabled()) return;
  jumpScareAudio.pause();
  jumpScareAudio.currentTime = .085;
  void jumpScareAudio.play().catch(() => { /* The ending remains readable if playback is blocked. */ });
}
function stopJumpScareSound(): void {
  jumpScareAudio.pause();
  jumpScareAudio.currentTime = .085;
}
function enterJumpScareFullscreen(): void {
  if (document.fullscreenElement || !document.documentElement.requestFullscreen) return;
  jumpScareRequestedFullscreen = true;
  void document.documentElement.requestFullscreen().catch(() => { jumpScareRequestedFullscreen = false; });
}
function leaveJumpScareFullscreen(): void {
  if (jumpScareRequestedFullscreen && document.fullscreenElement) void document.exitFullscreen().catch(() => {});
  jumpScareRequestedFullscreen = false;
}

function load(): GameState {
  try {
    const current = storageGet('local', SAVE_KEY);
    if (current) return deserialize(current);
    for (const key of LEGACY_KEYS) storageRemove('local', key);
  } catch {
    // Broken and old saves safely start over.
  }
  return initialState();
}

function save(): void { storageSet('local', SAVE_KEY, serialize(state)); }
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
function puzzleSolvedFor(value: GameState): number { return investigationProgress(value); }
function puzzleSolved(): number { return puzzleSolvedFor(state); }
function objective(): string {
  if (state.ending === 'illusion') return '88.0 MHz가 만든 하윤의 정체를 확인했다.';
  if (state.ending === 'erase') return '방송을 지웠지만 하윤에 대한 기억도 사라졌다.';
  if (state.ending) return '하윤과 함께 방송국을 빠져나왔다.';
  if (state.frequency.status !== 'solved') {
    const hasFrequencyTools = state.inventory.includes('handheld-radio') && state.inventory.includes('frequency-card');
    return hasFrequencyTools ? '송신실에서 하윤의 88.0 MHz 신호를 잡자.' : '입구와 로비를 조사해 88.0 MHz 장비를 모으자.';
  }
  if (state.frequency.status === 'solved' && routeStatus(state).solved < 2) return `세 갈래 조사 중 ${2 - routeStatus(state).solved}곳을 더 확인하자.`;
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
function signalMood(): 'signal-calm' | 'signal-unstable' | 'signal-danger' {
  const decisions = Object.keys(state.clueDecisions).length;
  if (state.tension >= 70 || decisions >= 3) return 'signal-danger';
  if (state.tension >= 35 || decisions >= 1) return 'signal-unstable';
  return 'signal-calm';
}

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
  const openLocations = availableLocations(state);
  const locationIndex = openLocations.indexOf(state.location);
  const sideNavigation = detailOpen ? '' : `<button class="scene-nav-zone left ${sideNavTutorialOpen ? 'tutorial' : ''}" data-turn="-1" tabindex="-1" aria-hidden="true" ${locationIndex > 0 ? '' : 'disabled'}><span>화면 왼쪽 영역<br><b>이전 장소</b></span></button><button class="scene-nav-zone right ${sideNavTutorialOpen ? 'tutorial' : ''}" data-turn="1" tabindex="-1" aria-hidden="true" ${locationIndex < openLocations.length - 1 ? '' : 'disabled'}><span>화면 오른쪽 영역<br><b>다음 장소</b></span></button>${sideNavTutorialOpen ? '<p class="side-nav-guide"><b>이동 튜토리얼</b> · 화면 왼쪽 또는 오른쪽 가장자리의 어두운 영역을 아무 곳이나 누르세요.</p>' : ''}`;
  return `<div class="scene-image ${sceneClass}" style="background-image:url('${art}')"></div><div class="rain" aria-hidden="true"></div><div class="vignette" aria-hidden="true"></div>${routeBoardMarkup()}
    ${sideNavigation}${detailOpen ? `<div class="scene-backdrop-exit" data-close-detail aria-hidden="true"></div><p class="backdrop-dismiss-hint scene-dismiss-hint" aria-hidden="true">바깥 화면을 눌러서 나가기</p><button class="back-to-scene" data-close-detail aria-label="가까이 보기에서 장소 전체로 돌아가기"><i aria-hidden="true">←</i> 뒤로</button>${state.found.size === 0 ? '<p class="detail-guide"><b>첫 조사</b> · 장면 속 도구 그림을 누르면 가방에 들어갑니다. 빈 배경을 누르면 돌아갑니다.</p>' : ''}${hotspotButtons}${puzzle}` : `<button class="inspect-area" data-open-detail><small>가까이 보기</small><strong>${puzzleEntryLabel()}</strong></button>`}`;
}
function routeBoardMarkup(): string {
  if (state.frequency.status !== 'solved' || routeStatus(state).solved >= 2) return '';
  const status = routeStatus(state);
  const cards = ROUTE_LEADS.map((route) => {
    const solved = status.order.includes(route.id);
    return `<article class="route-card ${solved ? 'solved' : ''}"><span>${solved ? `조사 ${status.order.indexOf(route.id) + 1}순위` : '병렬 조사 가능'}</span><h3>${escapeHtml(route.title)}</h3><p>${escapeHtml(route.detail)}</p><small>${escapeHtml(route.evidence)}</small></article>`;
  }).join('');
  return `<aside class="route-board" aria-label="병렬 조사 경로"><b>다음 단계 · 세 단서 중 두 곳</b><p>전력실·보관실·녹음실 중 원하는 순서로 두 곳을 해결하면 숨은 통로가 열린다.</p><div>${cards}</div></aside>`;
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
  if (location === 'archive') return state.frequency.status === 'solved' && state.inventory.includes('recording-reel') && state.inventory.includes('station-log');
  return state.frequency.status === 'solved' && state.inventory.includes('flashlight') && state.inventory.includes('color-filters');
}
function puzzleRequirement(location: PuzzleLocation): string {
  if (location === 'transmitter') return '휴대 라디오와 주파수 카드를 먼저 찾자.';
  if (location === 'power') return '송신실 퍼즐을 풀고 절연 장갑과 차단기 열쇠를 찾자.';
  if (location === 'archive') return '주파수를 맞춘 뒤 녹음 릴과 방송국 일지를 찾자.';
  return '주파수를 맞춘 뒤 손전등과 색 필터를 찾자.';
}
function finalPuzzleMarkup(): string {
  if (state.finalStatement.status === 'solved') return `<section class="puzzle-panel solved"><span>거짓 방송 제거 완료</span><h3>옥상 문이 열렸다</h3><p>${escapeHtml(state.finalStatement.feedback)}</p></section>`;
  const ready = routeStatus(state).solved >= 2 && state.inventory.includes('memory-tape') && state.inventory.includes('sibling-photo') && state.clues.has('false-script');
  return `<section class="puzzle-panel final-puzzle ${ready ? '' : 'locked'} ${state.finalStatement.attempts ? 'has-attempt' : ''}"><span>마지막 판별</span><h3>거짓 방송 하나 빼기</h3><p>사진의 시각, 기억 테이프, 방송 기록과 충돌하는 문장을 골라 송신기에서 빼자.</p>${ready ? `<div class="evidence-check"><b>사진</b><b>테이프</b><b>방송 기록</b></div><div class="statement-stack">${FINAL_STATEMENTS.map((text, index) => `<button data-statement="${index}"><span>방송 ${index + 1}</span><b>${escapeHtml(text)}</b></button>`).join('')}</div>` : '<em>동생 사진, 기억 테이프, 수상한 방송 기록이 모두 필요하다.</em>'}${state.finalStatement.feedback ? `<small class="puzzle-feedback">${escapeHtml(state.finalStatement.feedback)}</small>` : ''}</section>`;
}
function storyRecapMarkup(): string {
  const decisions = CLUES.map((clue) => {
    const choice = state.clueDecisions[clue.id];
    if (!choice) return '';
    return `<li><b>${escapeHtml(clue.title)}</b><span>${choice === 'record' ? '증거로 보존' : '합성 가능성으로 격리'}</span></li>`;
  }).join('');
  const route = routeStatus(state);
  const routeNames = route.order.map((id) => ROUTE_LEADS.find((candidate) => candidate.id === id)?.title ?? id).join(' → ') || '아직 선택하지 않음';
  const omittedName = route.omitted.map((id) => ROUTE_LEADS.find((candidate) => candidate.id === id)?.title ?? id).join(', ') || '없음';
  return `<aside class="story-recap"><span>옥상 앞 증거 정리</span><p class="recap-verdict"><b>증거 결론</b> 하윤은 실제로 옥상에 있고, 88.0 구조 호출만 과거 통화를 자른 합성이다.</p><h4>확인된 사실</h4><ul class="recap-facts"><li>23:58 사진·발자국·옥상 흔적은 하윤의 실제 동선을 가리킨다.</li><li>88.0 호출은 과거 통화를 자른 합성이며 숨과 방 잔향이 없다.</li><li>23:55 실제 릴에는 연속된 숨·비·스튜디오 잔향이 있다.</li><li>내가 택한 조사 순서: ${escapeHtml(routeNames)} · 건너뛴 세 번째 경로: ${escapeHtml(omittedName)}</li></ul><h4>내가 분류한 기록</h4><ul class="recap-decisions">${decisions || '<li><span>아직 분류한 기록이 없다.</span></li>'}</ul></aside>`;
}
function endingChoicesMarkup(): string {
  if (state.finalStatement.status !== 'solved') return '<section class="puzzle-panel locked"><h3>옥상 문이 잠겨 있다</h3><p>심야 부스에서 거짓 방송 하나를 먼저 빼자.</p></section>';
  const hasKey = state.inventory.includes('roof-key');
  if (!hasKey) return '<section class="puzzle-panel locked"><h3>하윤이 난간 끝에 있다</h3><p>사다리 옆에서 옥상 열쇠를 찾자.</p></section>';
  const choices = endingAvailability(state);
  const recap = storyRecapMarkup();
  if (choices.resolved < 2) return `<section class="puzzle-panel final-choice locked"><span>마지막 선택</span><h3>아직 증거 분류가 부족하다</h3><p>방송국에서 찾은 기록을 두 개 이상 보존하거나 합성으로 격리한 뒤 돌아오자.</p>${recap}</section>`;
  return `<section class="puzzle-panel final-choice"><span>마지막 선택 · 행동, 근거, 결과를 확인하세요</span><h3>확인한 증거를 어떻게 처리할까?</h3>${recap}<button data-ending="restore" ${choices.restore ? '' : 'disabled'}>구조 · 사진·원본 릴·발자국을 따라 실제 하윤을 구조하고 송신기를 부순다${choices.restore ? '' : ' · 잠김: 기록을 2개 이상 증거로 보존'}</button><button data-ending="erase" ${choices.erase ? '' : 'disabled'}>전체 삭제 · 원본과 합성을 구분하지 않고 모든 기록을 지운다${choices.erase ? '' : ' · 잠김: 기록을 2개 이상 합성으로 격리'}</button><button data-ending="human" ${choices.human ? '' : 'disabled'}>공개 방송 · 실제 릴과 합성 파형을 비교 증거로 보내 외부 수신국이 구조 위치와 조작을 확인하게 한다${choices.human ? '' : ' · 잠김: 보존 기록과 격리 기록이 모두 필요'}</button><button class="illusion-choice" data-ending="illusion" ${choices.illusion ? '' : 'disabled'}>오판 · 모든 흔적을 합성으로 보고 옥상의 실제 하윤에게 다가가지 않는다${choices.illusion ? '' : ' · 잠김: 세 기록을 모두 합성으로 격리'}</button></section>`;
}
function toolBelt(): string {
  const tools = state.inventory.filter((id): id is ItemId => Boolean(ITEM_INFO[id]));
  return `<aside class="tool-belt" role="dialog" aria-modal="true" aria-label="현장 가방"><div class="bag-head"><b>현장 가방 · ${tools.length}개</b><button data-bag aria-label="가방 닫기">← 뒤로</button></div><div class="bag-items">${tools.length ? tools.map((id) => `<button data-inspect-item="${id}" aria-label="${escapeHtml(ITEM_INFO[id].name)} 크게 보고 조사 기록 읽기"><img src="${itemArt(id)}" alt=""><span><b>${escapeHtml(ITEM_INFO[id].name)}</b><small>${escapeHtml(ITEM_INFO[id].description)}</small><em>눌러서 크게 보기</em></span></button>`).join('') : '<span>아직 도구가 없다.</span>'}</div></aside>`;
}
function collectibleRevealMarkup(): string {
  if (!revealedItem) return '';
  const info = ITEM_INFO[revealedItem];
  return `<aside class="collectible-reveal" role="status" data-dismiss-reveal aria-label="${escapeHtml(info.name)} 획득 알림"><img src="${itemArt(revealedItem)}" alt=""><div><small>새 도구 획득</small><b>${escapeHtml(info.name)}</b><span>${escapeHtml(info.description)}</span><em>${escapeHtml(info.pickupReaction)}</em></div></aside>`;
}
function itemDetailMarkup(): string {
  if (!selectedItem) return '';
  const info = ITEM_INFO[selectedItem];
  return `<aside class="screen-overlay item-detail" role="dialog" aria-modal="true" aria-labelledby="item-detail-title" data-backdrop="item"><p class="backdrop-dismiss-hint modal-dismiss-hint" aria-hidden="true">바깥 화면을 눌러서 나가기</p><section><button class="modal-back" data-close-item aria-label="아이템 상세 닫고 가방으로 돌아가기">← 가방으로</button><div class="item-art-stage"><img src="${itemArt(selectedItem)}" alt="${escapeHtml(info.name)} 확대 그림"></div><div class="item-copy"><small>현장 조사 기록</small><h2 id="item-detail-title">${escapeHtml(info.name)}</h2><p class="item-summary">${escapeHtml(info.description)}</p><hr><p>${escapeHtml(info.detail)}</p></div></section></aside>`;
}
function galleryMarkup(): string {
  if (!galleryOpen) return '';
  const cards = ENDINGS.map((ending) => {
    const info = ENDING_INFO[ending];
    const unlocked = unlockedEndings.has(ending);
    const art = asset(`art/radio/${ENDING_STORY[ending].art}`);
    const content = `<div aria-hidden="true"><img src="${art}" alt="" draggable="false"></div><small>${unlocked ? escapeHtml(info.kicker) : 'ENDING ?? · 잠김'}</small><h3>${unlocked ? escapeHtml(info.title) : '아직 확인하지 않은 결말'}</h3><p>${unlocked ? escapeHtml(info.summary) : '다른 방식으로 기억을 판단하고 옥상에 도달하세요.'}</p>${unlocked ? '<em>스토리 다시 보기 →</em>' : ''}`;
    return unlocked
      ? `<button type="button" data-replay-ending="${ending}" class="ending-card unlocked ${ending === 'illusion' ? 'haunted' : ''}" aria-label="${escapeHtml(info.title)} 스토리 다시 보기">${content}</button>`
      : `<article class="ending-card locked ${ending === 'illusion' ? 'haunted' : ''}">${content}</article>`;
  }).join('');
  return `<aside class="screen-overlay ending-gallery" role="dialog" aria-modal="true" aria-labelledby="gallery-title" data-backdrop="gallery"><p class="backdrop-dismiss-hint modal-dismiss-hint" aria-hidden="true">바깥 화면을 눌러서 나가기</p><section><button class="modal-back" data-close-gallery>← 메인으로</button><span>영구 기록 · ${unlockedEndings.size}/${ENDINGS.length}</span><h2 id="gallery-title">엔딩 갤러리</h2><p>진행을 초기화해도 확인한 결말은 이곳에 남습니다.</p><div class="ending-grid">${cards}</div></section></aside>`;
}
function jumpScareMarkup(): string {
  if (!jumpScareOpen) return '';
  return `<aside class="jump-scare" role="dialog" aria-modal="true" aria-label="하윤의 사진이 괴물처럼 뒤틀리는 공포 장면" aria-live="assertive" tabindex="-1"><img src="${asset('art/radio/hayun-jumpscare.webp')}" alt="하윤의 즉석사진 속 얼굴이 검은 눈과 열린 입으로 뒤틀려 화면 앞으로 다가온다"><div aria-hidden="true"></div></aside>`;
}
function rewardMarkup(): string {
  if (!rewardBeat) return '';
  return `<div class="reward-backdrop" data-dismiss-reward aria-hidden="true"></div><p class="backdrop-dismiss-hint reward-dismiss-hint" aria-hidden="true">바깥 화면을 눌러서 나가기</p><aside class="reward-beat ${rewardBeat.major ? 'major' : 'choice'}" role="status"><button data-dismiss-reward aria-label="보상 알림 닫기">×</button><small>${escapeHtml(rewardBeat.kicker)}</small><h2>${escapeHtml(rewardBeat.title)}</h2><p>${escapeHtml(rewardBeat.text)}</p>${rewardBeat.major ? '<div><i></i><i></i><i></i><i></i><i></i></div>' : ''}</aside>`;
}
function journalMarkup(): string {
  const entries = [...state.clues].map((id) => {
    const clue = CLUES.find((candidate) => candidate.id === id);
    if (!clue) return '';
    const choice = state.clueDecisions[id];
    return `<article class="memory-card ${choice === 'delete' ? 'doubted' : ''}"><small>${escapeHtml(LOCATIONS[clue.location].title)}</small><h3>${escapeHtml(clue.title)}</h3><p>${escapeHtml(clue.text)}</p><b>${choice === 'delete' ? '합성 가능성으로 격리했다' : '물리적 맥락과 함께 증거로 보존했다'}</b></article>`;
  }).join('');
  return `<aside class="screen-overlay journal" role="dialog" aria-modal="true"><button data-journal class="overlay-close">닫기</button><span>분류한 기록 ${state.clues.size}/3</span><h2>증거 분류</h2><p>각 기록을 물리적 증거로 보존할지, 합성 가능성으로 격리할지 판단했다.</p><div>${entries || '<em>아직 분류한 기록이 없다.</em>'}</div></aside>`;
}
function memoryChoiceMarkup(): string {
  if (!state.pendingClue) return '';
  const clue = CLUES.find((candidate) => candidate.id === state.pendingClue);
  if (!clue) return '';
  return `<aside class="screen-overlay memory-choice" role="dialog" aria-modal="true" aria-labelledby="memory-title"><section><span>찾은 기억 · 이 판단은 마지막 선택을 바꾼다</span><h2 id="memory-title">${escapeHtml(clue.title)}</h2><p>${escapeHtml(clue.text)}</p><button data-memory="record">증거로 보존 · 물리적 맥락과 함께 남긴다</button><button data-memory="delete">합성으로 격리 · 구조 판단에서 제외한다</button><button data-cancel-memory>지금은 결정하지 않는다</button></section></aside>`;
}
function endingMarkup(): string {
  const ending = replayEnding ?? state.ending;
  if (!ending) return '';
  const info = ENDING_INFO[ending];
  const story = ENDING_STORY[ending];
  const art = asset(`art/radio/${story.art}`);
  const beats = story.beats.map((beat, index) => `<p class="ending-beat" style="--beat:${index}">${escapeHtml(beat)}</p>`).join('');
  const primaryAction = replayEnding ? '<button data-return-gallery>← 엔딩 갤러리로</button>' : `<button data-gallery>엔딩 갤러리 ${unlockedEndings.size}/${ENDINGS.length}</button>`;
  return `<section class="ending-screen ending-${ending}"><div class="ending-hero" style="background-image:url('${art}')" role="img" aria-label="${escapeHtml(info.title)} 엔딩 장면"></div><div class="ending-grade" aria-hidden="true"></div><article><small>${escapeHtml(info.kicker)}</small><h2>${escapeHtml(info.title)}</h2><blockquote>${escapeHtml(story.quote)}</blockquote><div class="ending-story">${beats}</div><b>${escapeHtml(info.summary)}</b><div class="ending-actions">${primaryAction}<button data-reset>처음부터 다시 하기</button></div></article></section>`;
}
function introMarkup(): string {
  return `<aside class="screen-overlay intro" role="dialog" aria-modal="true"><section><span>23:30 · 폐쇄된 해월 제7중계소 · 공명 복원 방송 재가동</span><h2>자정까지 30분.<br>진짜 하윤의 흔적을 구별하라.</h2><p class="intro-call">“오빠, 목소리를 따라오지 마. <b>숨과 방의 울림</b>을 확인해.”</p><p>음향 복원 기사 하윤은 폐쇄 방송국의 불법 실험 기록을 찾다 옥상에 고립됐다. 자정이 되면 공명 복원 방송이 지난 30분의 기억과 증거를 합성 문장으로 덮어쓴다.</p><ol><li>장소를 옮겨 빛나는 물건을 찾는다.</li><li>서로 다른 네 장비를 직접 조작한다.</li><li>두 조사 경로를 끝낸 뒤 마지막 거짓 방송을 판별하고 옥상으로 올라간다.</li></ol><small class="playtime-note">실시간 제한은 없습니다. 탐색 속도는 결말에 영향을 주지 않습니다.</small><small class="horror-note">공포 화면과 짧은 비명·음향 연출이 포함됩니다.</small><div class="intro-actions"><button data-start>구조 신호 찾기</button><button data-gallery>엔딩 갤러리 ${unlockedEndings.size}/${ENDINGS.length}</button></div></section></aside>`;
}
function render(): void {
  const location = LOCATIONS[state.location];
  const openLocations = availableLocations(state);
  const placeNumber = LOCATION_ORDER.indexOf(state.location) + 1;
  const openLocationIndex = openLocations.indexOf(state.location);
  app.innerHTML = `<main class="game ${signalMood()} ${paused ? 'paused' : ''} ${detailOpen ? 'is-detail' : ''} ${state.ending ? 'has-ending' : ''}">
    <header class="game-header"><div class="brand"><span>해월 제7중계소 · 23:30</span><h1>자정 <em>주파수</em></h1></div><div class="header-objective"><span>현재 목표</span><strong>${objective()}</strong><div class="progress" aria-label="조사 진행 ${puzzleSolved()}/4 완료">${Array.from({ length: 4 }, (_, i) => `<i class="${i < puzzleSolved() ? 'done' : ''}"></i>`).join('')}</div><span class="mobile-signal" title="방송 신호 ${signalLabel()}" aria-label="방송 신호 ${signalLabel()}"><i class="${state.tension >= 35 ? 'lit' : ''}"></i><i class="${state.tension >= 65 ? 'lit' : ''}"></i><i class="${state.tension >= 90 ? 'lit' : ''}"></i></span></div><nav><i>● 저장됨</i><button data-journal>증거 ${state.clues.size}/3</button><button data-bag aria-expanded="${bagOpen}">가방 ${state.inventory.length}</button><button data-gallery>엔딩 ${unlockedEndings.size}/${ENDINGS.length}</button><button data-audio aria-pressed="${stationSoundscape.isEnabled()}" aria-label="전체 음향 ${stationSoundscape.isEnabled() ? '켜짐' : '꺼짐'}. 눌러서 전환" title="전체 음향 켜기 또는 끄기">전체 ${stationSoundscape.isEnabled() ? '●' : '○'}</button><label class="music-volume" title="배경 음악 음량"><span>BGM <output data-music-value>${stationSoundscape.getMusicVolume()}</output></span><input data-music-volume type="range" min="0" max="100" step="1" value="${stationSoundscape.getMusicVolume()}" aria-label="배경 음악 음량 ${stationSoundscape.getMusicVolume()}%"></label><button data-landscape aria-label="${fullscreenActive() ? '전체화면 종료' : '가로 전체화면 전환'}">${fullscreenActive() ? '창모드' : '가로 전체'}</button><button data-pause>${paused ? '계속' : '멈춤'}</button></nav></header>
    <section class="viewport" aria-label="${escapeHtml(location.title)}"><div class="place"><small>장소 ${String(placeNumber).padStart(2, '0')} · ${openLocations.length}/10 열림</small><h2>${escapeHtml(location.title)}</h2><p>${escapeHtml(location.subtitle)}</p></div>${sceneMarkup()}
      ${!detailOpen ? `<button class="turn left" data-turn="-1" aria-label="${openLocationIndex > 0 ? '이전 장소' : '이전 장소 없음'}" ${openLocationIndex > 0 ? '' : 'disabled'}>‹<span>이전</span></button><button class="turn right" data-turn="1" aria-label="${openLocationIndex < openLocations.length - 1 ? '다음 장소' : '다음 장소 없음'}" ${openLocationIndex < openLocations.length - 1 ? '' : 'disabled'}>›<span>다음</span></button>` : ''}
      <p class="message" role="status">${escapeHtml(state.message)}</p><div class="signal"><span>방송 신호 · ${signalLabel()}</span><b><i style="width:${state.tension}%"></i></b></div>
    </section>
    <p class="field-hint"><b>현장 힌트</b>${hint()}</p>${bagOpen ? `<div class="bag-backdrop" data-close-bag aria-hidden="true"></div><p class="backdrop-dismiss-hint bag-dismiss-hint" aria-hidden="true">바깥 화면을 눌러서 나가기</p>${toolBelt()}` : ''}
    ${collectibleRevealMarkup()}${rewardMarkup()}${journalOpen ? journalMarkup() : ''}${state.pendingClue ? memoryChoiceMarkup() : ''}${introOpen ? introMarkup() : ''}${paused ? '<aside class="pause-card" role="dialog" aria-modal="true" aria-label="조사 멈춤"><span>조사 멈춤</span><button data-pause>계속하기</button><button data-reset>진행 초기화</button></aside>' : ''}${endingMarkup()}${itemDetailMarkup()}${galleryMarkup()}${jumpScareMarkup()}${rotationPromptMarkup()}${orientationNotice ? `<p class="orientation-notice" role="status">${escapeHtml(orientationNotice)}</p>` : ''}
  </main>`;
  bind();
  stationSoundscape.sync(state.location, state.tension, paused || introOpen || jumpScareOpen || Boolean(state.ending) || Boolean(replayEnding));
  const modalFocusTarget = jumpScareOpen ? '.jump-scare' : selectedItem ? '[data-close-item]' : galleryOpen ? '[data-close-gallery]' : state.pendingClue ? '[data-memory]' : introOpen ? '[data-start]' : journalOpen ? '[data-journal].overlay-close' : paused ? '.pause-card [data-pause]' : replayEnding ? '[data-return-gallery]' : state.ending ? '[data-gallery]' : detailOpen ? '[data-close-detail]' : '';
  const focusTarget = modalFocusTarget || restoreFocusSelector;
  if (focusTarget) document.querySelector<HTMLElement>(focusTarget)?.focus();
  if (!modalFocusTarget) restoreFocusSelector = '';
}

function trapModalFocus(event: KeyboardEvent): boolean {
  if (event.key !== 'Tab') return false;
  const modals = document.querySelectorAll<HTMLElement>('.screen-overlay, .tool-belt, .pause-card, .ending-screen, .jump-scare');
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
function renderWithPuzzleScroll(): void {
  const scrollTop = document.querySelector<HTMLElement>('.puzzle-panel')?.scrollTop ?? 0;
  render();
  const panel = document.querySelector<HTMLElement>('.puzzle-panel');
  if (panel) panel.scrollTop = scrollTop;
}
function attemptCurrentPuzzle(): void {
  let next = state;
  if (state.location === 'transmitter') next = attemptFrequency(state, puzzleDraft);
  else if (state.location === 'power') next = connectBreaker(state, puzzleDraft);
  else if (state.location === 'archive') next = arrangeRecordings(state, puzzleDraft);
  else if (state.location === 'studio') next = selectFlashlightFilter(state, puzzleDraft);
  const currentPuzzle = state.location === 'transmitter' ? next.frequency : state.location === 'power' ? next.breaker : state.location === 'archive' ? next.recordings : next.flashlight;
  if (currentPuzzle.status !== 'solved') stationSoundscape.cue('error');
  commit(next, currentPuzzle.status !== 'solved');
}
function dismissReveal(): void {
  revealedItem = null;
  if (revealTimer) window.clearTimeout(revealTimer);
  revealTimer = undefined;
}
function dismissSideNavTutorial(): void {
  if (!sideNavTutorialOpen) return;
  sideNavTutorialOpen = false;
  storageSet('local', SIDE_NAV_TUTORIAL_KEY, 'seen');
}
function dismissReward(): void {
  rewardBeat = null;
  if (rewardTimer) window.clearTimeout(rewardTimer);
  rewardTimer = undefined;
}
function showReward(stage: number): void {
  const titles = ['목소리 신호 포착', '첫 조사 증거 확보', '숨은 통로 개방', '거짓 방송 제거'];
  dismissReward();
  rewardBeat = { kicker: `옥상 신호 복구 ${stage}/4`, title: titles[stage - 1] ?? '경로 개방', text: state.message, major: true };
  stationSoundscape.solve(stage);
  rewardTimer = window.setTimeout(() => { rewardBeat = null; rewardTimer = undefined; render(); }, 3300);
}
function resetGame(): void {
  if (!confirm('현재 진행을 모두 지우고 처음부터 시작할까요?')) return;
  dismissReveal(); dismissReward();
  storageRemove('local', SAVE_KEY);
  for (const key of LEGACY_KEYS) storageRemove('local', key);
  if (scareTimer) window.clearTimeout(scareTimer);
  state = initialState(); detailOpen = false; journalOpen = false; bagOpen = false; paused = false; galleryOpen = false; replayEnding = null; selectedItem = null; jumpScareOpen = false; introOpen = true; puzzleDraft = []; render();
}
function closeItemDetail(): void { selectedItem = null; render(); }
function closeGallery(): void { galleryOpen = false; render(); }
function returnToGallery(): void { replayEnding = null; galleryOpen = true; render(); }
function closeJumpScare(): void {
  jumpScareOpen = false;
  stopJumpScareSound();
  if (scareTimer) window.clearTimeout(scareTimer);
  scareTimer = undefined;
  leaveJumpScareFullscreen();
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
  document.querySelectorAll<HTMLElement>('[data-turn]').forEach((button) => button.onclick = () => { dismissReveal(); dismissSideNavTutorial(); stationSoundscape.cue('move'); detailOpen = false; puzzleDraft = []; commit(move(state, Number(button.dataset.turn) as -1 | 1)); });
  document.querySelector<HTMLElement>('[data-open-detail]')?.addEventListener('click', () => { restoreFocusSelector = '[data-open-detail]'; detailOpen = true; puzzleDraft = []; render(); });
  document.querySelectorAll<HTMLElement>('[data-close-detail]').forEach((element) => element.addEventListener('click', closeSceneDetail));
  document.querySelectorAll<HTMLElement>('[data-hotspot]').forEach((button) => button.onclick = () => {
    const spot = visibleHotspots(state).find((candidate) => candidate.id === button.dataset.hotspot);
    if (spot?.reward.type === 'item') {
      stationSoundscape.cue('collect');
      revealedItem = spot.reward.id;
      if (revealTimer) window.clearTimeout(revealTimer);
      const revealDuration = window.matchMedia('(max-width:760px)').matches ? 2000 : 4200;
      revealTimer = window.setTimeout(() => { revealedItem = null; revealTimer = undefined; render(); }, revealDuration);
    }
    restoreFocusSelector = '[data-close-detail]'; commit(inspectHotspot(state, button.dataset.hotspot!), true);
  });
  document.querySelectorAll<HTMLElement>('[data-inspect-item]').forEach((button) => button.onclick = () => {
    const id = button.dataset.inspectItem as ItemId;
    dismissReveal(); restoreFocusSelector = `[data-inspect-item="${id}"]`; selectedItem = id; state = inspect(state, id); save(); render();
  });
  document.querySelector<HTMLElement>('[data-dismiss-reveal]')?.addEventListener('click', () => {
    if (!phoneLayoutActive()) return;
    dismissReveal();
    render();
  });
  const phoneReveal = document.querySelector<HTMLElement>('[data-dismiss-reveal]');
  if (phoneReveal && phoneLayoutActive()) {
    const viewportTop = document.querySelector<HTMLElement>('.viewport')?.getBoundingClientRect().top ?? 0;
    phoneReveal.style.top = `${Math.max(6, Math.round(viewportTop + 6))}px`;
  }
  document.querySelectorAll<HTMLElement>('[data-puzzle-value]').forEach((button) => button.onclick = () => { stationSoundscape.control('tape'); const value = button.dataset.puzzleValue!; if (!puzzleDraft.includes(value)) puzzleDraft.push(value); renderWithPuzzleScroll(); });
  document.querySelectorAll<HTMLElement>('[data-puzzle-remove]').forEach((button) => button.onclick = () => { stationSoundscape.control('tape'); puzzleDraft.splice(Number(button.dataset.puzzleRemove), 1); renderWithPuzzleScroll(); });
  document.querySelector<HTMLInputElement>('[data-frequency-range]')?.addEventListener('input', (event) => {
    const input = event.currentTarget as HTMLInputElement; puzzleDraft = [input.value];
    const value = Number(input.value); const strength = Math.max(0, 100 - Math.abs(88 - value) * 25);
    stationSoundscape.frequencyStep(value);
    const panel = input.closest<HTMLElement>('.frequency-console');
    const output = panel?.querySelector<HTMLOutputElement>('[data-frequency-output]'); if (output) output.value = `${value.toFixed(1)} MHz`;
    const voice = panel?.querySelector<HTMLElement>('[data-frequency-voice]'); if (voice) voice.textContent = strength >= 95 ? '“오빠… 옥상… 들려?”' : strength >= 55 ? '“…빠… 옥… 들…”' : '치지직— 신호 없음';
    panel?.querySelectorAll<HTMLElement>('.wave-strength i').forEach((bar,index) => bar.classList.toggle('lit', strength >= (index + 1) * 20));
    const submit = panel?.querySelector<HTMLButtonElement>('[data-puzzle-submit]'); if (submit) submit.disabled = value !== 88;
  });
  document.querySelectorAll<HTMLButtonElement>('[data-breaker]').forEach((button) => button.onclick = () => {
    stationSoundscape.control('switch'); const value = button.dataset.breaker!; puzzleDraft = puzzleDraft.includes(value) ? puzzleDraft.filter((entry) => entry !== value) : [...puzzleDraft, value]; renderWithPuzzleScroll();
  });
  document.querySelectorAll<HTMLInputElement>('[data-light-index]').forEach((input) => input.addEventListener('input', (event) => {
    const slider = event.currentTarget as HTMLInputElement; const index = Number(slider.dataset.lightIndex);
    stationSoundscape.control('slider');
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
    if (next.ending && next.ending !== state.ending && next.ending !== 'illusion') stationSoundscape.cue(next.ending === 'human' ? 'choice' : 'solve');
    if (next.ending === 'illusion' && state.ending !== 'illusion') {
      enterJumpScareFullscreen(); playJumpScareSound(); jumpScareOpen = true;
      if (scareTimer) window.clearTimeout(scareTimer);
      scareTimer = window.setTimeout(closeJumpScare, 2850);
    }
    commit(next);
  });
  document.querySelectorAll<HTMLElement>('[data-memory]').forEach((button) => button.onclick = () => {
    const action = button.dataset.memory as EditorialAction; const next = resolveEditorialChoice(state, action, false);
    stationSoundscape.cue('choice');
    dismissReward(); rewardBeat = { kicker: '선택이 즉시 신호를 바꿨다', title: action === 'record' ? '기억을 믿었다' : '기억을 의심했다', text: next.message, major: false };
    rewardTimer = window.setTimeout(() => { rewardBeat = null; rewardTimer = undefined; render(); }, 2800); commit(next, true);
  });
  document.querySelectorAll<HTMLElement>('[data-dismiss-reward]').forEach((element) => element.addEventListener('click', () => { dismissReward(); render(); }));
  document.querySelector<HTMLElement>('[data-cancel-memory]')?.addEventListener('click', () => commit(cancelPendingClue(state), true));
  document.querySelectorAll<HTMLElement>('[data-journal]').forEach((button) => button.onclick = () => { dismissReveal(); if (!journalOpen) restoreFocusSelector = 'header [data-journal]'; journalOpen = !journalOpen; render(); });
  document.querySelectorAll<HTMLElement>('[data-bag]').forEach((button) => button.onclick = () => { dismissReveal(); if (bagOpen) closeBag(); else { bagOpen = true; restoreFocusSelector = '.bag-head [data-bag]'; render(); } });
  document.querySelector<HTMLElement>('[data-close-bag]')?.addEventListener('click', closeBag);
  document.querySelectorAll<HTMLElement>('[data-pause]').forEach((button) => button.onclick = () => { dismissReveal(); if (!paused) restoreFocusSelector = 'header [data-pause]'; paused = !paused; render(); });
  document.querySelector<HTMLElement>('[data-audio]')?.addEventListener('click', () => {
    void stationSoundscape.toggle().then((enabled) => { if (!enabled) stopJumpScareSound(); render(); }).catch(render);
  });
  document.querySelectorAll<HTMLElement>('[data-landscape]').forEach((button) => button.addEventListener('click', () => { void toggleLandscapeMode(); }));
  document.querySelector<HTMLElement>('[data-dismiss-rotation]')?.addEventListener('click', () => {
    rotationPromptDismissed = true;
    storageSet('session', 'midnight-frequency-rotation-dismissed', '1');
    render();
  });
  document.querySelector<HTMLInputElement>('[data-music-volume]')?.addEventListener('input', (event) => {
    const input = event.currentTarget as HTMLInputElement;
    stationSoundscape.setMusicVolume(Number(input.value));
    const output = input.closest('label')?.querySelector<HTMLOutputElement>('[data-music-value]');
    if (output) output.value = input.value;
    input.setAttribute('aria-label', `배경 음악 음량 ${input.value}%`);
  });
  document.querySelectorAll<HTMLElement>('[data-gallery]').forEach((button) => button.onclick = () => { if (!galleryOpen) restoreFocusSelector = '[data-gallery]'; galleryOpen = !galleryOpen; render(); });
  document.querySelectorAll<HTMLElement>('[data-replay-ending]').forEach((button) => button.onclick = () => { replayEnding = button.dataset.replayEnding as Ending; galleryOpen = false; render(); });
  document.querySelector<HTMLElement>('[data-return-gallery]')?.addEventListener('click', returnToGallery);
  document.querySelector<HTMLElement>('[data-close-gallery]')?.addEventListener('click', closeGallery);
  document.querySelector<HTMLElement>('[data-close-item]')?.addEventListener('click', closeItemDetail);
  document.querySelectorAll<HTMLElement>('[data-backdrop]').forEach((backdrop) => backdrop.onclick = (event) => {
    if (event.target !== event.currentTarget) return;
    if (backdrop.dataset.backdrop === 'item') closeItemDetail(); else closeGallery();
  });
  document.querySelectorAll<HTMLElement>('[data-reset]').forEach((button) => button.onclick = resetGame);
  document.querySelector<HTMLElement>('[data-start]')?.addEventListener('click', () => { primeSoundscape(); restoreFocusSelector = '[data-open-detail]'; introOpen = false; storageSet('session', 'midnight-frequency-intro-seen', '1'); render(); });
}
window.addEventListener('keydown', (event) => {
  if (trapModalFocus(event)) return;
  if (jumpScareOpen) { if (event.key === 'Escape') closeJumpScare(); return; }
  if (selectedItem) { if (event.key === 'Escape') closeItemDetail(); return; }
  if (galleryOpen) { if (event.key === 'Escape') closeGallery(); return; }
  if (replayEnding) { if (event.key === 'Escape') returnToGallery(); return; }
  if (state.pendingClue) { if (event.key === 'Escape') commit(cancelPendingClue(state), true); return; }
  if (introOpen) { if (event.key === 'Escape') { restoreFocusSelector = '[data-open-detail]'; introOpen = false; storageSet('session', 'midnight-frequency-intro-seen', '1'); render(); } return; }
  if (journalOpen) { if (event.key === 'Escape') { journalOpen = false; render(); } return; }
  if (bagOpen) { if (event.key === 'Escape') closeBag(); return; }
  if (paused) { if (event.key === 'Escape') { paused = false; render(); } return; }
  if (state.ending) return;
  if (event.key === 'Escape' && detailOpen) { closeSceneDetail(); return; }
  if (!detailOpen && (event.key.toLowerCase() === 'a' || event.key === 'ArrowLeft')) { dismissReveal(); dismissSideNavTutorial(); stationSoundscape.cue('move'); commit(move(state, -1)); }
  if (!detailOpen && (event.key.toLowerCase() === 'd' || event.key === 'ArrowRight')) { dismissReveal(); dismissSideNavTutorial(); stationSoundscape.cue('move'); commit(move(state, 1)); }
});
document.addEventListener('fullscreenchange', () => {
  if (!fullscreenActive()) {
    try { (screen.orientation as LockableOrientation).unlock?.(); } catch { /* Unlock support varies. */ }
  }
  refreshOrientationUi();
});
render();
