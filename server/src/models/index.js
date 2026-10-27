import mongoose from 'mongoose';

const { Schema } = mongoose;

// User Model
const userSchema = new Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password_hash: { type: String, required: true },
  display_name: { type: String, required: true },
  created_at: { type: Date, default: Date.now },
});

// Embedded Question Schema
const questionSchema = new Schema({
  type: { type: String, enum: ['mcq', 'short'], default: 'mcq' },
  prompt: { type: String, required: true },
  options: [{ type: String, required: true }],
  correct_answer: { type: String, required: true },
  explanation: { type: String, required: true },
});

// Embedded Monster Schema
const monsterSchema = new Schema({
  concept_name: { type: String, required: true },
  summary: { type: String, required: true },
  difficulty: { type: Number, default: 1, min: 1, max: 3 },
  is_boss: { type: Boolean, default: false },
  questions: [questionSchema],
});

// Embedded Floor Schema
const floorSchema = new Schema({
  title: { type: String, required: true },
  order_index: { type: Number, required: true, default: 1 },
  monsters: [monsterSchema],
});

// Dungeon Model
const dungeonSchema = new Schema({
  user_id: { type: Schema.Types.Mixed, required: true, index: true },
  title: { type: String, required: true },
  source_hash: { type: String, index: true, default: null },
  status: { type: String, enum: ['processing', 'ready', 'failed'], default: 'processing', index: true },
  error_message: { type: String, default: null },
  floors: [floorSchema],
  created_at: { type: Date, default: Date.now },
});

// Run Model
const runSchema = new Schema({
  user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  dungeon_id: { type: Schema.Types.ObjectId, ref: 'Dungeon', required: true, index: true },
  player_hp: { type: Number, default: 100 },
  xp: { type: Number, default: 0 },
  streak: { type: Number, default: 0 },
  status: { type: String, enum: ['active', 'won', 'lost'], default: 'active', index: true },
  mode: { type: String, enum: ['normal', 'revenge'], default: 'normal' },
  defeated_monster_ids: [{ type: String }],
  requeued_monsters: [{ type: String }],
  boss_misses: { type: Number, default: 0 },
  started_at: { type: Date, default: Date.now },
  finished_at: { type: Date, default: null },
});

// Attempt Model
const attemptSchema = new Schema({
  run_id: { type: Schema.Types.ObjectId, ref: 'Run', required: true, index: true },
  monster_id: { type: String, required: true },
  concept_name: { type: String, default: '' },
  question_id: { type: String, required: true },
  user_answer: { type: String, required: true },
  is_correct: { type: Boolean, required: true },
  time_ms: { type: Number, default: 0 },
  created_at: { type: Date, default: Date.now },
});

// Mastery Model
const masterySchema = new Schema({
  user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  monster_id: { type: String, required: true },
  concept_name: { type: String, default: '' },
  streak: { type: Number, default: 0 },
  interval_days: { type: Number, default: 1 },
  due_at: { type: Date, default: Date.now },
  last_result: { type: String, enum: ['slain', 'wounded', 'untouched'], default: 'untouched' },
});
masterySchema.index({ user_id: 1, monster_id: 1 }, { unique: true });

export const User = mongoose.model('User', userSchema);
export const Dungeon = mongoose.model('Dungeon', dungeonSchema);
export const Run = mongoose.model('Run', runSchema);
export const Attempt = mongoose.model('Attempt', attemptSchema);
export const Mastery = mongoose.model('Mastery', masterySchema);
