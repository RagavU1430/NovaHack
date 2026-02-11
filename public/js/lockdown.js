/* NEXUS SECURITY PROTOCOL - LOCKDOWN.JS */

let violationCount = 0;

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

function handleViolation(reason) {
    violationCount++;

    // Notify Server via HTTP POST instead of WebSocket
    fetch('/api/violation', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason: reason, count: violationCount })
    }).catch(err => console.error("Violation reporting failed:", err));

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
    if (!document.getElementById('security-overlay')) {
        document.body.appendChild(overlay);
    }
}

function resumeSession() {
    const overlay = document.getElementById('security-overlay');
    if (overlay) overlay.remove();
    requestFullScreen();
}

// Initial Fullscreen Request
document.addEventListener('click', () => {
    if (!document.fullscreenElement) {
        requestFullScreen();
    }
}, { once: false });
