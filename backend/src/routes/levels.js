const express = require('express');
const pool = require('../db/pool');

const router = express.Router();

router.get('/:level', async (req, res) => {
  try {
    const level = parseInt(req.params.level);
    
    if (isNaN(level) || level < 1) {
      return res.status(400).json({
        error: true,
        message: 'Invalid level number',
      });
    }

    if (level <= 200) {
      // Get from database
      const [levels] = await pool.execute(
        'SELECT level, stage_name FROM levels WHERE level = ?',
        [level]
      );

      if (levels.length === 0) {
        return res.status(404).json({
          error: true,
          message: 'Level not found',
        });
      }

      return res.json(levels[0]);
    }

    // Virtual levels beyond 200
    const extraLevels = level - 200;
    return res.json({
      level,
      stage_name: `The Last Horizon+${extraLevels}`,
    });
  } catch (error) {
    throw error;
  }
});

module.exports = router;