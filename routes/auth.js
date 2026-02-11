const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../models/user'); // Oh wait... I didn't create models/user.js, I should create it first or import from config.

// Better to create a user model for cleaner separation.
// For now, let's keep it simple: import db from config.
const database = require('../config/database');

router.get('/login', (req, res) => {
    res.render('login', { error: null });
});

router.post('/login', (req, res) => {
    const { username, password } = req.body;
    try {
        const user = database.prepare('SELECT * FROM users WHERE username = ?').get(username);
        if (user) {
            // Check password
            const match = bcrypt.compareSync(password, user.password);
            if (match) {
                req.session.userId = user.id;
                req.session.username = user.username;
                req.session.role = user.role;
                req.session.currentLevel = user.currentLevel;

                if (user.role === 'admin') {
                    return res.redirect('/admin/dashboard');
                } else {
                    return res.redirect('/game/level1');
                }
            }
        }
        res.render('login', { error: 'Invalid credentials' });
    } catch (err) {
        console.error(err);
        res.render('login', { error: 'System error' });
    }
});

router.get('/register', (req, res) => {
    res.render('register', { error: null });
});

router.post('/register', (req, res) => {
    const { username, password } = req.body;
    const bcrypt = require('bcryptjs');
    const hash = bcrypt.hashSync(password, 10);

    try {
        const stmt = database.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)');
        const info = stmt.run(username, hash, 'participant');

        req.session.userId = info.lastInsertRowid;
        req.session.username = username;
        req.session.role = 'participant';
        req.session.currentLevel = 0; // Waiting for start

        // Check game status
        const status = database.prepare("SELECT value FROM game_state WHERE key = 'status'").get();
        if (status && JSON.parse(status.value).state === 'started') {
            res.redirect('/game/level1');
        } else {
            res.redirect('/waiting');
        }
    } catch (err) {
        if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
            res.render('register', { error: 'Username already taken' });
        } else {
            console.error(err);
            res.render('register', { error: 'System error' });
        }
    }
});

router.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

module.exports = router;
