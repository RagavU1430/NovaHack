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

function ensureGameStarted(db) {
    return (req, res, next) => {
        const checkState = db.prepare("SELECT value FROM game_state WHERE key = 'status'").get();
        if (checkState) {
            const status = JSON.parse(checkState.value).state;
            if (status === 'started' || req.session.role === 'admin') {
                return next();
            }
        }
        res.render('waiting', { message: 'NEXUS system offline. Awaiting administrative restart.' });
    }
}

module.exports = { ensureAuthenticated, ensureAdmin, ensureGameStarted };
