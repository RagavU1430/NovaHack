const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const pool = require('../config/database');

// HOST LOGIN (Admin)
router.get('/login/host', (req, res) => {
    res.render('host_login', { error: null });
});

router.post('/login/host', async (req, res) => {
    const { password } = req.body;

    // Check hardcoded admin password
    if (password === 'admin1234') {
        // Set session as admin
        req.session.userId = 1; // Fallback ID if admin lookup fails or not needed
        req.session.username = 'ADMIN';
        req.session.role = 'admin';

        res.redirect('/admin');
    } else {
        res.render('host_login', { error: 'ACCESS DENIED: Incorrect Passcode' });
    }
});

// PARTICIPANT LOGIN (Team Name)
router.get('/login/participant', (req, res) => {
    res.render('participant_login', { error: null });
});

router.post('/login/participant', async (req, res) => {
    const { username } = req.body;

    try {
        // Check if user exists
        const check = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
        let user = check.rows[0];

        if (user) {
            // If user exists, check if they are participant
            if (user.role === 'admin') {
                return res.render('participant_login', { error: 'Name reserved for ADMIN.' });
            }
            // Log them back in seamlessly
            req.session.userId = user.id;
            req.session.username = user.username;
            req.session.role = user.role;
            req.session.currentLevel = user.currentlevel;

            // Redirect to game logic
            return res.redirect('/game/level1');
        } else {
            // Create new participant
            const result = await pool.query(
                "INSERT INTO users (username, password, role, currentLevel, progress) VALUES ($1, $2, $3, $4, $5) RETURNING id",
                [username, 'participant_pass', 'participant', 0, '{}']
            );

            req.session.userId = result.rows[0].id;
            req.session.username = username;
            req.session.role = 'participant';
            req.session.currentLevel = 0;

            return res.redirect('/game/level1');
        }
    } catch (err) {
        console.error(err);
        res.render('participant_login', { error: 'System Error. Try again.' });
    }
});

router.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

module.exports = router;
