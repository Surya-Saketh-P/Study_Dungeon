import express from 'express';
import multer from 'multer';
import { Dungeon, Mastery } from '../models/index.js';
import { authenticateToken } from '../middleware/auth.js';
import { extractTextFromSource, processDungeonGeneration } from '../services/pipeline.js';
import { startDungeonRun } from './runs.js';

const upload = multer({
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB limit
});

const router = express.Router();

// POST /api/dungeons/:id/runs - Start a run
router.post('/:id/runs', authenticateToken, startDungeonRun);

// POST /api/dungeons - Create dungeon from text or PDF (asynchronous, returns 202)
router.post('/', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    const userId = req.user.id;
    const title = (req.body && req.body.title ? req.body.title.trim() : '') || 'My Study Dungeon';

    let rawText = '';
    if (req.file) {
      rawText = await extractTextFromSource({
        buffer: req.file.buffer,
        mimeType: req.file.mimetype,
      });
    } else if (req.body && req.body.text) {
      rawText = req.body.text;
    }

    if (!rawText || rawText.trim().length < 50) {
      return res.status(400).json({
        error: 'Please provide at least 50 characters of study notes or upload a valid text-based PDF.',
      });
    }

    // Insert dungeon in 'processing' status
    const dungeon = await Dungeon.create({
      user_id: userId,
      title,
      status: 'processing',
    });

    // Trigger generation asynchronously
    processDungeonGeneration(dungeon._id, rawText).catch((err) => {
      console.error(`Background generation failed for dungeon ${dungeon._id}:`, err);
    });

    return res.status(202).json({
      id: dungeon._id.toString(),
      status: 'processing',
      message: 'Dungeon generation initiated. Poll status until ready.',
    });
  } catch (err) {
    console.error('Create dungeon error:', err);
    return res.status(500).json({ error: err.message || 'Failed to initiate dungeon creation' });
  }
});

// GET /api/dungeons/:id/status - Lightweight status polling endpoint
router.get('/:id/status', authenticateToken, async (req, res) => {
  try {
    const dungeon = await Dungeon.findById(req.params.id);
    if (!dungeon) {
      return res.status(404).json({ error: 'Dungeon not found' });
    }

    const userId = req.user.id;
    if (dungeon.user_id.toString() !== userId && dungeon.user_id !== '0' && dungeon.user_id !== 0) {
      return res.status(403).json({ error: 'Access denied' });
    }

    return res.json({
      id: dungeon._id.toString(),
      status: dungeon.status,
      error_message: dungeon.error_message,
    });
  } catch (err) {
    console.error('Dungeon status error:', err);
    return res.status(500).json({ error: 'Failed to retrieve dungeon status' });
  }
});

// GET /api/dungeons - List user's dungeons
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const dungeons = await Dungeon.find({
      $or: [{ user_id: userId }, { user_id: '0' }, { user_id: 0 }],
    }).sort({ created_at: -1 });

    const formatted = dungeons.map((d) => {
      let monsterCount = 0;
      (d.floors || []).forEach((f) => {
        monsterCount += (f.monsters || []).length;
      });

      return {
        id: d._id.toString(),
        title: d.title,
        status: d.status,
        error_message: d.error_message,
        created_at: d.created_at,
        floor_count: (d.floors || []).length,
        monster_count: monsterCount,
      };
    });

    return res.json({ dungeons: formatted });
  } catch (err) {
    console.error('List dungeons error:', err);
    return res.status(500).json({ error: 'Failed to retrieve dungeons' });
  }
});

// GET /api/dungeons/:id - Dungeon details for map screen (with mastery state)
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const dungeon = await Dungeon.findById(req.params.id);
    if (!dungeon) {
      return res.status(404).json({ error: 'Dungeon not found' });
    }

    const userId = req.user.id;
    if (dungeon.user_id.toString() !== userId && dungeon.user_id !== '0' && dungeon.user_id !== 0) {
      return res.status(403).json({ error: 'Access denied to this dungeon' });
    }

    // Fetch user mastery records for monsters in this dungeon
    const masteryRecords = await Mastery.find({ user_id: userId });
    const masteryMap = new Map();
    masteryRecords.forEach((m) => {
      masteryMap.set(m.monster_id, m);
    });

    // Map floors and monsters WITHOUT exposing correct answers
    const sanitizedFloors = (dungeon.floors || []).map((floor) => ({
      id: floor._id ? floor._id.toString() : floor.id,
      title: floor.title,
      order_index: floor.order_index,
      monsters: (floor.monsters || []).map((m) => {
        const mId = m._id ? m._id.toString() : m.id;
        const mast = masteryMap.get(mId);
        return {
          id: mId,
          concept_name: m.concept_name,
          summary: m.summary,
          difficulty: m.difficulty,
          is_boss: m.is_boss,
          question_count: (m.questions || []).length,
          mastery_state: mast ? mast.last_result : 'untouched',
          mastery_streak: mast ? mast.streak : 0,
        };
      }),
    }));

    return res.json({
      dungeon: {
        id: dungeon._id.toString(),
        title: dungeon.title,
        status: dungeon.status,
        error_message: dungeon.error_message,
        created_at: dungeon.created_at,
        floors: sanitizedFloors,
      },
    });
  } catch (err) {
    console.error('Get dungeon error:', err);
    return res.status(500).json({ error: 'Failed to retrieve dungeon details' });
  }
});

export default router;
