import './style.css';
import { choiceKind, choose, deserialize, initialState, resolveEnding, restoreVerb, serialize, VERBS, verbIsAvailable, type Choice, type Ending, type GameState, type Verb } from './engine';
import { sceneMap } from './content';

const KEY = 'footnote-girl-escape-save';
let state: GameState = load();
const app = document.querySelector<HTMLDivElement>('#app')!;

function load(): GameState {
  const raw = localStorage.getItem(KEY);
  if (!raw) return initialState();
  try { return deserialize(raw); }
  catch { localStorage.removeItem(KEY); return initialState(); }
}
function save(): void { localStorage.setItem(KEY, serialize(state)); }
function restart(): void { state = initialState(); save(); render(); }
function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
}

function verbStage(verb: Verb): string {
  const uses = state.verbUses[verb];
  if (uses >= 3) return '삭제';
  if (uses === 2) return '비용';
  if (uses === 1) return '경고';
  return '미사용';
}

function renderLedger(): string {
  return `<div class="ledger"><b>동사 장부</b><small>기록 → 경고 → 비용 → 삭제</small>${VERBS.map(({ key, label }) => {
    const uses = state.verbUses[key];
    const stage = verbStage(key);
    const available = verbIsAvailable(state, key);
    const restore = uses >= 3 && state.ink > 0
      ? `<button class="restore" data-restore="${key}">수정액</button>` : '';
    return `<div class="ledger-row stage-${uses >= 3 ? 'crossed' : uses}"><span>${label}</span><i>${stage}${available ? ' · 보유' : ''}</i>${restore}</div>`;
  }).join('')}</div>`;
}

function render(): void {
  const scene = sceneMap.get(state.sceneId)!;
  const art = scene.id === 'desk' || scene.id === 'final'
    ? `<figure class="scene-art ${scene.id === 'final' ? 'scene-art-final' : ''}"><img src="./art/footnote-girl.webp" alt="찢어진 원고의 삭제선 안에서 각주 소녀가 손을 내미는 먹선 삽화" width="1672" height="941" ${scene.id === 'desk' ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async"><figcaption>삭제된 각주 17번</figcaption></figure>`
    : '';
  app.innerHTML = `<main class="shell"><header><div><span class="eyebrow">문장특별시 / 원고 FG-02</span><h1>각주 소녀 탈옥</h1></div><div class="actions"><span>${state.turn ? '자동 저장됨' : '새 원고'}</span><button id="restart">다시 시작</button></div></header><section class="layout"><aside aria-label="탈옥 상태"><div class="clock"><small>최종 인쇄까지</small><strong>${Math.max(0, state.time)}<i>분</i></strong></div><div class="resource"><b>의심</b><span class="meter danger"><i style="width:${Math.min(100, state.suspicion / 8 * 100)}%"></i></span><em>${state.suspicion}/8</em></div><div class="resource"><b>소녀 신뢰</b><span class="meter trust"><i style="width:${Math.min(100, Math.max(0, state.trust) / 6 * 100)}%"></i></span><em>${state.trust}</em></div><div class="fluid">● 수정액 <b>${state.ink}</b><small>삭제 동사 복원 · 시간 -2 / 의심 +2</small></div><div class="checkpoints"><b>탈옥 단계</b>${[1,2,3].map((n) => `<span class="${state.checkpoint >= n ? 'done' : ''}">${n}</span>`).join('')}</div>${renderLedger()}</aside><article class="page"><div class="meta"><span>CHECKPOINT 0${scene.checkpoint}</span><span>${scene.kicker}</span></div>${art}<h2>${scene.title}</h2><div class="prose">${scene.body.map((line) => `<p>${line}</p>`).join('')}</div><div class="feedback" role="status" aria-live="polite">${escapeHtml(state.feedback)}</div>${scene.note ? `<aside class="note"><b>빨간 연필</b>${scene.note}</aside>` : ''}${state.ended ? renderEnding(state.ended) : renderChoices(scene.choices)}<footer>필요한 동사를 지켜내십시오. <span>Tab과 Enter로도 플레이할 수 있습니다.</span></footer></article></section></main>`;
  bind();
}

function renderChoices(choices: Choice[]): string {
  return `<div class="choices"><div class="label">다음 동사를 고르십시오 <span>선택 직후 장부와 자원이 바뀝니다</span></div>${choices.map((choice) => {
    const kind = choiceKind(state, choice);
    const final = choice.id.startsWith('final-');
    const comboReady = !final || choice.id === 'final-fail' || choice.contradiction?.every((verb) => verbIsAvailable(state, verb));
    const locked = kind === 'locked' || (final && !comboReady);
    const crossed = kind === 'crossed';
    return `<button class="choice ${locked ? 'locked' : kind}" data-id="${choice.id}" ${locked || crossed ? 'disabled' : ''}><span class="mark">${crossed ? '×' : locked ? '▣' : kind === 'cost' ? '!!' : kind === 'warning' ? '!' : '→'}</span><span><strong>${choice.label}</strong><small>${choice.hint}${kind === 'warning' ? ' · 붉은 경고' : ''}${kind === 'cost' ? ' · 추가 시간 -1 / 의심 +1, 이후 삭제' : ''}${crossed ? ' · 장부에서 수정액으로 복원' : ''}${locked ? ' · 필요한 동사/신뢰 부족' : ''}</small></span><em>${crossed ? '삭제됨' : locked ? '잠김' : kind === 'cost' ? '마지막 사용' : kind === 'warning' ? '경고' : ''}</em></button>`;
  }).join('')}</div>`;
}

function renderEnding(ending: Ending): string {
  const data: Record<Ending, [string, string]> = {
    'quiet-escape': ['조용한 탈출', '소녀는 숨겨졌기에 드러날 수 있었다. 모순이 인쇄기 뒤의 문을 열었다.'],
    'public-escape': ['본문 밖의 시민', '소녀는 당신을 믿었고, 위조된 출입증은 처음으로 진짜 이름이 되었다.'],
    caught: ['붉은 연필의 포획', '의심이 한계에 닿았거나 필요한 모순을 지키지 못했다.'],
    forgotten: ['남겨진 각주', '신뢰가 끊어졌다. 소녀는 스스로 여백으로 돌아갔다.'],
    deadline: ['자정 인쇄', '카운터가 00이 되었다. 종이는 소녀를 기다려주지 않았다.'],
  };
  return `<div class="ending"><span>발행 결과</span><h3>${data[ending][0]}</h3><p>${data[ending][1]}</p><p class="feedback">마지막 흔적: ${escapeHtml(state.log.slice(-3).join(' / ') || '아직 쓰인 문장이 없습니다.')}</p><button class="primary" id="restart-end">다른 전략으로 다시 쓰기</button></div>`;
}

function bind(): void {
  document.querySelector('#restart')?.addEventListener('click', restart);
  document.querySelector('#restart-end')?.addEventListener('click', restart);
  document.querySelectorAll<HTMLButtonElement>('[data-restore]').forEach((button) => button.addEventListener('click', () => {
    state = restoreVerb(state, button.dataset.restore as Verb); save(); render();
  }));
  document.querySelectorAll<HTMLButtonElement>('[data-id]').forEach((button) => button.addEventListener('click', () => {
    const choice = sceneMap.get(state.sceneId)!.choices.find((candidate) => candidate.id === button.dataset.id)!;
    if (choice.id.startsWith('final-')) state.ended = resolveEnding(state, choice) ?? 'caught';
    else state = choose(state, choice);
    save(); render();
  }));
}

render();
