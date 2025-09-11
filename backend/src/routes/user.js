const express = require('express');
const pool = require('../db/pool');
const { userSyncSchema } = require('../utils/validate');

const router = express.Router();

router.post('/sync', async (req, res) => {
  try {
    const validatedData = userSyncSchema.parse(req.body);
    const { uid, email, nickname, meta } = validatedData;

    // Check if user exists
    const [existingUsers] = await pool.execute(
      'SELECT * FROM users WHERE uid = ?',
      [uid]
    );

    if (existingUsers.length === 0) {
      // Create new user
      const [result] = await pool.execute(
        'INSERT INTO users (uid, email, nickname, meta_json) VALUES (?, ?, ?, ?)',
        [uid, email, nickname, JSON.stringify(meta || {})]
      );

      // Initialize user progress
      await pool.execute(
        'INSERT INTO user_progress (user_id, current_level, best_level, change_items) VALUES (?, 1, 0, 0)',
        [result.insertId]
      );

      // Initialize challenge record
      await pool.execute(
        'INSERT INTO user_challenge_record (user_id, best_iq, best_iq_title, last_iq) VALUES (?, 0, ?, 0)',
        [result.insertId, 'Newborn Dreamer']
      );

      const [newUser] = await pool.execute(
        'SELECT * FROM users WHERE id = ?',
        [result.insertId]
      );

      return res.json({
        created: true,
        user: {
          ...newUser[0],
          meta: JSON.parse(newUser[0].meta_json || '{}'),
        },
      });
    }

    const existingUser = existingUsers[0];
    let hasChanges = false;
    const updates = {};

    // Check for changes
    if (email !== existingUser.email) {
      updates.email = email;
      hasChanges = true;
    }
    if (nickname !== existingUser.nickname) {
      updates.nickname = nickname;
      hasChanges = true;
    }
    if (JSON.stringify(meta || {}) !== existingUser.meta_json) {
      updates.meta_json = JSON.stringify(meta || {});
      hasChanges = true;
    }

    if (hasChanges) {
      const updateFields = Object.keys(updates)
        .map(field => `${field} = ?`)
        .join(', ');
      const updateValues = Object.values(updates);

      await pool.execute(
        `UPDATE users SET ${updateFields} WHERE uid = ?`,
        [...updateValues, uid]
      );

      const [updatedUser] = await pool.execute(
        'SELECT * FROM users WHERE uid = ?',
        [uid]
      );

      return res.json({
        updated: true,
        user: {
          ...updatedUser[0],
          meta: JSON.parse(updatedUser[0].meta_json || '{}'),
        },
      });
    }

    return res.json({
      noop: true,
      user: {
        ...existingUser,
        meta: JSON.parse(existingUser.meta_json || '{}'),
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