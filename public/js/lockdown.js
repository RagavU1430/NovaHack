/* NEXUS SECURITY PROTOCOL - LOCKDOWN.JS */

let violationCount = 0;
const socket = io();

// Force Fullscreen
function requestFullScreen() {
    const doc = document.documentElement;
    if (doc.requestFullscreen) {
        doc.requestFullscreen();
    } else if (doc.mozRequestFullScreen) {
        doc.mozRequestFullScreen();
    } else if (doc.webkitRequestFullscreen) {
        doc.webkitRequestFullscreen();
    } else if (doc.msRequestFullscreen) {
        doc.msRequestFullscreen();
    }
}

// Monitor Visibility (Tab Switching)
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        handleViolation("Tab Switch Detected");
    }
});

window.addEventListener('blur', () => {
    // Often triggered with visibilitychange, but good as backup
    // handleViolation("Focus Lost"); // Can be too sensitive (e.g. clicking iframe), use with caution.
    // Sticking to visibilitychange for "Tab Switch" specifically.
});

function handleViolation(reason) {
    violationCount++;

    // Notify Server
    socket.emit('security_violation', { reason: reason, count: violationCount });

    // Show Overlay
    const overlay = document.createElement('div');
    overlay.id = 'security-overlay';
    overlay.innerHTML = `
        <div class="violation-box">
            <h1>SECURITY ALERT</h1>
            <p>SYSTEM BREACH DETECTED</p>
            <p class="reason">${reason}</p>
            <p>NEXUS protocol forbids external signal interference.</p>
            <button onclick="resumeSession()">RESTORE CONNECTION</button>
        </div>
    `;
    document.body.appendChild(overlay);
}

function resumeSession() {
    const overlay = document.getElementById('security-overlay');
    if (overlay) overlay.remove();
    requestFullScreen();
}

// Initial Fullscreen Request on any interaction if not active
document.addEventListener('click', () => {
    if (!document.fullscreenElement) {
        requestFullScreen();
    }
}, { once: false });

// Socket listener for admin forced layout?
socket.on('force_refresh', () => {
    window.location.reload();
});
