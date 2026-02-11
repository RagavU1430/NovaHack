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
    // Check if user is logged in at least? No, 403 is fine.
    res.status(403).send('Access Denied: Administrator clearance required.');
}

async function ensureGameStarted(req, res, next) {
    try {
        const checkState = await pool.query("SELECT value FROM game_state WHERE key = 'status'");
        if (checkState.rows.length > 0) {
            const status = checkState.rows[0].value.state;
            if (status === 'started' || (req.session && req.session.role === 'admin')) {
                return next();
            }
        }
        // If not started, show waiting screen
        // But we need to make sure we don't cause a redirect loop if we are already on waiting page
        // Actually this middleware is usually applied to game routes like /level1
        res.render('waiting', { user: req.session.username, message: 'NEXUS system offline.' });
    } catch (err) {
        console.error(err);
        res.status(500).send('Database Error');
    }
}

module.exports = { ensureAuthenticated, ensureAdmin, ensureGameStarted };
