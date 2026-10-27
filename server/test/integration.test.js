import test from 'node:test';
import assert from 'node:assert/strict';
import { connectDB, disconnectDB } from '../src/db.js';
import { Dungeon, Run, User, Attempt, Mastery } from '../src/models/index.js';
import { seedDemoData } from '../scripts/seed.js';

test('Integration: End-to-End Game Loop with MongoDB', async () => {
  await connectDB();
  await seedDemoData();

  // 1. Verify demo user and dungeon exist
  const user = await User.findOne({ email: 'demo@studydungeon.com' });
  assert.ok(user, 'Demo user should exist');

  const dungeon = await Dungeon.findOne({ title: 'Data Structures & Algorithms Cavern' });
  assert.ok(dungeon, 'Demo dungeon should exist');
  assert.equal(dungeon.status, 'ready');

  // 2. Start a run
  const run = await Run.create({
    user_id: user._id,
    dungeon_id: dungeon._id,
    player_hp: 100,
    xp: 0,
    streak: 0,
    status: 'active',
    mode: 'normal',
    defeated_monster_ids: [],
    requeued_monsters: [],
    boss_misses: 0,
    started_at: new Date(),
  });
  assert.equal(run.player_hp, 100);
  assert.equal(run.xp, 0);

  // 3. Inspect first encounter
  const firstMonster = dungeon.floors[0].monsters[0];
  const firstQuestion = firstMonster.questions[0];

  // 4. Test wrong answer penalty
  const wrongAttempt = await Attempt.create({
    run_id: run._id,
    monster_id: firstMonster._id.toString(),
    concept_name: firstMonster.concept_name,
    question_id: firstQuestion._id.toString(),
    user_answer: 'Wrong Answer Option',
    is_correct: false,
    time_ms: 3200,
  });

  run.player_hp -= 20;
  run.streak = 0;
  await run.save();

  assert.equal(run.player_hp, 80, 'Player HP should decrease by 20 on wrong answer');

  // 5. Test correct answer bonus
  const correctAttempt = await Attempt.create({
    run_id: run._id,
    monster_id: firstMonster._id.toString(),
    concept_name: firstMonster.concept_name,
    question_id: firstQuestion._id.toString(),
    user_answer: firstQuestion.correct_answer,
    is_correct: true,
    time_ms: 1500,
  });

  run.xp += 10;
  run.streak = 1;
  await run.save();

  assert.equal(run.xp, 10, 'Player XP should increase by 10 on correct answer');
  assert.equal(run.streak, 1);

  // 6. Verify attempts and analytics
  const attempts = await Attempt.find({ run_id: run._id });
  assert.equal(attempts.length, 2);

  const missedConcepts = attempts.filter((a) => !a.is_correct).map((a) => a.concept_name);
  assert.ok(missedConcepts.includes(firstMonster.concept_name));

  await disconnectDB();
});
