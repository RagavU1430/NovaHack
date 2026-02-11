const pool = require('../config/database');

function ensureAuthenticated(req, res, next) {
    if (req.session && req.session.userId) {
        return next();
    }
    res.redirect('/auth/login');
}

function ensureAdmin(req, res, next) {
    if (req.session && req.session.userId && req.session.role === 'admin') {
        return next();
    }
    res.status(403).send('Forbidden');
}

function ensureGameStarted(req, res, next) {
    return async (req, res, next) => {
        try {
            const checkState = await pool.query("SELECT value FROM game_state WHERE key = 'status'");
            if (checkState.rows.length > 0) {
                const status = checkState.rows[0].value.state;
                if (status === 'started' || req.session.role === 'admin') {
                    return next();
                }
            }
            res.render('waiting', { message: 'NEXUS system offline. Awaiting administrative restart.' });
        } catch (err) {
            console.error(err);
            res.status(500).send('Database Error');
        }
    }
}

module.exports = { ensureAuthenticated, ensureAdmin, ensureGameStarted };
