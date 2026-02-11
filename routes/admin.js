const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { ensureAdmin } = require('../middleware/auth');

router.use(ensureAdmin);

// Dashboard
// Update to use async/await and Pool
router.get('/', async (req, res) => {
    try {
        const gameRes = await pool.query("SELECT * FROM game_state WHERE key = 'status'");
        const gameState = gameRes.rows[0].value.state;

        const partsRes = await pool.query("SELECT * FROM users WHERE role = 'participant'");
        const participants = partsRes.rows;

        const logsRes = await pool.query("SELECT * FROM logs ORDER BY timestamp DESC LIMIT 50");
        const logs = logsRes.rows;

        const stats = {
            total: participants.length,
            level1: participants.filter(u => u.currentlevel === 1).length,
            level2: participants.filter(u => u.currentlevel === 2).length,
            escaped: participants.filter(u => u.currentlevel === 3).length
        };

        res.render('admin/dashboard', { gameState, participants, logs, stats });
    } catch (e) { console.error(e); res.status(500).send('DB Error'); }
});

router.post('/start', async (req, res) => {
    try {
        await pool.query("UPDATE game_state SET value = $1 WHERE key = 'status'", [JSON.stringify({ state: 'started', startTime: Date.now() })]);
        req.io.emit('game_start', { message: 'NEXUS system initializing...' });
        res.redirect('/admin');
    } catch (e) {
        console.error(e);
        res.status(500).send('Error starting game');
    }
});

router.post('/stop', async (req, res) => {
    try {
        await pool.query("UPDATE game_state SET value = $1 WHERE key = 'status'", [JSON.stringify({ state: 'stopped', endTime: Date.now() })]);
        req.io.emit('game_stop', { message: 'System shutdown initiated.' });
        res.redirect('/admin');
    } catch (e) {
        console.error(e);
        res.status(500).send('Error stopping game');
    }
});

router.get('/api/stats', async (req, res) => {
    try {
        const result = await pool.query("SELECT id, username, currentLevel FROM users WHERE role = 'participant'");
        const participants = result.rows;

        const stats = {
            total: participants.length,
            active: participants.filter(u => u.currentlevel > 0 && u.currentlevel < 3).length,
            escaped: participants.filter(u => u.currentlevel === 3).length
        };
        res.json({ participants, stats });
    } catch (e) { console.error(e); res.status(500).json({ error: 'DB Error' }); }
});

module.exports = router;
