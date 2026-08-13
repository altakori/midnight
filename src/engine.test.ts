import { describe, expect, it } from 'vitest';
import { availableLocations, chooseEnding, combine, deserialize, initialState, inspectHotspot, locationAvailable, move, serialize, useItem, visibleHotspots, type Ending, type GameState, type ItemId, type Location } from './engine';

function go(state: GameState, target: Location): GameState {
  for (let index = 0; index < 12 && state.location !== target; index++) state = move(state, 1);
  expect(state.location).toBe(target);
  return state;
}
function find(state: GameState, hotspot: string): GameState { return inspectHotspot(state, hotspot); }
function mix(state: GameState, first: ItemId, second: ItemId): GameState { return combine(state, first, second); }
function fullRoute(ending: Ending): GameState {
  let state = initialState();
  state = find(state, 'square-sign');
  state = find(state, 'square-book');
  state = go(state, 'forest');
  state = find(state, 'forest-thread');
  state = find(state, 'forest-mushroom');
  state = find(state, 'forest-bark');
  state = mix(state, 'bent-type', 'red-thread');
  state = go(state, 'well');
  state = find(state, 'well-rim');
  state = useItem(state, 'hook-type', 'well');
  state = go(state, 'printshop');
  state = find(state, 'press-lamp');
  state = find(state, 'press-order');
  state = mix(state, 'empty-lamp', 'glowing-mushroom');
  state = go(state, 'archive-entrance');
  state = find(state, 'entrance-note');
  state = useItem(state, 'archive-key', 'archive-entrance');
  state = go(state, 'archive-stacks');
  state = find(state, 'stacks-catalog');
  state = useItem(state, 'sentence-lamp', 'archive-stacks');
  state = go(state, 'classroom');
  state = find(state, 'class-chalk');
  state = find(state, 'class-slate');
  state = find(state, 'class-roll');
  state = find(state, 'class-desk');
  state = mix(state, 'chalk', 'child-slate');
  state = useItem(state, 'restored-slate', 'classroom');
  state = go(state, 'chapel');
  state = find(state, 'chapel-wax');
  state = find(state, 'chapel-candle');
  state = find(state, 'chapel-fold');
  state = find(state, 'chapel-book');
  state = mix(state, 'red-wax', 'candle-stub');
  state = useItem(state, 'witness-candle', 'chapel');
  state = go(state, 'river');
  state = find(state, 'river-boat');
  state = find(state, 'river-plate');
  state = find(state, 'river-proof');
  state = mix(state, 'paper-boat', 'press-plate');
  state = useItem(state, 'proof-boat', 'river');
  state = go(state, 'editor-room');
  state = find(state, 'editor-note');
  return chooseEnding(state, ending);
}

describe('제출판 전체 진행 엔진', () => {
  it('ACT 1에서는 서고·2막 장소·편집자의 방이 잠겨 있다', () => {
    const state = initialState();
    expect(availableLocations(state)).toEqual(['square', 'forest', 'well', 'printshop', 'archive-entrance']);
    expect(locationAvailable(state, 'archive-stacks')).toBe(false);
    expect(locationAvailable(state, 'classroom')).toBe(false);
    expect(locationAvailable(state, 'editor-room')).toBe(false);
    let moved = state;
    for (let index = 0; index < 5; index++) moved = move(moved, 1);
    expect(moved.location).toBe('square');
  });

  it('장소마다 서로 다른 조사 지점이 있고 중복 조사를 막는다', () => {
    let state = initialState();
    expect(visibleHotspots(state).map((spot) => spot.label)).toEqual(['찢어진 간판', '버려진 장부']);
    state = find(state, 'square-sign');
    expect(visibleHotspots(state).map((spot) => spot.id)).toEqual(['square-book']);
    const duplicate = find(state, 'square-sign');
    expect(duplicate.inventory).toEqual(['bent-type']);
    expect(duplicate.failedActions).toBe(1);
  });

  it('실제 경로로 세 이름을 복원하고 복원 엔딩에 도달한다', () => {
    const state = fullRoute('restore');
    expect(state.ending).toBe('restore');
    expect(state.fragments).toEqual(['child-name', 'witness-name', 'third-name']);
    expect(state.clues.size).toBe(12);
    expect(state.inventory).toEqual([]);
    expect(state.tension).toBe(0);
  });

  it('같은 실제 경로로 자기 삭제 엔딩에도 도달한다', () => {
    const state = fullRoute('erase');
    expect(state.ending).toBe('erase');
    expect(state.message).toContain('내 이름');
    expect(state.tension).toBe(100);
  });

  it('잘못된 조합과 장소 사용은 물건을 소모하지 않는다', () => {
    let state = find(initialState(), 'square-sign');
    state = go(state, 'forest');
    state = find(state, 'forest-mushroom');
    const wrongMix = combine(state, 'bent-type', 'glowing-mushroom');
    expect(wrongMix.inventory).toEqual(state.inventory);
    const wrongUse = useItem(state, 'bent-type', 'forest');
    expect(wrongUse.inventory).toEqual(state.inventory);
    expect(wrongUse.failedActions).toBe(1);
  });

  it('모든 진행 상태를 저장·복구하고 구버전은 거부한다', () => {
    const finished = fullRoute('restore');
    const restored = deserialize(serialize(finished));
    expect(restored.ending).toBe('restore');
    expect([...restored.clues]).toEqual([...finished.clues]);
    expect([...restored.found]).toEqual([...finished.found]);
    expect(() => deserialize(JSON.stringify({ ...finished, version: 4 }))).toThrow();
  });
});
