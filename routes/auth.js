const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const pool = require('../config/database');

router.get('/login', (req, res) => {
    res.render('login', { error: null });
});

router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
        const user = result.rows[0];

        if (user) {
            const match = await bcrypt.compare(password, user.password);
            if (match) {
                req.session.userId = user.id;
                req.session.username = user.username;
                req.session.role = user.role;
                req.session.currentLevel = user.currentlevel; // Postgres might lowercase columns

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

router.post('/register', async (req, res) => {
    const { username, password } = req.body;
    const hash = await bcrypt.hash(password, 10);

    try {
        const result = await pool.query('INSERT INTO users (username, password, role) VALUES ($1, $2, $3) RETURNING id', [username, hash, 'participant']);

        req.session.userId = result.rows[0].id; // RETURNING clause in PG
        req.session.username = username;
        req.session.role = 'participant';
        req.session.currentLevel = 0;

        const status = await pool.query("SELECT value FROM game_state WHERE key = 'status'");
        const gameState = status.rows[0].value.state;

        if (gameState === 'started') {
            res.redirect('/game/level1');
        } else {
            res.redirect('/waiting');
        }
    } catch (err) {
        if (err.code === '23505') { // Postgres UNIQUE VIOLATION
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
