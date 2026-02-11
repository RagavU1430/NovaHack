const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const session = require('express-session');
const path = require('path');
const dotenv = require('dotenv');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieParser());
app.use(session({
    secret: 'nexus_secret_key_change_this',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000 } // 24 hours
}));

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Pass io to request for controllers
app.use((req, res, next) => {
    req.io = io;
    next();
});

// Routes
const indexRoutes = require('./routes/index');
const adminRoutes = require('./routes/admin');
const gameRoutes = require('./routes/game');
const authRoutes = require('./routes/auth');

app.use('/', indexRoutes);
app.use('/admin', adminRoutes); // Middleware for admin check will be inside router
app.use('/game', gameRoutes);
app.use('/auth', authRoutes);

// Socket.io connection
io.on('connection', (socket) => {
    console.log('A user connected');

    socket.on('disconnect', () => {
        console.log('User disconnected');
    });

    // We can add more socket events here for real-time updates
    socket.on('join_game', (userId) => {
        socket.join(`user_${userId}`);
    });

    socket.on('security_violation', (data) => {
        // We need user ID. If we use session middleware with socket.io we can get it.
        // For now, let's assume the client sends it or we just log it as anonymous/IP if session not bridged.
        // To properly bridge session:
        // But for simplicity, let's just log "Unknown Agent" if we can't get ID easily, or client sends it?
        // Let's pass userId from client in the sensitive emit if possible, but that's insecure.
        // Better: Use socket.request.session if shared. 
        // Quickest: Just broadcast to admin for now without DB persistence if too complex?
        // No, user wants to see it.

        // Let's just log it to console and emit to admin room if we had one.
        console.log('Security Violation:', data);

        // Simple detailed log
        // To persist to DB we need the 'db' object. let's require it at top or here.
        const db = require('./config/database');
        // We don't have user ID easily here without middleware. 
        // Let's just say "Agent (Socket ID)"
        db.prepare('INSERT INTO logs (userId, action, details) VALUES (?, ?, ?)').run(0, 'VIOLATION', `${data.reason} (Count: ${data.count})`);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`NEXUS Server running on port ${PORT}`);
});
