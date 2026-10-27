import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateDamage,
  calculateXPAndStreak,
  getMonsterMaxHP,
  isBossUnlocked,
  evaluateMastery,
  rankWeakSpots,
  WRONG_ANSWER_HP_PENALTY,
  BASE_CORRECT_XP,
} from '../src/game/gameEngine.js';

test('GameEngine: Damage calculation applies PRD rules', () => {
  const correct = calculateDamage(true);
  assert.equal(correct.monsterDamage, 1);
  assert.equal(correct.playerDamage, 0);

  const wrong = calculateDamage(false);
  assert.equal(wrong.monsterDamage, 0);
  assert.equal(wrong.playerDamage, WRONG_ANSWER_HP_PENALTY);
  assert.equal(wrong.playerDamage, 20);
});

test('GameEngine: XP calculation scales with streak and caps at +30 bonus', () => {
  // Hit 1: Streak 0 -> Base 10 XP
  const hit1 = calculateXPAndStreak(true, 0);
  assert.equal(hit1.xpEarned, BASE_CORRECT_XP);
  assert.equal(hit1.newStreak, 1);

  // Hit 2: Streak 1 -> Base 10 + 5 bonus = 15 XP
  const hit2 = calculateXPAndStreak(true, 1);
  assert.equal(hit2.xpEarned, 15);
  assert.equal(hit2.newStreak, 2);

  // Hit 3: Streak 2 -> Base 10 + 10 bonus = 20 XP
  const hit3 = calculateXPAndStreak(true, 2);
  assert.equal(hit3.xpEarned, 20);
  assert.equal(hit3.newStreak, 3);

  // High streak: Streak 10 -> Base 10 + capped 30 bonus = 40 XP
  const cappedHit = calculateXPAndStreak(true, 10);
  assert.equal(cappedHit.xpEarned, 40);

  // Miss: Resets streak to 0 and yields 0 XP
  const miss = calculateXPAndStreak(false, 5);
  assert.equal(miss.xpEarned, 0);
  assert.equal(miss.newStreak, 0);
});

test('GameEngine: Monster HP adheres to PRD difficulty thresholds', () => {
  assert.equal(getMonsterMaxHP(1, false), 2);
  assert.equal(getMonsterMaxHP(2, false), 3);
  assert.equal(getMonsterMaxHP(3, false), 3);
  assert.equal(getMonsterMaxHP(3, true), 5); // Boss
});

test('GameEngine: Boss unlocks only when all floor regular monsters are defeated', () => {
  const floorMonsters = [
    { _id: 'm1', is_boss: false },
    { _id: 'm2', is_boss: false },
    { _id: 'boss1', is_boss: true },
  ];

  assert.equal(isBossUnlocked(floorMonsters, ['m1']), false);
  assert.equal(isBossUnlocked(floorMonsters, ['m1', 'm2']), true);
});

test('GameEngine: Mastery transitions to Slain after 2 consecutive correct answers', () => {
  const initial = { streak: 0, interval_days: 1, last_result: 'untouched' };
  
  // 1st correct answer -> Wounded / 1 streak
  const step1 = evaluateMastery(initial, true);
  assert.equal(step1.streak, 1);
  assert.equal(step1.last_result, 'wounded');

  // 2nd correct answer -> Slain / 2 streak
  const step2 = evaluateMastery(step1, true);
  assert.equal(step2.streak, 2);
  assert.equal(step2.last_result, 'slain');

  // Wrong answer -> resets streak to 0 and becomes wounded
  const step3 = evaluateMastery(step2, false);
  assert.equal(step3.streak, 0);
  assert.equal(step3.last_result, 'wounded');
});

test('GameEngine: rankWeakSpots ranks concepts with most misses first', () => {
  const attempts = [
    { concept_name: 'Concept A', is_correct: true, time_ms: 1000 },
    { concept_name: 'Concept A', is_correct: true, time_ms: 1200 },
    { concept_name: 'Concept B', is_correct: false, time_ms: 3000 },
    { concept_name: 'Concept B', is_correct: true, time_ms: 2500 },
    { concept_name: 'Concept C', is_correct: false, time_ms: 4000 },
    { concept_name: 'Concept C', is_correct: false, time_ms: 3500 },
  ];

  const ranked = rankWeakSpots(attempts);
  assert.equal(ranked[0].concept_name, 'Concept C'); // 2 misses
  assert.equal(ranked[0].misses, 2);
  assert.equal(ranked[1].concept_name, 'Concept B'); // 1 miss
  assert.equal(ranked[2].concept_name, 'Concept A'); // 0 misses
});
