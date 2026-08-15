import { describe, expect, it } from 'vitest';
import { arrangeRecordings, attemptFrequency, availableLocations, chooseEnding, chooseFinalStatement, connectBreaker, deserialize, endingAvailability, initialState, inspectHotspot, locationAvailable, move, resolveEditorialChoice, selectFlashlightFilter, serialize, visibleHotspots, type EditorialAction, type GameState, type Location } from './engine';

function go(state: GameState, target: Location): GameState {
  for (let i = 0; i < 30 && state.location !== target; i++) state = move(state, 1);
  expect(state.location).toBe(target);
  return state;
}
function take(state: GameState, id: string): GameState { return inspectHotspot(state, id); }
function fullInvestigation(memoryChoices: EditorialAction[] = ['record', 'record', 'record'], solveFinal = true): GameState {
  let s = initialState();
  s = take(s, 'entrance-radio');
  s = go(s, 'lobby'); s = take(s, 'lobby-frequency');
  if (memoryChoices[0]) { s = take(s, 'lobby-storm-note'); s = resolveEditorialChoice(s, memoryChoices[0]); }
  s = go(s, 'hall'); s = take(s, 'hall-gloves');
  s = go(s, 'transmitter'); s = take(s, 'transmitter-key');
  s = attemptFrequency(s, ['88']);
  s = go(s, 'power'); s = take(s, 'power-reel'); s = connectBreaker(s, ['antenna', 'emergency', 'studio']);
  s = go(s, 'archive'); s = take(s, 'archive-log'); s = arrangeRecordings(s, ['storm', 'arrival', 'warning', 'erasure']);
  s = go(s, 'studio'); s = take(s, 'studio-flashlight'); s = take(s, 'studio-filters');
  if (memoryChoices[1]) { s = take(s, 'studio-sibling-call'); s = resolveEditorialChoice(s, memoryChoices[1]); }
  s = selectFlashlightFilter(s, ['2', '1', '3']);
  s = go(s, 'passage'); s = take(s, 'passage-photo');
  s = go(s, 'booth'); s = take(s, 'booth-memory');
  if (memoryChoices[2]) { s = take(s, 'booth-false-script'); s = resolveEditorialChoice(s, memoryChoices[2]); }
  if (!solveFinal) return s;
  s = chooseFinalStatement(s, 0);
  s = go(s, 'roof'); s = take(s, 'roof-key');
  return s;
}

describe('storm mountain radio station engine', () => {
  it('starts with the ten redesigned location slots and a clear objective', () => {
    const s = initialState();
    expect(availableLocations(s)).toEqual(['entrance', 'lobby', 'hall', 'transmitter', 'power']);
    expect(s.location).toBe('entrance');
    expect(s.message).toContain('하윤');
    expect(locationAvailable(s, 'archive')).toBe(false);
  });

  it('requires wrong-answer attempts and does not solve by collecting tools', () => {
    let s = initialState();
    s = take(s, 'entrance-radio'); s = go(s, 'lobby'); s = take(s, 'lobby-frequency'); s = go(s, 'hall'); s = take(s, 'hall-gloves'); s = go(s, 'transmitter'); s = take(s, 'transmitter-key');
    s = attemptFrequency(s, ['84']);
    expect(s.frequency.status).toBe('active'); expect(s.frequency.attempts).toBe(1); expect(s.message).toContain('88.0 MHz'); expect(s.failedActions).toBe(1);
    expect(availableLocations(s)).not.toContain('archive');
    s = attemptFrequency(s, ['88']);
    expect(s.frequency.status).toBe('solved'); expect(s.archiveLit).toBe(true);
  });

  it('solves the three-circuit power budget only after frequency', () => {
    let s = initialState();
    s = take(s, 'entrance-radio'); s = go(s, 'lobby'); s = take(s, 'lobby-frequency'); s = go(s, 'hall'); s = take(s, 'hall-gloves'); s = go(s, 'transmitter'); s = take(s, 'transmitter-key'); s = attemptFrequency(s, ['88']); s = go(s, 'power');
    s = connectBreaker(s, ['black', 'yellow', 'blue', 'red']);
    expect(s.breaker.status).toBe('active'); expect(s.unlocked).toBe(false);
    s = connectBreaker(s, ['antenna', 'emergency', 'studio']);
    expect(s.breaker.status).toBe('solved'); expect(s.unlocked).toBe(true); expect(locationAvailable(s, 'archive')).toBe(true);
  });

  it('solves chronology, then colored flashlight selection in unlock order', () => {
    let s = fullInvestigation();
    expect(s.recordings.status).toBe('solved');
    expect(s.flashlight.status).toBe('solved');
    expect(locationAvailable(s, 'passage')).toBe(true);
    expect(s.inventory).toContain('sibling-photo');
  });

  it('gives feedback for wrong chronology and wrong filter sequence', () => {
    let s = initialState();
    s = take(s, 'entrance-radio'); s = go(s, 'lobby'); s = take(s, 'lobby-frequency'); s = go(s, 'hall'); s = take(s, 'hall-gloves'); s = go(s, 'transmitter'); s = take(s, 'transmitter-key'); s = attemptFrequency(s, ['88']); s = go(s, 'power'); s = take(s, 'power-reel'); s = connectBreaker(s, ['antenna', 'emergency', 'studio']); s = go(s, 'archive'); s = take(s, 'archive-log');
    s = arrangeRecordings(s, ['arrival', 'storm', 'warning', 'erasure']); expect(s.recordings.status).toBe('active'); expect(s.recordings.feedback).toContain('4개 중 2개');
    s = arrangeRecordings(s, ['storm', 'arrival', 'warning', 'erasure']); s = go(s, 'studio'); s = take(s, 'studio-flashlight'); s = take(s, 'studio-filters');
    s = selectFlashlightFilter(s, ['red', 'blue', 'amber']); expect(s.flashlight.status).toBe('active');
    s = selectFlashlightFilter(s, ['2', '1', '3']); expect(s.flashlight.status).toBe('solved');
  });

  it('selects the false statement before either ending can be reached', () => {
    const ready = fullInvestigation(['record', 'record', 'record'], false);
    const inBooth = { ...ready, location: 'booth' as Location };
    const wrong = chooseFinalStatement(inBooth, 2);
    expect(wrong.finalStatement.status).toBe('active'); expect(wrong.message).toContain('뒷받침');
    const right = chooseFinalStatement(wrong, 0);
    expect(right.finalStatement.status).toBe('solved'); expect(right.rememberedSibling).toBe(true);
    expect(chooseFinalStatement(right, 2)).toEqual(right);
  });

  it('reaches two endings from initial state through the real route', () => {
    const restoreReady = fullInvestigation(['record', 'record', 'record']);
    expect(endingAvailability(restoreReady)).toMatchObject({ restore: true, erase: false, human: false });
    const restore = chooseEnding(restoreReady, 'restore');
    expect(restore.ending).toBe('restore');
    const eraseReady = fullInvestigation(['delete', 'delete', 'delete']);
    expect(endingAvailability(eraseReady)).toMatchObject({ restore: false, erase: true, human: false });
    const erased = chooseEnding(eraseReady, 'erase');
    expect(erased.ending).toBe('erase');
    expect(restore.message).not.toBe(erased.message);
  });

  it('reaches the third ending through one real contradictory memory choice', () => {
    const ready = fullInvestigation(['record', 'record', 'delete']);
    expect(ready.contradictions).toBe(1);
    const human = chooseEnding(ready, 'human');
    expect(human.ending).toBe('human');
    expect(human.message).toContain('동생');
  });

  it('makes each memory choice change the signal state immediately', () => {
    let trusted = initialState(); trusted = go(trusted, 'lobby'); trusted = take(trusted, 'lobby-storm-note');
    const trustBefore = trusted.tension; trusted = resolveEditorialChoice(trusted, 'record');
    expect(trusted.tension).toBeLessThan(trustBefore); expect(trusted.message).toContain('또렷해졌다');
    let doubted = initialState(); doubted = go(doubted, 'lobby'); doubted = take(doubted, 'lobby-storm-note');
    const fluidBefore = doubted.correctionFluid; doubted = resolveEditorialChoice(doubted, 'delete');
    expect(doubted.correctionFluid).toBe(fluidBefore + 1); expect(doubted.message).toContain('수정액');
  });

  it('round-trips sets and puzzle progress, while safely resetting incompatible or malformed saves', () => {
    const progress = fullInvestigation();
    const roundTrip = deserialize(serialize(progress));
    expect(roundTrip.version).toBe(9); expect(roundTrip.frequency.status).toBe('solved'); expect(roundTrip.finalStatement.status).toBe('solved'); expect(roundTrip.inventory).toEqual(progress.inventory);
    const legacy = deserialize(JSON.stringify({ version: 8, location: 'roof', inventory: ['roof-key'], ending: 'erase' }));
    expect(legacy.version).toBe(9); expect(legacy.location).toBe('entrance'); expect(legacy.ending).toBeUndefined(); expect(legacy.inventory).toEqual([]);
    const saved = JSON.parse(serialize(progress));
    for (const mutation of [
      { ...saved, location: 'missing-room' },
      { ...saved, ending: 'restore\" onclick=\"alert(1)' },
      { ...saved, frequency: { status: 'solved' } },
      { ...saved, clues: ['false-script', 'invented-clue'] },
      { ...saved, clueDecisions: { ...saved.clueDecisions, invented: 'record' } },
      { ...saved, tension: 'loud' },
      { ...saved, tension: -1 },
      { ...saved, tension: 101 },
      { ...saved, ink: -1 },
      { ...saved, correctionFluid: 3 },
      { ...saved, editorialScore: 4 },
      { ...saved, contradictions: 4 },
      { ...saved, failedActions: -1 },
      { ...saved, frequency: { ...saved.frequency, attempts: 10001 } },
    ]) {
      const reset = deserialize(JSON.stringify(mutation));
      expect(reset.location).toBe('entrance'); expect(reset.ending).toBeUndefined(); expect(reset.inventory).toEqual([]);
    }
  });

  it('keeps clues editorial but never turns item pairs into automatic gates', () => {
    let s = initialState(); s = go(s, 'lobby'); s = take(s, 'lobby-storm-note');
    expect(s.pendingClue).toBe('storm-note');
    s = { ...s, pendingClue: undefined, clues: new Set(['storm-note']) };
    expect(visibleHotspots(s).map((h) => h.id)).not.toContain('lobby-storm-note');
  });
});
