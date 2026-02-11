const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { ensureAdmin } = require('../middleware/auth');

router.use(ensureAdmin);

// Dashboard
router.get('/', (req, res) => {
    const status = db.prepare("SELECT value FROM game_state WHERE key = 'status'").get();
    const gameState = JSON.parse(status.value).state;

    const participants = db.prepare("SELECT * FROM users WHERE role = 'participant'").all();
    const logs = db.prepare("SELECT * FROM logs ORDER BY timestamp DESC LIMIT 50").all();

    // Calculate stats
    const stats = {
        total: participants.length,
        level1: participants.filter(u => u.currentLevel === 1).length,
        level2: participants.filter(u => u.currentLevel === 2).length,
        escaped: participants.filter(u => u.currentLevel === 3).length
    };

    res.render('admin/dashboard', { gameState, participants, logs, stats });
});

router.post('/start', (req, res) => {
    db.prepare("UPDATE game_state SET value = ? WHERE key = 'status'").run(JSON.stringify({ state: 'started', startTime: Date.now() }));
    req.io.emit('game_start', { message: 'NEXUS system initializing...' });
    res.redirect('/admin');
});

router.post('/stop', (req, res) => {
    db.prepare("UPDATE game_state SET value = ? WHERE key = 'status'").run(JSON.stringify({ state: 'stopped', endTime: Date.now() }));
    req.io.emit('game_stop', { message: 'System shutdown initiated.' });
    res.redirect('/admin');
});

router.get('/api/stats', (req, res) => {
    const participants = db.prepare("SELECT id, username, currentLevel FROM users WHERE role = 'participant'").all();
    const stats = {
        total: participants.length,
        active: participants.filter(u => u.currentLevel > 0 && u.currentLevel < 3).length, // Playing
        escaped: participants.filter(u => u.currentLevel === 3).length
    };
    res.json({ participants, stats });
});

module.exports = router;
