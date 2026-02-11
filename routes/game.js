const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { ensureAuthenticated } = require('../middleware/auth');

// Level 1: Pixel Forest
router.get('/level1', ensureAuthenticated, async (req, res) => {
    try {
        const gameRes = await pool.query("SELECT value FROM game_state WHERE key = 'status'");
        const gameState = gameRes.rows[0].value.state;

        if (gameState !== 'started' && req.session.role !== 'admin') {
            return res.render('waiting');
        }

        const userRes = await pool.query('SELECT currentLevel, progress FROM users WHERE id = $1', [req.session.userId]);
        const user = userRes.rows[0];

        if (user.currentlevel >= 2) {
            return res.redirect('/game/level2');
        }

        if (user.currentlevel === 0) {
            await pool.query('UPDATE users SET currentLevel = 1 WHERE id = $1', [req.session.userId]);
        }

        res.render('level1', { user: req.session.username });
    } catch (e) { console.error(e); res.status(500).send('DB Error'); }
});

router.post('/level1/submit', ensureAuthenticated, async (req, res) => {
    const { answer } = req.body;
    try {
        if (answer && answer.toLowerCase().trim() === 'rotate') {
            // Postgres JSON update slightly different: jsonb_set
            await pool.query(`
                UPDATE users 
                SET currentLevel = 2, 
                    progress = jsonb_set(progress, '{level1CompletedAt}', to_jsonb(now())) 
                WHERE id = $1`, [req.session.userId]);

            await pool.query('INSERT INTO logs (userId, action, details) VALUES ($1, $2, $3)', [req.session.userId, 'level1_complete', 'Solved "rotate" puzzle']);

            return res.json({ success: true, message: 'Signal received... NEXUS connection partially restored.', redirect: '/game/level2' });
        }

        await pool.query('INSERT INTO logs (userId, action, details) VALUES ($1, $2, $3)', [req.session.userId, 'level1_attempt', `Tried: ${answer}`]);
        res.json({ success: false, message: 'Invalid command. Looking for input from the environment...' });
    } catch (e) { console.error(e); res.status(500).json({ success: false, message: 'Server Error' }); }
});

// Level 2: Core AI
router.get('/level2', ensureAuthenticated, async (req, res) => {
    try {
        const userRes = await pool.query('SELECT currentLevel FROM users WHERE id = $1', [req.session.userId]);
        const user = userRes.rows[0];

        if (user.currentlevel < 2) {
            return res.redirect('/game/level1');
        }
        if (user.currentlevel >= 3) {
            return res.redirect('/game/success');
        }

        res.render('level2', { user: req.session.username });
    } catch (e) { console.error(e); res.status(500).send('DB Error'); }
});

router.post('/level2/submit', ensureAuthenticated, async (req, res) => {
    const { answer } = req.body;
    try {
        if (answer && answer.toLowerCase().trim() === 'escape') {
            await pool.query(`
                UPDATE users 
                SET currentLevel = 3, 
                    progress = jsonb_set(progress, '{level2CompletedAt}', to_jsonb(now())) 
                WHERE id = $1`, [req.session.userId]);

            await pool.query('INSERT INTO logs (userId, action, details) VALUES ($1, $2, $3)', [req.session.userId, 'level2_complete', 'Solved "escape" puzzle']);
            return res.json({ success: true, message: 'CORE REBOOT SUCCESSFUL / NEXUS restored.', redirect: '/game/success' });
        }

        await pool.query('INSERT INTO logs (userId, action, details) VALUES ($1, $2, $3)', [req.session.userId, 'level2_attempt', `Tried: ${answer}`]);
        res.json({ success: false, message: 'Access Denied. Sequence incorrect.' });
    } catch (e) { console.error(e); res.status(500).json({ success: false, message: 'Server Error' }); }
});

router.get('/success', ensureAuthenticated, async (req, res) => {
    try {
        const userRes = await pool.query('SELECT currentLevel FROM users WHERE id = $1', [req.session.userId]);
        if (userRes.rows[0].currentlevel < 3) {
            return res.redirect('/game/level2');
        }
        res.render('success');
    } catch (e) { console.error(e); res.status(500).send('DB Error'); }
});

module.exports = router;
