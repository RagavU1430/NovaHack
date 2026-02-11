const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { ensureAuthenticated, ensureGameStarted } = require('../middleware/auth');

// Level 1: Pixel Forest
router.get('/level1', ensureAuthenticated, (req, res) => {
    const status = db.prepare("SELECT value FROM game_state WHERE key = 'status'").get();
    const gameState = JSON.parse(status.value).state;

    if (gameState !== 'started' && req.session.role !== 'admin') {
        return res.render('waiting');
    }

    // Check user progress
    const user = db.prepare('SELECT currentLevel, progress FROM users WHERE id = ?').get(req.session.userId);

    if (user.currentLevel >= 2) {
        return res.redirect('/game/level2');
    }

    // Update level if needed (start the user)
    if (user.currentLevel === 0) {
        db.prepare('UPDATE users SET currentLevel = 1 WHERE id = ?').run(req.session.userId);
    }

    res.render('level1', { user: req.session.username });
});

router.post('/level1/submit', ensureAuthenticated, (req, res) => {
    const { answer } = req.body;
    if (answer && answer.toLowerCase().trim() === 'rotate') {
        // Correct!
        db.prepare('UPDATE users SET currentLevel = 2, progress = json_set(progress, "$.level1CompletedAt", datetime("now")) WHERE id = ?').run(req.session.userId);

        // Log it
        db.prepare('INSERT INTO logs (userId, action, details) VALUES (?, ?, ?)').run(req.session.userId, 'level1_complete', 'Solved "rotate" puzzle');

        return res.json({ success: true, message: 'Signal received... NEXUS connection partially restored.', redirect: '/game/level2' });
    }

    // Log failure
    db.prepare('INSERT INTO logs (userId, action, details) VALUES (?, ?, ?)').run(req.session.userId, 'level1_attempt', `Tried: ${answer}`);

    res.json({ success: false, message: 'Invalid command. Looking for input from the environment...' });
});

// Level 2: Core AI
router.get('/level2', ensureAuthenticated, (req, res) => {
    const user = db.prepare('SELECT currentLevel FROM users WHERE id = ?').get(req.session.userId);

    if (user.currentLevel < 2) {
        return res.redirect('/game/level1');
    }
    if (user.currentLevel >= 3) {
        return res.redirect('/game/success');
    }

    res.render('level2', { user: req.session.username });
});

router.post('/level2/submit', ensureAuthenticated, (req, res) => {
    const { answer } = req.body;
    if (answer && answer.toLowerCase().trim() === 'escape') {
        // Correct!
        db.prepare('UPDATE users SET currentLevel = 3, progress = json_set(progress, "$.level2CompletedAt", datetime("now")) WHERE id = ?').run(req.session.userId);

        // Log success
        db.prepare('INSERT INTO logs (userId, action, details) VALUES (?, ?, ?)').run(req.session.userId, 'level2_complete', 'Solved "escape" puzzle');

        return res.json({
            success: true,
            message: 'CORE REBOOT SUCCESSFUL / NEXUS restored. / The portal opens.',
            redirect: '/game/success'
        });
    }

    // Log failure
    db.prepare('INSERT INTO logs (userId, action, details) VALUES (?, ?, ?)').run(req.session.userId, 'level2_attempt', `Tried: ${answer}`);

    res.json({ success: false, message: 'Access Denied. Sequence incorrect.' });
});

router.get('/success', ensureAuthenticated, (req, res) => {
    const user = db.prepare('SELECT currentLevel FROM users WHERE id = ?').get(req.session.userId);
    if (user.currentLevel < 3) {
        return res.redirect('/game/level2');
    }
    res.render('success');
});

module.exports = router;
