import express from 'express';
import { Dungeon, Run, Attempt, Mastery } from '../models/index.js';
import { authenticateToken } from '../middleware/auth.js';
import {
  calculateDamage,
  calculateXPAndStreak,
  getMonsterMaxHP,
  evaluateMastery,
  rankWeakSpots,
  MAX_BOSS_ALLOWED_MISSES,
} from '../game/gameEngine.js';

const router = express.Router();

// POST /api/dungeons/:id/runs - Start a new run
export async function startDungeonRun(req, res) {
  try {
    const dungeonId = req.params.id;
    const userId = req.user.id;
    const mode = req.body?.mode === 'revenge' ? 'revenge' : 'normal';

    const dungeon = await Dungeon.findById(dungeonId);
    if (!dungeon || dungeon.status !== 'ready') {
      return res.status(404).json({ error: 'Dungeon not found or not ready yet' });
    }

    const run = await Run.create({
      user_id: userId,
      dungeon_id: dungeonId,
      player_hp: 100,
      xp: 0,
      streak: 0,
      status: 'active',
      mode,
      defeated_monster_ids: [],
      requeued_monsters: [],
      boss_misses: 0,
      started_at: new Date(),
    });

    return res.status(201).json({
      run_id: run._id.toString(),
      player_hp: run.player_hp,
      xp: run.xp,
      status: run.status,
      mode: run.mode,
    });
  } catch (err) {
    console.error('Start run error:', err);
    return res.status(500).json({ error: 'Failed to start run' });
  }
}

// GET /api/runs/:id/next - Retrieve the next encounter
router.get('/:id/next', authenticateToken, async (req, res) => {
  try {
    const runId = req.params.id;
    const userId = req.user.id;

    const run = await Run.findById(runId);
    if (!run) {
      return res.status(404).json({ error: 'Run not found' });
    }

    if (run.user_id.toString() !== userId) {
      return res.status(403).json({ error: 'Access denied to this run' });
    }

    if (run.status !== 'active') {
      return res.json({
        run_status: run.status,
        player_hp: run.player_hp,
        xp: run.xp,
        finished: true,
      });
    }

    const dungeon = await Dungeon.findById(run.dungeon_id);
    if (!dungeon) {
      return res.status(404).json({ error: 'Associated dungeon not found' });
    }

    const defeatedSet = new Set(run.defeated_monster_ids.map(String));

    // Find first floor with undefeated monsters
    let currentFloor = null;
    let targetMonster = null;

    for (const floor of dungeon.floors || []) {
      const regularMonsters = (floor.monsters || []).filter((m) => !m.is_boss);
      const undefeatedRegular = regularMonsters.filter(
        (m) => !defeatedSet.has(m._id.toString())
      );

      if (undefeatedRegular.length > 0) {
        currentFloor = floor;
        targetMonster = undefeatedRegular[0];
        break;
      }

      // If all regular are defeated, check boss
      const boss = (floor.monsters || []).find((m) => m.is_boss);
      if (boss && !defeatedSet.has(boss._id.toString())) {
        currentFloor = floor;
        targetMonster = boss;
        break;
      }
    }

    // If no undefeated monster found, player cleared all floors!
    if (!targetMonster) {
      run.status = 'won';
      run.finished_at = new Date();
      await run.save();

      return res.json({
        run_status: 'won',
        player_hp: run.player_hp,
        xp: run.xp,
        finished: true,
        message: 'Congratulations! You cleared all dungeon floors!',
      });
    }

    const monsterIdStr = targetMonster._id.toString();
    const maxHP = getMonsterMaxHP(targetMonster.difficulty, targetMonster.is_boss);

    // Calculate monster current HP based on successful hits in this run
    const successfulAttempts = await Attempt.countDocuments({
      run_id: run._id,
      monster_id: monsterIdStr,
      is_correct: true,
    });

    const currentHP = Math.max(1, maxHP - successfulAttempts);

    // Select question: pick from questions not yet answered correctly in this run
    const answeredCorrectQuestions = await Attempt.find({
      run_id: run._id,
      monster_id: monsterIdStr,
      is_correct: true,
    }).distinct('question_id');

    const answeredCorrectSet = new Set(answeredCorrectQuestions.map(String));
    let availableQuestions = (targetMonster.questions || []).filter(
      (q) => !answeredCorrectSet.has(q._id.toString())
    );

    if (availableQuestions.length === 0) {
      // If all distinct questions were seen, draw from entire monster pool
      availableQuestions = targetMonster.questions || [];
    }

    // Pick first available question
    const questionObj = availableQuestions[0];
    if (!questionObj) {
      return res.status(500).json({ error: 'No questions available for this monster' });
    }

    // CRITICAL: Withhold correct_answer! Send only options
    return res.json({
      run_id: run._id.toString(),
      run_status: 'active',
      player_hp: run.player_hp,
      xp: run.xp,
      streak: run.streak,
      floor_title: currentFloor.title,
      monster: {
        id: monsterIdStr,
        concept_name: targetMonster.concept_name,
        summary: targetMonster.summary,
        difficulty: targetMonster.difficulty,
        is_boss: targetMonster.is_boss,
        current_hp: currentHP,
        max_hp: maxHP,
      },
      question: {
        id: questionObj._id.toString(),
        type: questionObj.type,
        prompt: questionObj.prompt,
        options: questionObj.options, // Options array only, NO correct_answer
      },
    });
  } catch (err) {
    console.error('Next encounter error:', err);
    return res.status(500).json({ error: 'Failed to retrieve next encounter' });
  }
});

// POST /api/runs/:id/answer - Submit answer and grade on server
router.post('/:id/answer', authenticateToken, async (req, res) => {
  try {
    const runId = req.params.id;
    const userId = req.user.id;
    const { question_id, monster_id, user_answer, time_ms = 0 } = req.body;

    if (!question_id || !monster_id || user_answer === undefined) {
      return res.status(400).json({ error: 'question_id, monster_id, and user_answer are required' });
    }

    const run = await Run.findById(runId);
    if (!run || run.status !== 'active') {
      return res.status(400).json({ error: 'Run is not currently active' });
    }

    if (run.user_id.toString() !== userId) {
      return res.status(403).json({ error: 'Access denied to this run' });
    }

    const dungeon = await Dungeon.findById(run.dungeon_id);
    if (!dungeon) {
      return res.status(404).json({ error: 'Dungeon not found' });
    }

    // Locate monster and question in dungeon structure
    let foundMonster = null;
    let foundQuestion = null;

    for (const floor of dungeon.floors || []) {
      for (const m of floor.monsters || []) {
        if (m._id.toString() === monster_id) {
          foundMonster = m;
          for (const q of m.questions || []) {
            if (q._id.toString() === question_id) {
              foundQuestion = q;
              break;
            }
          }
          break;
        }
      }
      if (foundMonster) break;
    }

    if (!foundMonster || !foundQuestion) {
      return res.status(404).json({ error: 'Question or monster not found in dungeon' });
    }

    // Grade answer strictly on server
    const isCorrect = user_answer.trim() === foundQuestion.correct_answer.trim();
    const damage = calculateDamage(isCorrect);
    const xpCalc = calculateXPAndStreak(isCorrect, run.streak);

    // Apply HP and XP changes
    run.player_hp = Math.max(0, run.player_hp - damage.playerDamage);
    run.xp += xpCalc.xpEarned;
    run.streak = xpCalc.newStreak;

    // Track boss misses if boss encounter
    let bossFailed = false;
    if (foundMonster.is_boss && !isCorrect) {
      run.boss_misses = (run.boss_misses || 0) + 1;
      if (run.boss_misses > MAX_BOSS_ALLOWED_MISSES) {
        bossFailed = true;
        run.player_hp = 0; // 3rd boss miss triggers run defeat
      }
    }

    // Record attempt
    await Attempt.create({
      run_id: run._id,
      monster_id,
      concept_name: foundMonster.concept_name,
      question_id,
      user_answer,
      is_correct: isCorrect,
      time_ms: parseInt(time_ms, 10) || 0,
    });

    // Check monster HP & defeat state
    const maxHP = getMonsterMaxHP(foundMonster.difficulty, foundMonster.is_boss);
    const correctHits = await Attempt.countDocuments({
      run_id: run._id,
      monster_id,
      is_correct: true,
    });

    let monsterDefeated = false;
    if (correctHits >= maxHP) {
      monsterDefeated = true;
      if (!run.defeated_monster_ids.includes(monster_id)) {
        run.defeated_monster_ids.push(monster_id);
      }
    }

    // Check player loss condition
    let runStatus = 'active';
    if (run.player_hp <= 0 || bossFailed) {
      runStatus = 'lost';
      run.status = 'lost';
      run.finished_at = new Date();
    }

    await run.save();

    // Update user mastery record
    const existingMastery = await Mastery.findOne({ user_id: userId, monster_id });
    const updatedMasteryData = evaluateMastery(existingMastery, isCorrect);
    await Mastery.findOneAndUpdate(
      { user_id: userId, monster_id },
      {
        $set: {
          concept_name: foundMonster.concept_name,
          streak: updatedMasteryData.streak,
          interval_days: updatedMasteryData.interval_days,
          due_at: updatedMasteryData.due_at,
          last_result: updatedMasteryData.last_result,
        },
      },
      { upsert: true, new: true }
    );

    return res.json({
      is_correct: isCorrect,
      monster_damage_dealt: damage.monsterDamage,
      player_damage_taken: damage.playerDamage,
      player_hp: run.player_hp,
      xp: run.xp,
      xp_earned: xpCalc.xpEarned,
      streak: run.streak,
      monster_defeated: monsterDefeated,
      monster_remaining_hp: Math.max(0, maxHP - correctHits),
      run_status: runStatus,
      correct_answer: foundQuestion.correct_answer,
      explanation: foundQuestion.explanation,
    });
  } catch (err) {
    console.error('Answer submission error:', err);
    return res.status(500).json({ error: 'Failed to process answer' });
  }
});

// GET /api/runs/:id/summary - Final run stats and ranked weak spots
router.get('/:id/summary', authenticateToken, async (req, res) => {
  try {
    const runId = req.params.id;
    const userId = req.user.id;

    const run = await Run.findById(runId);
    if (!run) {
      return res.status(404).json({ error: 'Run not found' });
    }

    if (run.user_id.toString() !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const attempts = await Attempt.find({ run_id: run._id });
    const totalAnswered = attempts.length;
    const correctCount = attempts.filter((a) => a.is_correct).length;
    const accuracy = totalAnswered > 0 ? Math.round((correctCount / totalAnswered) * 100) : 0;

    const startTime = run.started_at ? new Date(run.started_at).getTime() : Date.now();
    const endTime = run.finished_at ? new Date(run.finished_at).getTime() : Date.now();
    const durationSeconds = Math.max(1, Math.round((endTime - startTime) / 1000));

    const rankedWeakSpots = rankWeakSpots(attempts);

    return res.json({
      run_id: run._id.toString(),
      status: run.status,
      player_hp: run.player_hp,
      xp: run.xp,
      accuracy,
      total_questions_answered: totalAnswered,
      correct_answers: correctCount,
      duration_seconds: durationSeconds,
      defeated_monsters_count: run.defeated_monster_ids.length,
      weak_spots: rankedWeakSpots,
    });
  } catch (err) {
    console.error('Run summary error:', err);
    return res.status(500).json({ error: 'Failed to retrieve run summary' });
  }
});

export default router;
