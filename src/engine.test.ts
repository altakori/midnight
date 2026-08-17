import { describe, expect, it } from 'vitest';
import { ITEM_INFO, arrangeRecordings, arrivalMessage, attemptFrequency, availableLocations, chooseEnding, chooseFinalStatement, connectBreaker, deserialize, endingAvailability, initialState, inspectHotspot, locationAvailable, move, resolveEditorialChoice, selectFlashlightFilter, serialize, visibleHotspots, type EditorialAction, type GameState, type Location } from './engine';

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

  it('keeps station movement linear instead of wrapping between distant ends', () => {
    let s = initialState();
    expect(move(s, -1)).toBe(s);
    s = move(s, 1);
    expect(s.location).toBe('lobby');
    s = go(s, 'power');
    expect(move(s, 1)).toBe(s);
    expect(s.location).toBe('power');
  });

  it('changes revisited station reactions according to trusted and doubted memories', () => {
    const base = initialState();
    expect(arrivalMessage(base, 'hall')).toContain('최근 기억');
    expect(arrivalMessage({ ...base, clueDecisions: { 'storm-note': 'record' }, editorialScore: 1 }, 'hall')).toContain('하윤의 숨');
    expect(arrivalMessage({ ...base, clueDecisions: { 'storm-note': 'delete' }, editorialScore: -1 }, 'hall')).toContain('내 이름');
    expect(arrivalMessage({ ...base, clueDecisions: { 'storm-note': 'record', 'sibling-call': 'delete' }, editorialScore: 0 }, 'hall')).toContain('왼쪽 스피커');
  });

  it('adds distinct environmental aftermath beats to physical item pickups', () => {
    let s = initialState();
    const reactions: string[] = [];

    s = take(s, 'entrance-radio');
    reactions.push(s.message);
    expect(s.inventory).toEqual(['handheld-radio']);
    expect(s.message).toContain('입구 스피커');
    expect(visibleHotspots(s).some((hotspot) => hotspot.id === 'entrance-radio')).toBe(false);

    s = go(s, 'lobby'); s = take(s, 'lobby-frequency');
    reactions.push(s.message);
    expect(s.inventory).toHaveLength(2);
    expect(s.message).toContain('초침');

    s = go(s, 'hall'); s = take(s, 'hall-gloves');
    reactions.push(s.message);
    expect(s.inventory).toHaveLength(3);
    expect(s.message).toContain('긁은 세 줄');
    expect(new Set(reactions).size).toBe(3);

    const allReactions = Object.values(ITEM_INFO).map((item) => item.pickupReaction);
    expect(allReactions.every((reaction) => reaction.length > 0)).toBe(true);
    expect(new Set(allReactions).size).toBe(allReactions.length);
  });

  it('requires wrong-answer attempts and does not solve by collecting tools', () => {
    let s = initialState();
    s = take(s, 'entrance-radio'); s = go(s, 'lobby'); s = take(s, 'lobby-frequency'); s = go(s, 'hall'); s = take(s, 'hall-gloves'); s = go(s, 'transmitter'); s = take(s, 'transmitter-key');
    s = attemptFrequency(s, ['84']);
    expect(s.frequency.status).toBe('active'); expect(s.frequency.attempts).toBe(1); expect(s.message).toContain('88.0 MHz'); expect(s.failedActions).toBe(1);
    expect(availableLocations(s)).not.toContain('archive');
    s = attemptFrequency(s, ['88']);
    expect(s.frequency.status).toBe('solved');
  });

  it('solves the three-circuit power budget only after frequency', () => {
    let s = initialState();
    s = take(s, 'entrance-radio'); s = go(s, 'lobby'); s = take(s, 'lobby-frequency'); s = go(s, 'hall'); s = take(s, 'hall-gloves'); s = go(s, 'transmitter'); s = take(s, 'transmitter-key'); s = attemptFrequency(s, ['88']); s = go(s, 'power');
    s = connectBreaker(s, ['black', 'yellow', 'blue', 'red']);
    expect(s.breaker.status).toBe('active'); expect(locationAvailable(s, 'archive')).toBe(false);
    s = connectBreaker(s, ['antenna', 'emergency', 'studio']);
    expect(s.breaker.status).toBe('solved'); expect(locationAvailable(s, 'archive')).toBe(true);
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
    expect(right.finalStatement.status).toBe('solved');
    expect(chooseFinalStatement(right, 2)).toEqual(right);
  });

  it('reaches two endings from initial state through the real route', () => {
    const restoreReady = fullInvestigation(['record', 'record', 'record']);
    expect(endingAvailability(restoreReady)).toMatchObject({ restore: true, erase: false, human: false });
    const restore = chooseEnding(restoreReady, 'restore');
    expect(restore.ending).toBe('restore');
    const eraseReady = fullInvestigation(['delete', 'delete', 'delete']);
    expect(endingAvailability(eraseReady)).toMatchObject({ restore: false, erase: true, human: false, illusion: true });
    const erased = chooseEnding(eraseReady, 'erase');
    expect(erased.ending).toBe('erase');
    expect(restore.message).not.toBe(erased.message);
  });

  it('reaches the third ending through one real contradictory memory choice', () => {
    const ready = fullInvestigation(['record', 'record', 'delete']);
    expect(ready.contradictions).toBe(1);
    const human = chooseEnding(ready, 'human');
    expect(human.ending).toBe('human');
    expect(human.message).toContain('동시에 비상 주파수로 송출');
    expect(human.message).not.toContain('송신기를 부수고');
  });

  it('reveals the broadcast-created Hayun ending only after doubting all three memories', () => {
    const allDoubted = fullInvestigation(['delete', 'delete', 'delete']);
    expect(endingAvailability(allDoubted).illusion).toBe(true);
    const illusion = chooseEnding(allDoubted, 'illusion');
    expect(illusion.ending).toBe('illusion');
    expect(illusion.message).toContain('빈자리');
    const oneTrusted = fullInvestigation(['delete', 'delete', 'record']);
    expect(endingAvailability(oneTrusted).illusion).toBe(false);
    expect(chooseEnding(oneTrusted, 'illusion').ending).toBeUndefined();
  });

  it('gives every collectible a substantial investigation record', () => {
    const entries = Object.values(ITEM_INFO);
    expect(entries).toHaveLength(11);
    for (const entry of entries) {
      expect(entry.description.length).toBeGreaterThan(25);
      expect(entry.detail.length).toBeGreaterThan(90);
    }
    expect(ITEM_INFO['sibling-photo'].detail).toContain('하윤');
    expect(ITEM_INFO['memory-tape'].detail).toContain('파형');
    expect(ITEM_INFO['station-log'].detail).toContain('출입');
  });

  it('keeps all eleven collectibles connected to a required puzzle or ending gate', () => {
    let frequencyReady = initialState(); frequencyReady = take(frequencyReady, 'entrance-radio'); frequencyReady = go(frequencyReady, 'lobby'); frequencyReady = take(frequencyReady, 'lobby-frequency');
    for (const missing of ['handheld-radio', 'frequency-card']) {
      const blocked = attemptFrequency({ ...frequencyReady, inventory: frequencyReady.inventory.filter((id) => id !== missing) }, ['88']);
      expect(blocked.frequency.status).toBe('locked');
    }

    let breakerReady = go(frequencyReady, 'hall'); breakerReady = take(breakerReady, 'hall-gloves'); breakerReady = go(breakerReady, 'transmitter'); breakerReady = take(breakerReady, 'transmitter-key'); breakerReady = attemptFrequency(breakerReady, ['88']); breakerReady = go(breakerReady, 'power');
    for (const missing of ['insulated-gloves', 'breaker-key']) {
      const blocked = connectBreaker({ ...breakerReady, inventory: breakerReady.inventory.filter((id) => id !== missing) }, ['antenna', 'emergency', 'studio']);
      expect(blocked.breaker.status).toBe('locked');
    }

    let recordingReady = take(breakerReady, 'power-reel'); recordingReady = connectBreaker(recordingReady, ['antenna', 'emergency', 'studio']); recordingReady = go(recordingReady, 'archive'); recordingReady = take(recordingReady, 'archive-log');
    for (const missing of ['recording-reel', 'station-log']) {
      const blocked = arrangeRecordings({ ...recordingReady, inventory: recordingReady.inventory.filter((id) => id !== missing) }, ['storm', 'arrival', 'warning', 'erasure']);
      expect(blocked.recordings.status).toBe('locked');
    }

    let lightReady = arrangeRecordings(recordingReady, ['storm', 'arrival', 'warning', 'erasure']); lightReady = go(lightReady, 'studio'); lightReady = take(lightReady, 'studio-flashlight'); lightReady = take(lightReady, 'studio-filters');
    for (const missing of ['flashlight', 'color-filters']) {
      const blocked = selectFlashlightFilter({ ...lightReady, inventory: lightReady.inventory.filter((id) => id !== missing) }, ['2', '1', '3']);
      expect(blocked.flashlight.status).toBe('locked');
    }

    const finalReady = fullInvestigation(['record', 'record', 'record'], false);
    for (const missing of ['sibling-photo', 'memory-tape']) {
      const blocked = chooseFinalStatement({ ...finalReady, inventory: finalReady.inventory.filter((id) => id !== missing) }, 0);
      expect(blocked.finalStatement.status).toBe('locked');
    }
    expect(chooseFinalStatement({ ...finalReady, clues: new Set([...finalReady.clues].filter((id) => id !== 'false-script')) }, 0).finalStatement.status).toBe('locked');

    const endingReady = fullInvestigation();
    const noRoofKey = { ...endingReady, inventory: endingReady.inventory.filter((id) => id !== 'roof-key') };
    expect(chooseEnding(noRoofKey, 'restore').ending).toBeUndefined();
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
    expect(roundTrip.version).toBe(10); expect(roundTrip.frequency.status).toBe('solved'); expect(roundTrip.finalStatement.status).toBe('solved'); expect(roundTrip.inventory).toEqual(progress.inventory);
    const legacy = deserialize(JSON.stringify({ version: 9, location: 'roof', inventory: ['roof-key'], ending: 'erase' }));
    expect(legacy.version).toBe(10); expect(legacy.location).toBe('entrance'); expect(legacy.ending).toBeUndefined(); expect(legacy.inventory).toEqual([]);
    const saved = JSON.parse(serialize(progress));
    for (const removedKey of ['unlocked', 'archiveLit', 'shadowSeen', 'rememberedSibling']) expect(saved).not.toHaveProperty(removedKey);
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
