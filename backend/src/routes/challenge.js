const express = require('express');
const pool = require('../db/pool');
const { challengeSettleSchema } = require('../utils/validate');

const router = express.Router();

const IQ_TITLES = {
  0: 'Newborn Dreamer',
  40: 'Tiny Adventurer', 
  55: 'Learning Hatchling',
  65: 'Little Explorer',
  70: 'Slow but Steady',
  85: 'Hardworking Student',
  100: 'Everyday Scholar',
  115: 'Rising Star',
  130: 'Puzzle Master',
  145: 'Cosmic Genius',
};

function getIQTitle(iq) {
  const thresholds = Object.keys(IQ_TITLES)
    .map(Number)
    .sort((a, b) => b - a);
  
  for (let threshold of thresholds) {
    if (iq >= threshold) {
      return IQ_TITLES[threshold];
    }
  }
  
  return IQ_TITLES[0];
}

router.post('/settle', async (req, res) => {
  try {
    const validatedData = challengeSettleSchema.parse(req.body);
    const { uid, iq } = validatedData;

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
    const iqTitle = getIQTitle(iq);

    // Get current challenge record
    const [records] = await pool.execute(
      'SELECT * FROM user_challenge_record WHERE user_id = ?',
      [userId]
    );

    if (records.length === 0) {
      // Initialize record if not exists
      await pool.execute(
        'INSERT INTO user_challenge_record (user_id, best_iq, best_iq_title, last_iq) VALUES (?, ?, ?, ?)',
        [userId, iq, iqTitle, iq]
      );

      return res.json({
        updated: true,
        challenge: {
          bestIQ: iq,
          bestIQTitle: iqTitle,
          lastIQ: iq,
        },
      });
    }

    const currentRecord = records[0];
    const newBestIQ = Math.max(currentRecord.best_iq, iq);
    const newBestTitle = newBestIQ > currentRecord.best_iq ? iqTitle : currentRecord.best_iq_title;

    // Update challenge record
    await pool.execute(
      'UPDATE user_challenge_record SET best_iq = ?, best_iq_title = ?, last_iq = ? WHERE user_id = ?',
      [newBestIQ, newBestTitle, iq, userId]
    );

    res.json({
      updated: true,
      challenge: {
        bestIQ: newBestIQ,
        bestIQTitle: newBestTitle,
        lastIQ: iq,
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

module.exports = router;