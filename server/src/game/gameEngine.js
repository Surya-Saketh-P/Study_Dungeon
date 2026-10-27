/**
 * Deterministic Game Engine for Study Dungeon
 * All damage, HP, XP, streak, and progression logic lives here.
 * Strictly deterministic, server-only execution.
 */

export const INITIAL_PLAYER_HP = 100;
export const WRONG_ANSWER_HP_PENALTY = 20;
export const BASE_CORRECT_XP = 10;
export const STREAK_BONUS_XP = 5;
export const MAX_STREAK_BONUS_XP = 30;
export const MAX_BOSS_ALLOWED_MISSES = 2;

/**
 * Returns hit points required to defeat a monster based on difficulty
 * Diff 1 = 2 hits; Diff 2 & 3 = 3 hits; Boss = 5 hits
 */
export function getMonsterMaxHP(difficulty, isBoss = false) {
  if (isBoss) return 5;
  if (difficulty === 1) return 2;
  return 3;
}

/**
 * Calculates HP changes for a given answer
 */
export function calculateDamage(isCorrect) {
  if (isCorrect) {
    return {
      monsterDamage: 1,
      playerDamage: 0,
    };
  }
  return {
    monsterDamage: 0,
    playerDamage: WRONG_ANSWER_HP_PENALTY,
  };
}

/**
 * Calculates XP earned and new streak
 */
export function calculateXPAndStreak(isCorrect, currentStreak) {
  if (!isCorrect) {
    return {
      xpEarned: 0,
      newStreak: 0,
    };
  }

  const bonus = Math.min(currentStreak * STREAK_BONUS_XP, MAX_STREAK_BONUS_XP);
  const xpEarned = BASE_CORRECT_XP + bonus;
  const newStreak = currentStreak + 1;

  return {
    xpEarned,
    newStreak,
  };
}

/**
 * Checks if a floor's boss is unlocked based on defeated regular monsters
 */
export function isBossUnlocked(floorMonsters, defeatedMonsterIds) {
  const regularMonsters = floorMonsters.filter((m) => !m.is_boss);
  if (regularMonsters.length === 0) return true;

  const defeatedSet = new Set(defeatedMonsterIds.map(String));
  return regularMonsters.every((m) => defeatedSet.has(m._id ? m._id.toString() : m.id));
}

/**
 * Evaluates mastery state transition for a monster
 * PRD: Slain (answered correctly twice), Wounded (mixed results), Untouched (never encountered)
 */
export function evaluateMastery(previousMastery, isCorrect) {
  const currentStreak = (previousMastery?.streak || 0) + (isCorrect ? 1 : 0);
  const finalStreak = isCorrect ? currentStreak : 0;

  let last_result = 'wounded';
  if (isCorrect && finalStreak >= 2) {
    last_result = 'slain';
  } else if (!isCorrect) {
    last_result = 'wounded';
  }

  // Simple spaced-repetition interval ladder (PRD F12)
  const interval_days = isCorrect ? Math.min((previousMastery?.interval_days || 1) * 2, 30) : 1;
  const due_at = new Date(Date.now() + interval_days * 24 * 60 * 60 * 1000);

  return {
    streak: finalStreak,
    interval_days,
    due_at,
    last_result,
  };
}

/**
 * Computes ranked weak spots from a list of attempts
 */
export function rankWeakSpots(attempts) {
  const map = new Map();

  for (const att of attempts) {
    const key = att.concept_name || 'General Concept';
    if (!map.has(key)) {
      map.set(key, {
        concept_name: key,
        monster_id: att.monster_id,
        total: 0,
        correct: 0,
        misses: 0,
        total_time_ms: 0,
      });
    }

    const item = map.get(key);
    item.total += 1;
    item.total_time_ms += att.time_ms || 0;
    if (att.is_correct) {
      item.correct += 1;
    } else {
      item.misses += 1;
    }
  }

  const list = Array.from(map.values()).map((item) => {
    const accuracy = item.total > 0 ? (item.correct / item.total) * 100 : 0;
    const avg_time_ms = item.total > 0 ? Math.round(item.total_time_ms / item.total) : 0;
    return {
      concept_name: item.concept_name,
      monster_id: item.monster_id,
      total: item.total,
      correct: item.correct,
      misses: item.misses,
      accuracy: Math.round(accuracy),
      avg_time_ms,
    };
  });

  // Rank by most misses / lowest accuracy first, then longest response time
  return list.sort((a, b) => {
    if (b.misses !== a.misses) return b.misses - a.misses;
    if (a.accuracy !== b.accuracy) return a.accuracy - b.accuracy;
    return b.avg_time_ms - a.avg_time_ms;
  });
}
