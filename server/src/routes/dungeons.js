import express from 'express';
import { pool } from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// GET /api/dungeons - List user's dungeons
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Fetch user's dungeons or demo dungeons (demo dungeons may have user_id = 0 or 1)
    const [dungeons] = await pool.execute(
      `SELECT 
        d.id,
        d.title,
        d.status,
        d.error_message,
        d.created_at,
        COUNT(DISTINCT f.id) AS floor_count,
        COUNT(DISTINCT m.id) AS monster_count
       FROM dungeons d
       LEFT JOIN floors f ON f.dungeon_id = d.id
       LEFT JOIN monsters m ON m.floor_id = f.id
       WHERE d.user_id = ? OR d.user_id = 0
       GROUP BY d.id
       ORDER BY d.created_at DESC`,
      [userId]
    );

    return res.json({ dungeons });
  } catch (err) {
    console.error('List dungeons error:', err);
    return res.status(500).json({ error: 'Failed to retrieve dungeons' });
  }
});

// GET /api/dungeons/:id - Dungeon details for map screen
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const dungeonId = req.params.id;
    const userId = req.user.id;

    const [dungeons] = await pool.execute(
      'SELECT id, user_id, title, status, error_message, created_at FROM dungeons WHERE id = ?',
      [dungeonId]
    );

    if (dungeons.length === 0) {
      return res.status(404).json({ error: 'Dungeon not found' });
    }

    const dungeon = dungeons[0];

    // Security check: must belong to user or be a global demo (user_id = 0)
    if (dungeon.user_id !== userId && dungeon.user_id !== 0) {
      return res.status(403).json({ error: 'Access denied to this dungeon' });
    }

    // Fetch floors ordered by order_index
    const [floors] = await pool.execute(
      'SELECT id, dungeon_id, title, order_index FROM floors WHERE dungeon_id = ? ORDER BY order_index ASC',
      [dungeonId]
    );

    // Fetch monsters with user mastery status
    const floorIds = floors.map((f) => f.id);
    let monsters = [];

    if (floorIds.length > 0) {
      const placeholders = floorIds.map(() => '?').join(',');
      const [monsterRows] = await pool.execute(
        `SELECT 
          m.id,
          m.floor_id,
          m.concept_name,
          m.summary,
          m.difficulty,
          m.is_boss,
          COALESCE(mast.last_result, 'untouched') as mastery_state,
          COALESCE(mast.streak, 0) as mastery_streak
         FROM monsters m
         LEFT JOIN mastery mast ON mast.monster_id = m.id AND mast.user_id = ?
         WHERE m.floor_id IN (${placeholders})
         ORDER BY m.is_boss ASC, m.id ASC`,
        [userId, ...floorIds]
      );
      monsters = monsterRows;
    }

    // Attach monsters to their respective floors
    const floorsWithMonsters = floors.map((floor) => ({
      ...floor,
      monsters: monsters.filter((m) => m.floor_id === floor.id),
    }));

    return res.json({
      dungeon: {
        ...dungeon,
        floors: floorsWithMonsters,
      },
    });
  } catch (err) {
    console.error('Get dungeon error:', err);
    return res.status(500).json({ error: 'Failed to retrieve dungeon details' });
  }
});

export default router;
