const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
    if (req.session.userId) {
        if (req.session.role === 'admin') {
            return res.redirect('/admin/dashboard');
        } else {
            return res.redirect('/game/level1');
        }
    }
    res.render('welcome');
});

router.get('/waiting', (req, res) => {
    res.render('waiting');
});

// Public health check for footer status polling
router.get('/status', (req, res) => {
    res.json({ status: 'online', timestamp: Date.now() });
});

module.exports = router;
