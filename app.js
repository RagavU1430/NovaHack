const express = require('express');
const http = require('http');
// const socketIo = require('socket.io'); // Socket.io removed for serverless compatibility
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const path = require('path');
const dotenv = require('dotenv');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const pool = require('./config/database');

dotenv.config();

const app = express();
const server = http.createServer(app);
// const io = socketIo(server); // Removed

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieParser());

// Persistent Session Store
app.use(session({
    store: new pgSession({
        pool: pool.pool,
        tableName: 'session'
    }),
    secret: 'nexus_secret_key_change_this',
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        secure: process.env.NODE_ENV === 'production' // Secure in production (Vercel uses HTTPS)
    }
}));

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Pass pool (not io) to request for controllers
app.use((req, res, next) => {
    // req.io = io; // Removed
    next();
});

// Routes
const indexRoutes = require('./routes/index');
const adminRoutes = require('./routes/admin');
const gameRoutes = require('./routes/game');
const authRoutes = require('./routes/auth');

app.use('/', indexRoutes);
app.use('/admin', adminRoutes);
app.use('/game', gameRoutes);
app.use('/auth', authRoutes);

// New API route strictly for security violation logging (replaces socket.io event)
app.post('/api/violation', async (req, res) => {
    const { reason, count } = req.body;
    const userId = req.session.userId || 0;
    try {
        await pool.query('INSERT INTO logs (userId, action, details) VALUES ($1, $2, $3)', [userId, 'VIOLATION', `${reason} (Count: ${count})`]);
        res.status(200).send('Logged');
    } catch (e) {
        console.error(e);
        res.status(500).send('Log failure');
    }
});

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`NEXUS Server running on port ${PORT}`);
});
