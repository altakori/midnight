import { describe, expect, it } from 'vitest';
import { choiceKind, choose, deserialize, initialState, resolveEnding, restoreVerb, serialize, verbIsAvailable, type GameState } from './engine';
import { sceneMap } from './content';

function pick(state: GameState, id: string) {
  return sceneMap.get(state.sceneId)!.choices.find((choice) => choice.id === id)!;
}
function route(ids: string[]): GameState {
  let state = initialState();
  for (const id of ids) state = choose(state, pick(state, id));
  return state;
}

describe('Footnote Girl Escape', () => {
  it('supports two distinct playable wins with tight remaining time', () => {
    const quiet = route(['desk-hide', 'cp1-reveal', 'corridor-cut', 'cp2-forge', 'floor-reveal']);
    expect(quiet.time).toBe(4);
    expect(resolveEnding(quiet, pick(quiet, 'final-quiet'))).toBe('quiet-escape');

    const publicRoute = route(['desk-trust', 'cp1-reveal', 'corridor-cut', 'cp2-forge', 'floor-forge']);
    expect(publicRoute.time).toBe(4);
    expect(publicRoute.trust).toBeGreaterThanOrEqual(3);
    expect(resolveEnding(publicRoute, pick(publicRoute, 'final-public'))).toBe('public-escape');
  });

  it('escalates a spammed verb from warning to cost to deletion', () => {
    let state = route(['desk-hide']);
    expect(choiceKind(state, pick(state, 'cp1-hide'))).toBe('warning');
    state = choose(state, pick(state, 'cp1-hide'));
    expect(choiceKind(state, pick(state, 'corridor-hide'))).toBe('cost');
    const before = { time: state.time, suspicion: state.suspicion };
    state = choose(state, pick(state, 'corridor-hide'));
    expect(state.time).toBe(before.time - 2);
    expect(state.suspicion).toBe(before.suspicion + 1);
    expect(state.verbUses.hide).toBe(3);
    expect(verbIsAvailable(state, 'hide')).toBe(false);
    expect(choiceKind(state, pick(state, 'cp2-hide'))).toBe('crossed');
  });

  it('restores a deleted verb at a dangerous time and suspicion cost', () => {
    let state = route(['desk-hide', 'cp1-hide', 'corridor-hide']);
    let restored = restoreVerb(state, 'hide');
    expect(restored.ink).toBe(0);
    expect(restored.time).toBe(state.time - 2);
    expect(restored.suspicion).toBe(state.suspicion + 2);
    expect(restored.verbUses.hide).toBe(1);
    expect(verbIsAvailable(restored, 'hide')).toBe(true);
    restored = choose(restored, pick(restored, 'cp2-forge'));
    restored = choose(restored, pick(restored, 'floor-reveal'));
    expect(restored.time).toBe(1);
    expect(resolveEnding(restored, pick(restored, 'final-quiet'))).toBe('quiet-escape');
  });

  it('turns early trust into a real mid-route choice lock', () => {
    const neglected = route(['desk-hide', 'cp1-forge', 'corridor-cut']);
    expect(neglected.trust).toBe(1);
    expect(choiceKind(neglected, pick(neglected, 'cp2-reveal'))).toBe('locked');

    const protectedRoute = route(['desk-hide', 'cp1-reveal', 'corridor-cut']);
    expect(protectedRoute.trust).toBe(2);
    expect(choiceKind(protectedRoute, pick(protectedRoute, 'cp2-reveal'))).not.toBe('locked');
  });

  it('produces deadline, caught, and abandoned failures', () => {
    let deadline = initialState();
    deadline.time = 1;
    deadline = choose(deadline, pick(deadline, 'desk-hide'));
    expect(deadline.ended).toBe('deadline');

    let caught = initialState();
    caught.suspicion = 7;
    caught = choose(caught, pick(caught, 'desk-ask'));
    expect(caught.ended).toBe('caught');

    const safe = route(['desk-hide', 'cp1-forge', 'corridor-cut', 'cp2-forge', 'floor-reveal']);
    expect(resolveEnding(safe, pick(safe, 'final-fail'))).toBe('forgotten');
    expect(resolveEnding(safe, pick(safe, 'final-quiet'))).toBe('quiet-escape');
  });

  it('round trips the versioned save state', () => {
    const state = route(['desk-trust', 'cp1-forge', 'corridor-trust']);
    const restored = deserialize(serialize(state));
    expect(restored).toEqual(state);
    expect(restored.lastVerb).toBe('trust');
  });
});
