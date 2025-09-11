const express = require('express');
const pool = require('../db/pool');
const { progressSettleSchema, itemUseSchema } = require('../utils/validate');

const router = express.Router();

router.post('/settle', async (req, res) => {
  try {
    const validatedData = progressSettleSchema.parse(req.body);
    const { uid, level, changeItemsDelta } = validatedData;

    // Get user
    const [users] = await pool.execute(
      'SELECT id FROM users WHERE uid = ?',
      [uid]
    );

    if (users.length === 0) {
      return res.status(404).json({
        error: true,
        message: 'User not found',
      });
    }

    const userId = users[0].id;

    // Get current progress
    const [progress] = await pool.execute(
      'SELECT * FROM user_progress WHERE user_id = ?',
      [userId]
    );

    if (progress.length === 0) {
      // Initialize progress if not exists
      await pool.execute(
        'INSERT INTO user_progress (user_id, current_level, best_level, change_items) VALUES (?, ?, ?, ?)',
        [userId, level, level, Math.max(0, changeItemsDelta)]
      );

      return res.json({
        updated: true,
        progress: {
          currentLevel: level,
          bestLevel: level,
          changeItems: Math.max(0, changeItemsDelta),
        },
      });
    }

    const currentProgress = progress[0];
    const newBestLevel = Math.max(currentProgress.best_level, level);
    const newChangeItems = Math.max(0, currentProgress.change_items + changeItemsDelta);

    // Update progress
    await pool.execute(
      'UPDATE user_progress SET current_level = ?, best_level = ?, change_items = ? WHERE user_id = ?',
      [level, newBestLevel, newChangeItems, userId]
    );

    res.json({
      updated: true,
      progress: {
        currentLevel: level,
        bestLevel: newBestLevel,
        changeItems: newChangeItems,
      },
    });
  } catch (error) {
    if (error.name === 'ZodError') {
      return res.status(400).json({
        error: true,
        message: 'Validation error',
        details: error.errors,
      });
    }
    throw error;
  }
});

router.post('/use', async (req, res) => {
  try {
    const validatedData = itemUseSchema.parse(req.body);
    const { uid, type } = validatedData;

    if (type !== 'change') {
      return res.status(400).json({
        error: true,
        message: 'Invalid item type',
      });
    }

    // Get user
    const [users] = await pool.execute(
      'SELECT id FROM users WHERE uid = ?',
      [uid]
    );

    if (users.length === 0) {
      return res.status(404).json({
        error: true,
        message: 'User not found',
      });
    }

    const userId = users[0].id;

    // Get current progress
    const [progress] = await pool.execute(
      'SELECT * FROM user_progress WHERE user_id = ?',
      [userId]
    );

    if (progress.length === 0 || progress[0].change_items <= 0) {
      return res.status(400).json({
        error: true,
        message: 'No change items available',
      });
    }

    const currentProgress = progress[0];
    const newChangeItems = currentProgress.change_items - 1;

    // Update progress
    await pool.execute(
      'UPDATE user_progress SET change_items = ? WHERE user_id = ?',
      [newChangeItems, userId]
    );

    res.json({
      ok: true,
      changeItems: newChangeItems,
    });
  } catch (error) {
    if (error.name === 'ZodError') {
      return res.status(400).json({
        error: true,
        message: 'Validation error',
        details: error.errors,
      });
    }
    throw error;
  }
});

module.exports = router;