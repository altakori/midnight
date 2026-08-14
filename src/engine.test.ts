import { describe, expect, it } from 'vitest';
import { availableLocations, cancelPendingClue, chooseEnding, combine, deserialize, editorialActionState, initialState, inspectHotspot, locationAvailable, move, resolveEditorialChoice, serialize, useItem, visibleHotspots, type EditorialAction, type Ending, type GameState, type ItemId, type Location } from './engine';

function go(state: GameState, target: Location): GameState {
  for (let index = 0; index < 12 && state.location !== target; index++) state = move(state, 1);
  expect(state.location).toBe(target);
  return state;
}
function find(state: GameState, hotspot: string, action: EditorialAction = 'record'): GameState {
  const inspected = inspectHotspot(state, hotspot);
  return inspected.pendingClue ? resolveEditorialChoice(inspected, action) : inspected;
}
function mix(state: GameState, first: ItemId, second: ItemId): GameState { return combine(state, first, second); }
function fullRoute(actions: EditorialAction[], ending: Ending): GameState {
  let decision = 0;
  const clue = (state: GameState, hotspot: string): GameState => find(state, hotspot, actions[decision++] ?? 'record');
  let state = initialState();
  state = find(state, 'square-sign'); state = clue(state, 'square-book');
  state = go(state, 'forest'); state = find(state, 'forest-thread'); state = find(state, 'forest-mushroom'); state = clue(state, 'forest-bark'); state = mix(state, 'bent-type', 'red-thread');
  state = go(state, 'well'); state = clue(state, 'well-rim'); state = useItem(state, 'hook-type', 'well');
  state = go(state, 'printshop'); state = find(state, 'press-lamp'); state = clue(state, 'press-order'); state = mix(state, 'empty-lamp', 'glowing-mushroom');
  state = go(state, 'archive-entrance'); state = clue(state, 'entrance-note'); state = useItem(state, 'archive-key', 'archive-entrance');
  state = go(state, 'archive-stacks'); state = clue(state, 'stacks-catalog'); state = useItem(state, 'sentence-lamp', 'archive-stacks');
  state = go(state, 'classroom'); state = find(state, 'class-chalk'); state = find(state, 'class-slate'); state = clue(state, 'class-roll'); state = clue(state, 'class-desk'); state = mix(state, 'chalk', 'child-slate'); state = useItem(state, 'restored-slate', 'classroom');
  state = go(state, 'chapel'); state = find(state, 'chapel-wax'); state = find(state, 'chapel-candle'); state = clue(state, 'chapel-fold'); state = clue(state, 'chapel-book'); state = mix(state, 'red-wax', 'candle-stub'); state = useItem(state, 'witness-candle', 'chapel');
  state = go(state, 'river'); state = find(state, 'river-boat'); state = find(state, 'river-plate'); state = clue(state, 'river-proof'); state = mix(state, 'paper-boat', 'press-plate'); state = useItem(state, 'proof-boat', 'river');
  state = go(state, 'editor-room'); state = clue(state, 'editor-note');
  expect(decision).toBe(12);
  return chooseEnding(state, ending);
}

const allRecord = Array<EditorialAction>(12).fill('record');
const allDelete = Array<EditorialAction>(12).fill('delete');
const humanRoute: EditorialAction[] = ['record', 'record', 'record', 'delete', 'delete', 'delete', 'record', 'delete', 'record', 'delete', 'record', 'delete'];

describe('편집 선택이 결말을 만드는 전체 진행 엔진', () => {
  it('기존 장소 잠금과 아이템 조합을 보존한다', () => {
    const state = initialState();
    expect(availableLocations(state)).toEqual(['square', 'forest', 'well', 'printshop', 'archive-entrance']);
    expect(locationAvailable(state, 'editor-room')).toBe(false);
    const item = inspectHotspot(state, 'square-sign');
    expect(item.inventory).toEqual(['bent-type']);
    expect(visibleHotspots(item).map((spot) => spot.id)).toEqual(['square-book']);
  });

  it('단서는 결정 전까지 수집되지 않고 취소하면 다시 남는다', () => {
    const pending = inspectHotspot(initialState(), 'square-book');
    expect(pending.pendingClue).toBe('square-ledger');
    expect(pending.clues.size).toBe(0);
    const cancelled = cancelPendingClue(pending);
    expect(cancelled.pendingClue).toBeUndefined();
    expect(visibleHotspots(cancelled).map((spot) => spot.id)).toContain('square-book');
  });

  it('반대 선택을 경고·잉크 비용·삭제의 세 단계로 교정한다', () => {
    expect(editorialActionState({ ...initialState(), editorialScore: 0 }, 'delete').stage).toBe('normal');
    expect(editorialActionState({ ...initialState(), editorialScore: 2 }, 'delete').stage).toBe('warning');
    expect(editorialActionState({ ...initialState(), editorialScore: 3 }, 'delete').stage).toBe('cost');
    expect(editorialActionState({ ...initialState(), editorialScore: 5 }, 'delete').stage).toBe('deleted');
  });

  it('잉크를 소모하며 잉크가 없으면 반대 선택을 거부한다', () => {
    const pending = { ...inspectHotspot(initialState(), 'square-book'), editorialScore: 3, ink: 1 };
    const resolved = resolveEditorialChoice(pending, 'delete');
    expect(resolved.ink).toBe(0);
    expect(resolved.contradictions).toBe(1);
    const refused = resolveEditorialChoice({ ...pending, ink: 0 }, 'delete');
    expect(refused.pendingClue).toBe('square-ledger');
    expect(refused.clues.size).toBe(0);
  });

  it('수정액으로 완전히 삭제된 선택을 한 번 복원한다', () => {
    const pending = { ...inspectHotspot(initialState(), 'square-book'), editorialScore: 5 };
    expect(editorialActionState(pending, 'delete').canRestore).toBe(true);
    const restored = resolveEditorialChoice(pending, 'delete', true);
    expect(restored.correctionFluid).toBe(0);
    expect(restored.clueDecisions['square-ledger']).toBe('delete');
    expect(restored.contradictions).toBe(1);
  });

  it('기록과 삭제 모두 단서를 남기고 중복 결정을 막는다', () => {
    let state = inspectHotspot(initialState(), 'square-book');
    state = resolveEditorialChoice(state, 'delete');
    expect(state.clues.has('square-ledger')).toBe(true);
    expect(state.found.has('hotspot:square-book')).toBe(true);
    const duplicate = inspectHotspot(state, 'square-book');
    expect(duplicate.failedActions).toBe(1);
  });

  it('기록자 경로는 복원 엔딩에, 삭제자 경로는 자기 삭제 엔딩에 도달한다', () => {
    const restored = fullRoute(allRecord, 'restore');
    expect(restored.ending).toBe('restore');
    expect(restored.editorialScore).toBe(12);
    expect(restored.clues.size).toBe(12);
    const erased = fullRoute(allDelete, 'erase');
    expect(erased.ending).toBe('erase');
    expect(erased.editorialScore).toBe(-12);
  });

  it('모순을 감수하고 중립으로 돌아오면 사람 엔딩에 도달한다', () => {
    const human = fullRoute(humanRoute, 'human');
    expect(human.ending).toBe('human');
    expect(human.editorialScore).toBe(0);
    expect(human.contradictions).toBe(2);
    expect(human.ink).toBe(1);
  });

  it('엔딩 잠금을 엔진에서도 강제한다', () => {
    const ready = { ...initialState(), location: 'editor-room' as Location, archiveLit: true, fragments: ['child-name', 'witness-name', 'third-name'] as GameState['fragments'] };
    expect(chooseEnding({ ...ready, editorialScore: 5 }, 'erase').ending).toBeUndefined();
    expect(chooseEnding({ ...ready, editorialScore: -5 }, 'restore').ending).toBeUndefined();
    expect(chooseEnding(ready, 'human').ending).toBeUndefined();
    expect(chooseEnding({ ...ready, editorialScore: 0, contradictions: 2 }, 'human').ending).toBe('human');
  });

  it('버전 5 저장을 진행 손실 없이 중립 상태로 마이그레이션한다', () => {
    const legacy = JSON.parse(serialize({ ...initialState(), inventory: ['bent-type'], clues: new Set(['square-ledger']) }));
    legacy.version = 5; delete legacy.editorialScore; delete legacy.ink; delete legacy.correctionFluid; delete legacy.contradictions; delete legacy.clueDecisions;
    const migrated = deserialize(JSON.stringify(legacy));
    expect(migrated.version).toBe(6);
    expect(migrated.inventory).toEqual(['bent-type']);
    expect(migrated.clues.has('square-ledger')).toBe(true);
    expect(migrated.editorialScore).toBe(0);
    expect(migrated.clueDecisions).toEqual({});
    expect(() => deserialize(JSON.stringify({ ...legacy, version: 4 }))).toThrow();
  });
});
