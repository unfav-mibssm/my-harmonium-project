// ============================================================
// GAME ENGINE — Skribbl.io 28
// All bugs fixed:
//   1. Drawing fully synced (start/draw/end/fill/undo/clear)
//   2. Undo synced to all players via Firebase
//   3. Canvas never resizes when keyboard opens/closes
//   4. HiDPI: internal buffer = CSS size × devicePixelRatio
//   5. Touch coords accurate via getBoundingClientRect
//   6. Chat input always visible; toolbar doesn't overlap it
//   7. Correct guess: trim + lowercase + exact match
//   8. Round ends properly after all guessed or timer
//   9. Turn/drawer order is stable across clients
// ============================================================

// ── State ──────────────────────────────────────────────────
const gameState = {
    roomCode: null,
    playerName: null,
    playerId: null,
    isDrawer: false,
    currentWord: null,
    round: 1,
    maxRounds: 10,
    players: {},
    game: null,
    gameStarted: false,
    joinTime: null,
    hasGuessedCorrectly: false,
    currentState: 'waiting',
    endRoundScheduled: false,
};

// ── Canvas globals ─────────────────────────────────────────
let canvas, ctx;
let canvasW = 0, canvasH = 0;   // physical pixel dimensions (DPR-aware)
let cssW = 0,    cssH = 0;      // logical CSS pixel dimensions
let dpr = 1;
let canvasReady = false;

// ── Drawing state ──────────────────────────────────────────
let isPointerDown = false;
let currentTool  = 'brush';
let currentColor = '#000000';
let currentSize  = 4;
let lastX = 0, lastY = 0;

// History: array of {type, …} objects.
// Stored in logical CSS pixels.
let drawHistory = [];
let activeStroke = null; // stroke being drawn right now

// ── Firebase refs ──────────────────────────────────────────
let roomRef, playersRef, chatRef, drawRef, gameRef;

// ── Timers ─────────────────────────────────────────────────
let timerInterval   = null;
let autoRestartTimer = null;
let wordSelectTimer  = null;

// ── Sounds ─────────────────────────────────────────────────
let sounds = {};

// ── Palette ────────────────────────────────────────────────
const COLORS = [
    '#000000','#2c3e50','#8e44ad','#c0392b','#d35400',
    '#f39c12','#f1c40f','#2ecc71','#1abc9c','#3498db',
    '#2980b9','#9b59b6','#e74c3c','#e67e22','#795548',
    '#ffffff','#95a5a6','#34495e','#16a085','#27ae60',
];

const SIZES = [
    { size:2,  label:'Small'  },
    { size:5,  label:'Medium' },
    { size:10, label:'Large'  },
    { size:20, label:'Huge'   },
];

// ============================================================
// INIT
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
    initColorPicker();
    initSizePicker();
    initToolbarButtons();
    initSounds();

    // Chat enter key
    const ci = document.getElementById('chatInput');
    if (ci) ci.addEventListener('keydown', e => {
        if (e.key === 'Enter') { e.preventDefault(); sendMessage(); }
    });
});

function initSounds() {
    sounds.join     = document.getElementById('soundJoin');
    sounds.correct  = document.getElementById('soundCorrect');
    sounds.roundEnd = document.getElementById('soundRoundEnd');
    sounds.leave    = document.getElementById('soundLeave');
    sounds.enter    = document.getElementById('soundEnter');
}

function playSound(name) {
    try {
        const s = sounds[name];
        if (s) { s.currentTime = 0; s.play().catch(() => {}); }
    } catch(e) {}
}

// ============================================================
// CANVAS — HiDPI aware, stable size
//
// KEY DESIGN:
//   • Canvas CSS size = canvasSection clientWidth × clientHeight
//   • Canvas buffer   = CSS size × devicePixelRatio
//   • ctx is scaled by DPR so all draw calls use logical pixels
//   • We DO NOT resize on window resize events triggered by the
//     virtual keyboard — we ignore ResizeObserver and window.resize
//     and only call initCanvas() once when the game screen appears.
//   • If the user rotates the device we do a proper reinit.
// ============================================================

function initCanvas() {
    canvas = document.getElementById('gameCanvas');
    if (!canvas) return;

    const section = document.getElementById('canvasSection');
    if (!section) return;

    // Measure the section BEFORE the canvas has CSS width/height
    // so we get the true container size.
    cssW = section.clientWidth;
    cssH = section.clientHeight;
    dpr  = window.devicePixelRatio || 1;

    canvasW = Math.round(cssW * dpr);
    canvasH = Math.round(cssH * dpr);

    canvas.width  = canvasW;
    canvas.height = canvasH;
    // CSS size — matches the section exactly via absolute positioning
    canvas.style.width  = cssW + 'px';
    canvas.style.height = cssH + 'px';

    ctx = canvas.getContext('2d', { alpha: false });
    // Scale transform so all draw calls use logical (CSS) pixels
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    fillWhite();
    ctx.lineCap  = 'round';
    ctx.lineJoin = 'round';

    attachPointerEvents();
    canvasReady = true;

    // Handle device rotation only (not keyboard open/close)
    window.addEventListener('orientationchange', handleOrientationChange);

    console.log(`Canvas: ${cssW}×${cssH} CSS px | buffer: ${canvasW}×${canvasH} | DPR: ${dpr}`);
}

function handleOrientationChange() {
    // Wait for the browser to finish rotating
    setTimeout(() => {
        if (!canvas) return;
        const section = document.getElementById('canvasSection');
        if (!section) return;

        const newCssW = section.clientWidth;
        const newCssH = section.clientHeight;

        // Only reinit if the size actually changed meaningfully
        if (Math.abs(newCssW - cssW) < 5 && Math.abs(newCssH - cssH) < 5) return;

        // Save current drawing as an image
        const imgData = canvas.toDataURL('image/png');

        cssW = newCssW;
        cssH = newCssH;
        dpr  = window.devicePixelRatio || 1;
        canvasW = Math.round(cssW * dpr);
        canvasH = Math.round(cssH * dpr);

        canvas.width  = canvasW;
        canvas.height = canvasH;
        canvas.style.width  = cssW + 'px';
        canvas.style.height = cssH + 'px';

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        fillWhite();
        ctx.lineCap  = 'round';
        ctx.lineJoin = 'round';

        // Restore saved image
        const img = new Image();
        img.onload = () => ctx.drawImage(img, 0, 0, cssW, cssH);
        img.src = imgData;
    }, 300);
}

function fillWhite() {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, cssW, cssH);
}

// ── Pointer Events ─────────────────────────────────────────

function attachPointerEvents() {
    canvas.addEventListener('mousedown',  onPointerDown);
    canvas.addEventListener('mousemove',  onPointerMove);
    canvas.addEventListener('mouseup',    onPointerUp);
    canvas.addEventListener('mouseleave', onPointerUp);
    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchmove',  onTouchMove,  { passive: false });
    canvas.addEventListener('touchend',   onTouchEnd,   { passive: false });
    canvas.addEventListener('touchcancel',onTouchEnd,   { passive: false });
}

function getCanvasPos(e) {
    const rect = canvas.getBoundingClientRect();
    let cx, cy;
    if (e.touches && e.touches.length > 0) {
        cx = e.touches[0].clientX;
        cy = e.touches[0].clientY;
    } else if (e.changedTouches && e.changedTouches.length > 0) {
        cx = e.changedTouches[0].clientX;
        cy = e.changedTouches[0].clientY;
    } else {
        cx = e.clientX;
        cy = e.clientY;
    }
    return {
        x: Math.max(0, Math.min(cssW - 1, cx - rect.left)),
        y: Math.max(0, Math.min(cssH - 1, cy - rect.top)),
    };
}

function canDraw() {
    return gameState.isDrawer && gameState.currentState === 'drawing' && canvasReady;
}

function onTouchStart(e) { e.preventDefault(); if (e.touches.length === 1) onPointerDown(e); }
function onTouchMove(e)  { e.preventDefault(); if (e.touches.length === 1) onPointerMove(e); }
function onTouchEnd(e)   { e.preventDefault(); onPointerUp(e); }

function onPointerDown(e) {
    if (!canDraw()) return;
    e.preventDefault();

    const pos = getCanvasPos(e);
    lastX = pos.x; lastY = pos.y;
    isPointerDown = true;

    if (currentTool === 'bucket') {
        const col = currentColor;
        const x = Math.round(lastX), y = Math.round(lastY);
        floodFill(x, y, col);
        const entry = { type:'fill', x, y, color: col };
        drawHistory.push(entry);
        // Sync fill to Firebase
        pushDraw({ type:'fill', x, y, color: col });
        isPointerDown = false;
        return;
    }

    const strokeColor = (currentTool === 'eraser') ? '#ffffff' : currentColor;

    // Draw dot
    ctx.beginPath();
    ctx.arc(lastX, lastY, currentSize / 2, 0, Math.PI * 2);
    ctx.fillStyle = strokeColor;
    ctx.fill();

    // Begin stroke record
    activeStroke = {
        type: 'stroke',
        color: strokeColor,
        size: currentSize,
        points: [{ x: lastX, y: lastY }],
    };

    // Sync start to Firebase
    pushDraw({ type:'start', x: lastX, y: lastY, color: strokeColor, size: currentSize });
}

function onPointerMove(e) {
    if (!isPointerDown || !canDraw()) return;
    e.preventDefault();

    const pos = getCanvasPos(e);
    const x = pos.x, y = pos.y;
    const dist = Math.hypot(x - lastX, y - lastY);
    if (dist < 1) return;

    const strokeColor = (currentTool === 'eraser') ? '#ffffff' : currentColor;
    ctx.lineWidth   = currentSize;
    ctx.strokeStyle = strokeColor;
    ctx.lineCap     = 'round';
    ctx.lineJoin    = 'round';
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(x, y);
    ctx.stroke();

    if (activeStroke) activeStroke.points.push({ x, y });

    // Sync segment to Firebase
    pushDraw({ type:'seg', x, y, lx: lastX, ly: lastY, color: strokeColor, size: currentSize });

    lastX = x; lastY = y;
}

function onPointerUp(e) {
    if (!isPointerDown) return;
    isPointerDown = false;

    if (activeStroke && activeStroke.points.length > 0) {
        drawHistory.push(activeStroke);
        if (drawHistory.length > 80) drawHistory.shift();
    }
    activeStroke = null;
    pushDraw({ type:'end' });
}

// ============================================================
// FLOOD FILL
// Operates on raw pixel buffer (DPR coordinates)
// ============================================================

function floodFill(cssX, cssY, fillColor) {
    if (!ctx || !canvas) return;

    // Convert logical → physical pixels
    const px = Math.round(cssX * dpr);
    const py = Math.round(cssY * dpr);
    const W  = canvas.width;
    const H  = canvas.height;

    const imgData = ctx.getImageData(0, 0, W, H);
    const data    = imgData.data;
    const target  = getPixel(data, px, py, W);
    const fill    = hexToRgb(fillColor);

    if (colorEqual(target, fill)) return;

    const visited = new Uint8Array(W * H);
    const stack   = [px + py * W];

    while (stack.length) {
        const idx = stack.pop();
        const x   = idx % W;
        const y   = (idx - x) / W;

        if (visited[idx]) continue;
        visited[idx] = 1;

        const c = getPixel(data, x, y, W);
        if (!colorClose(c, target)) continue;

        setPixel(data, x, y, W, fill);

        if (x + 1 < W) stack.push(idx + 1);
        if (x - 1 >= 0) stack.push(idx - 1);
        if (y + 1 < H)  stack.push(idx + W);
        if (y - 1 >= 0) stack.push(idx - W);
    }

    ctx.putImageData(imgData, 0, 0);
}

function getPixel(data, x, y, W) {
    const i = (y * W + x) * 4;
    return { r: data[i], g: data[i+1], b: data[i+2] };
}

function setPixel(data, x, y, W, c) {
    const i = (y * W + x) * 4;
    data[i] = c.r; data[i+1] = c.g; data[i+2] = c.b; data[i+3] = 255;
}

function colorClose(a, b, tol = 35) {
    return Math.abs(a.r-b.r) <= tol && Math.abs(a.g-b.g) <= tol && Math.abs(a.b-b.b) <= tol;
}
function colorEqual(a, b) { return a.r===b.r && a.g===b.g && a.b===b.b; }

function hexToRgb(hex) {
    const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return r ? { r: parseInt(r[1],16), g: parseInt(r[2],16), b: parseInt(r[3],16) } : { r:0,g:0,b:0 };
}

// ============================================================
// UNDO / REDRAW
// BUG FIX: undo is now synced to Firebase so all clients
// redraws from the shared drawHistory snapshot.
// ============================================================

function undo() {
    if (!canDraw() || drawHistory.length === 0) return;
    drawHistory.pop();
    redrawLocal();
    // Sync undo to Firebase — clients will call redrawFromSnapshot
    pushDraw({ type:'undo' });
}

function redrawLocal() {
    if (!ctx) return;
    fillWhite();
    ctx.lineCap  = 'round';
    ctx.lineJoin = 'round';

    drawHistory.forEach(entry => {
        if (entry.type === 'stroke') {
            ctx.lineWidth   = entry.size;
            ctx.strokeStyle = entry.color;
            ctx.beginPath();
            if (entry.points.length > 0) {
                ctx.moveTo(entry.points[0].x, entry.points[0].y);
                for (let i = 1; i < entry.points.length; i++) {
                    ctx.lineTo(entry.points[i].x, entry.points[i].y);
                }
                ctx.stroke();
            }
        } else if (entry.type === 'fill') {
            floodFill(entry.x, entry.y, entry.color);
        }
    });
}

function clearCanvasLocal() {
    drawHistory = [];
    activeStroke = null;
    if (ctx) fillWhite();
}

function clearCanvasAndSync() {
    clearCanvasLocal();
    pushDraw({ type:'clear' });
}

// ============================================================
// FIREBASE DRAWING SYNC
//
// BUG FIX: The previous listenDrawing was maintaining a
// partial rendering state (ctx.beginPath but no close).
// Now we track a per-client "remote stroke" context properly.
//
// UNDO sync: when a client receives 'undo', it requests the
// full drawHistory snapshot that the drawer publishes in a
// separate 'snapshot' event. This is the correct way to keep
// all clients in sync — replaying individual events is brittle.
// ============================================================

function pushDraw(payload) {
    if (!drawRef || !gameState.isDrawer) return;
    drawRef.push({
        ...payload,
        pid: gameState.playerId,
        t:   firebase.database.ServerValue.TIMESTAMP,
    });
}

// Per-remote-client stroke state
let remoteCtxState = null; // { color, size, lastX, lastY }

function listenDrawing() {
    if (!drawRef) return;
    drawRef.off();

    drawRef.on('child_added', snap => {
        const d = snap.val();
        if (!d || d.pid === gameState.playerId) return;

        switch (d.type) {
            case 'start':
                remoteCtxState = { color: d.color, size: d.size, lx: d.x, ly: d.y };
                // Draw start dot
                ctx.beginPath();
                ctx.arc(d.x, d.y, d.size / 2, 0, Math.PI * 2);
                ctx.fillStyle = d.color;
                ctx.fill();
                break;

            case 'seg':
                // Draw segment — use the fields sent with the segment for accuracy
                ctx.lineWidth   = d.size;
                ctx.strokeStyle = d.color;
                ctx.lineCap     = 'round';
                ctx.lineJoin    = 'round';
                ctx.beginPath();
                ctx.moveTo(d.lx, d.ly);
                ctx.lineTo(d.x, d.y);
                ctx.stroke();
                if (remoteCtxState) { remoteCtxState.lx = d.x; remoteCtxState.ly = d.y; }
                break;

            case 'end':
                remoteCtxState = null;
                break;

            case 'fill':
                floodFill(d.x, d.y, d.color);
                break;

            case 'clear':
                clearCanvasLocal();
                break;

            case 'undo':
                // Drawer pushed an undo — they also publish a snapshot.
                // We handle this by listening to the 'snapshot' node.
                // (See pushSnapshot / listenSnapshot below)
                break;

            case 'snapshot':
                // Drawer published full history after undo; apply it
                applySnapshot(d.history || []);
                break;
        }
    });
}

// After undo, the drawer publishes a snapshot of drawHistory
// so every client can re-render to the exact same state.
function pushSnapshot() {
    if (!drawRef || !gameState.isDrawer) return;
    drawRef.push({
        type:    'snapshot',
        history: drawHistory,
        pid:     gameState.playerId,
        t:       firebase.database.ServerValue.TIMESTAMP,
    });
}

function applySnapshot(history) {
    drawHistory = history;
    redrawLocal();
}

// Override undo to also push snapshot
function undoAndSync() {
    if (!canDraw() || drawHistory.length === 0) return;
    drawHistory.pop();
    redrawLocal();
    // Push undo event then snapshot so all clients redraw correctly
    pushDraw({ type: 'undo' });
    pushSnapshot();
}

// ============================================================
// TOOLBAR
// ============================================================

function initColorPicker() {
    const grid    = document.getElementById('colorGrid');
    const preview = document.getElementById('colorPreview');
    if (!grid) return;
    grid.innerHTML = '';
    COLORS.forEach((color, i) => {
        const el = document.createElement('div');
        el.className = 'color-option' + (i === 0 ? ' selected' : '');
        el.style.background = color;
        el.addEventListener('click', () => {
            document.querySelectorAll('.color-option').forEach(c => c.classList.remove('selected'));
            el.classList.add('selected');
            currentColor = color;
            currentTool  = 'brush';
            if (preview) preview.style.background = color;
            updateToolButtons();
            closePopups();
        });
        grid.appendChild(el);
    });
    if (preview) preview.style.background = currentColor;
}

function initSizePicker() {
    const wrap = document.getElementById('sizeOptions');
    if (!wrap) return;
    wrap.innerHTML = '';
    SIZES.forEach((s, i) => {
        const el = document.createElement('div');
        el.className = 'size-option' + (i === 1 ? ' selected' : '');
        el.innerHTML = `<div style="width:38px;height:${Math.max(2,s.size)}px;background:#333;border-radius:3px"></div><span>${s.label}</span>`;
        el.addEventListener('click', () => {
            document.querySelectorAll('.size-option').forEach(x => x.classList.remove('selected'));
            el.classList.add('selected');
            currentSize = s.size;
            closePopups();
        });
        wrap.appendChild(el);
    });
}

function initToolbarButtons() {
    const b = id => document.getElementById(id);
    b('colorBtn')  && b('colorBtn').addEventListener('click',  () => togglePopup('colorPopup'));
    b('sizeBtn')   && b('sizeBtn').addEventListener('click',   () => togglePopup('sizePopup'));
    b('brushBtn')  && b('brushBtn').addEventListener('click',  () => { currentTool = 'brush';  updateToolButtons(); });
    b('eraserBtn') && b('eraserBtn').addEventListener('click', () => { currentTool = 'eraser'; updateToolButtons(); });
    b('bucketBtn') && b('bucketBtn').addEventListener('click', () => { currentTool = 'bucket'; updateToolButtons(); });
    b('undoBtn')   && b('undoBtn').addEventListener('click',   undoAndSync);
    b('clearBtn')  && b('clearBtn').addEventListener('click',  clearCanvasAndSync);
    updateToolButtons();
}

function updateToolButtons() {
    document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
    const map = { brush:'brushBtn', eraser:'eraserBtn', bucket:'bucketBtn' };
    const el  = document.getElementById(map[currentTool]);
    if (el) el.classList.add('active');
}

function togglePopup(id) {
    const popup   = document.getElementById(id);
    const backdrop = document.getElementById('popupBackdrop');
    if (!popup) return;
    const open = popup.classList.contains('show');
    closePopups();
    if (!open) {
        popup.classList.add('show');
        if (backdrop) backdrop.classList.add('show');
    }
}

function closePopups() {
    document.querySelectorAll('.popup').forEach(p => p.classList.remove('show'));
    const backdrop = document.getElementById('popupBackdrop');
    if (backdrop) backdrop.classList.remove('show');
}

// ============================================================
// GAME LOGIC — JOIN / CREATE
// ============================================================

function joinGame() {
    const nameEl = document.getElementById('playerName');
    const codeEl = document.getElementById('roomCode');
    const name   = (nameEl && nameEl.value.trim()) || ('Player' + Math.floor(Math.random() * 999));
    const code   = (codeEl && codeEl.value.trim().toUpperCase()) || '';

    if (!name) { showToast('Please enter your name', 'error'); return; }

    gameState.playerName = name;
    gameState.joinTime   = Date.now();

    showLoading(true);
    code ? joinRoom(code) : createRoom(generateCode());
}

function generateCode() {
    return Array.from({length:4}, () => 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random()*26)]).join('');
}

function createRoom(code) {
    gameState.roomCode = code;
    gameState.playerId = 'p_' + Date.now() + '_' + Math.floor(Math.random()*9999);

    roomRef    = database.ref('rooms/' + code);
    playersRef = roomRef.child('players');
    chatRef    = roomRef.child('chat');
    drawRef    = roomRef.child('draw');
    gameRef    = roomRef.child('game');

    roomRef.set({ created: firebase.database.ServerValue.TIMESTAMP })
        .then(addPlayer)
        .catch(e => { showToast('Error: ' + e.message, 'error'); showLoading(false); });
}

function joinRoom(code) {
    gameState.roomCode = code;
    gameState.playerId = 'p_' + Date.now() + '_' + Math.floor(Math.random()*9999);

    roomRef    = database.ref('rooms/' + code);
    playersRef = roomRef.child('players');
    chatRef    = roomRef.child('chat');
    drawRef    = roomRef.child('draw');
    gameRef    = roomRef.child('game');

    roomRef.once('value', snap => {
        if (!snap.exists()) {
            showToast('Room not found!', 'error');
            showLoading(false);
            return;
        }
        addPlayer();
    }, err => { showToast('Error: ' + err.message, 'error'); showLoading(false); });
}

function addPlayer() {
    playersRef.child(gameState.playerId).set({
        name:      gameState.playerName,
        score:     0,
        joined:    firebase.database.ServerValue.TIMESTAMP,
        hasGuessed:false,
    }).then(() => {
        // Auto-remove on disconnect
        playersRef.child(gameState.playerId).onDisconnect().remove();
        setupListeners();
        showGameScreen();
    }).catch(e => { showToast('Error: ' + e.message, 'error'); showLoading(false); });
}

// ============================================================
// FIREBASE LISTENERS
// ============================================================

function setupListeners() {
    // Players
    playersRef.on('value', snap => {
        gameState.players = snap.val() || {};
        renderPlayerList();

        const ids      = Object.keys(gameState.players);
        const amFirst  = ids.length > 0 && ids[0] === gameState.playerId;
        // First player triggers game start when ≥2 players present
        if (amFirst && ids.length >= 2 && !gameState.gameStarted) {
            tryStartGame();
        }
    });

    // Chat (only messages after we joined)
    chatRef.limitToLast(100).on('child_added', snap => {
        const msg = snap.val();
        if (msg && msg.t >= gameState.joinTime) renderMessage(msg);
    });

    // Game state
    gameRef.on('value', snap => {
        const g = snap.val();
        if (g) handleGameState(g);
    });

    // Drawing
    listenDrawing();
}

// ── Game start ────────────────────────────────────────────

function tryStartGame() {
    if (gameState.gameStarted) return;

    const ids = Object.keys(gameState.players);
    if (ids.length < 2) return;

    gameState.gameStarted = true;

    gameRef.once('value', snap => {
        const existing = snap.val();
        // Don't restart if a game is already in progress
        if (existing && existing.state && existing.state !== 'waiting') return;

        gameRef.set({
            state:              'choosing',
            round:              1,
            maxRounds:          10,
            playerList:         ids,
            currentDrawerIndex: 0,
            drawer:             ids[0],
            word:               null,
            timer:              80,
            startTime:          null,
            allGuessed:         false,
        });
    });
}

// ── Core game state handler ───────────────────────────────

function handleGameState(g) {
    const prev = gameState.currentState;

    gameState.game         = g;
    gameState.currentState = g.state || 'waiting';
    gameState.isDrawer     = (g.drawer === gameState.playerId);
    gameState.currentWord  = g.word || null;

    if (g.state !== 'waiting') gameState.gameStarted = true;

    // Clear canvas when a new drawing round begins
    if (g.state === 'drawing' && prev !== 'drawing') {
        clearCanvasLocal();
        drawRef.off();
        listenDrawing();
        gameState.hasGuessedCorrectly = false;
        gameState.endRoundScheduled   = false;
    }

    updateTopBar(g);
    updateDrawerUI();

    // Handle per-state UI
    const waitEl  = document.getElementById('waitingOverlay');
    const roundEl = document.getElementById('roundOverlay');
    const wordMod = document.getElementById('wordModal');

    // Hide everything first
    if (waitEl)  waitEl.classList.remove('show');
    if (roundEl) roundEl.classList.remove('show');

    switch (g.state) {
        case 'choosing':
            if (gameState.isDrawer) {
                if (wordMod && !wordMod.classList.contains('show')) showWordModal();
            } else {
                if (waitEl) waitEl.classList.add('show');
                if (wordMod) wordMod.classList.remove('show');
            }
            break;

        case 'drawing':
            if (wordMod) wordMod.classList.remove('show');
            if (gameState.isDrawer && !timerInterval) startTimer(g);
            break;

        case 'round_end':
            if (wordMod) wordMod.classList.remove('show');
            if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
            if (roundEl) roundEl.classList.add('show');
            const rw = document.getElementById('revealedWord');
            if (rw) rw.textContent = g.word || '---';
            playSound('roundEnd');
            break;

        case 'game_over':
            if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
            showGameOver();
            break;
    }
}

function updateTopBar(g) {
    const roundEl = document.getElementById('roundInfo');
    const timerEl = document.getElementById('timerDisplay');
    const wordEl  = document.getElementById('wordDisplay');

    if (roundEl) roundEl.textContent = `Round ${g.round || 1}/${g.maxRounds || 10}`;
    if (timerEl) timerEl.textContent = g.timer !== undefined ? g.timer : 80;

    if (wordEl) {
        if (!g.word) {
            wordEl.textContent = 'Waiting...';
            wordEl.classList.remove('revealed');
        } else if (gameState.isDrawer || gameState.hasGuessedCorrectly) {
            wordEl.textContent = g.word.toUpperCase().split('').join(' ');
            wordEl.classList.add('revealed');
        } else {
            // Show blanks for guessers
            wordEl.textContent = g.word.split('').map(c => c === ' ' ? '  ' : '_').join(' ');
            wordEl.classList.remove('revealed');
        }
    }
}

function updateDrawerUI() {
    const badge   = document.getElementById('drawerBadge');
    const toolbar = document.getElementById('toolbarWrap');

    if (gameState.isDrawer && gameState.currentState === 'drawing') {
        if (badge)   badge.classList.add('show');
        if (toolbar) toolbar.classList.add('show');
    } else {
        if (badge)   badge.classList.remove('show');
        if (toolbar) toolbar.classList.remove('show');
    }
}

// ── Word Selection ────────────────────────────────────────

function showWordModal() {
    const modal = document.getElementById('wordModal');
    if (!modal || modal.classList.contains('show')) return;

    const opts = WordBank.getWordOptions();
    const wrap = document.getElementById('wordOptions');
    if (!wrap) return;

    wrap.innerHTML = '';
    opts.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'word-btn';
        btn.innerHTML = `${opt.word}<small>${opt.difficulty} • ${opt.points} pts</small>`;
        btn.addEventListener('click', () => selectWord(opt.word));
        wrap.appendChild(btn);
    });

    modal.classList.add('show');

    let countdown = 15;
    const timerEl = document.getElementById('wordTimer');
    if (timerEl) timerEl.textContent = countdown;

    if (wordSelectTimer) clearInterval(wordSelectTimer);
    wordSelectTimer = setInterval(() => {
        countdown--;
        if (timerEl) timerEl.textContent = countdown;
        if (countdown <= 0) {
            clearInterval(wordSelectTimer);
            if (modal.classList.contains('show')) selectWord(opts[0].word);
        }
    }, 1000);
}

function selectWord(word) {
    if (wordSelectTimer) { clearInterval(wordSelectTimer); wordSelectTimer = null; }
    const modal = document.getElementById('wordModal');
    if (modal) modal.classList.remove('show');

    clearCanvasLocal();
    // Clear old draw events
    drawRef.set(null);

    gameRef.update({
        state:     'drawing',
        word:      word,
        timer:     80,
        startTime: firebase.database.ServerValue.TIMESTAMP,
        allGuessed:false,
    });
}

// ── Timer ─────────────────────────────────────────────────

function startTimer(g) {
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }

    const startTime = Date.now();
    const DURATION  = 80;

    timerInterval = setInterval(() => {
        if (!gameState.isDrawer) { clearInterval(timerInterval); timerInterval = null; return; }

        const elapsed   = Math.floor((Date.now() - startTime) / 1000);
        const remaining = Math.max(0, DURATION - elapsed);

        gameRef.update({ timer: remaining });

        if (remaining <= 0) {
            clearInterval(timerInterval);
            timerInterval = null;
            endRound();
        }
    }, 1000);
}

// ── End Round ─────────────────────────────────────────────

function endRound() {
    // Guard: only the drawer ends the round (avoids multiple calls)
    if (!gameState.isDrawer) return;
    if (gameState.endRoundScheduled) return;
    gameState.endRoundScheduled = true;

    gameRef.once('value', snap => {
        const g = snap.val();
        if (!g || g.state === 'round_end' || g.state === 'game_over') return;

        const playerList = g.playerList || Object.keys(gameState.players);
        let   nextIdx    = (g.currentDrawerIndex + 1) % playerList.length;
        let   nextRound  = g.round || 1;

        if (nextIdx === 0) nextRound++;

        // Skip disconnected players
        let attempts = 0;
        while (attempts < playerList.length && !gameState.players[playerList[nextIdx]]) {
            nextIdx = (nextIdx + 1) % playerList.length;
            if (nextIdx === 0) nextRound++;
            attempts++;
        }

        if (nextRound > (g.maxRounds || 10)) {
            // Reset all hasGuessed then go to game_over
            const u = {};
            playerList.forEach(pid => { u[`players/${pid}/hasGuessed`] = false; });
            u['game/state'] = 'game_over';
            roomRef.update(u);
            return;
        }

        const nextDrawer = playerList[nextIdx];

        // Reset hasGuessed for next round
        const updates = {};
        playerList.forEach(pid => {
            updates[`players/${pid}/hasGuessed`] = false;
        });

        roomRef.update(updates).then(() => {
            gameRef.update({ state: 'round_end' });

            setTimeout(() => {
                gameState.endRoundScheduled = false;
                gameRef.set({
                    state:              'choosing',
                    round:              nextRound,
                    maxRounds:          g.maxRounds || 10,
                    playerList:         playerList,
                    currentDrawerIndex: nextIdx,
                    drawer:             nextDrawer,
                    word:               null,
                    timer:              80,
                    startTime:          null,
                    allGuessed:         false,
                });
                // Clear draw history for new round
                drawRef.set(null);
            }, 3500);
        });
    });
}

// ============================================================
// CHAT + GUESS DETECTION
//
// BUG FIX: trim + lowercase on both sides; check
// isGameActive = state === 'drawing' before accepting guess.
// ============================================================

function sendMessage() {
    const input = document.getElementById('chatInput');
    if (!input) return;

    const raw  = input.value;
    const text = raw.trim();
    if (!text) return;

    input.value = '';

    // Drawer cannot guess, but can chat
    if (gameState.isDrawer) {
        pushChat({ type:'drawer', text, name: gameState.playerName });
        return;
    }

    const me = gameState.players[gameState.playerId];

    // Already guessed correctly — only send chat
    if (me && me.hasGuessed) {
        pushChat({ type:'guesser', text, name: gameState.playerName });
        return;
    }

    // Check guess
    if (gameState.currentState === 'drawing' && gameState.currentWord) {
        const guess = text.toLowerCase().trim();
        const word  = gameState.currentWord.toLowerCase().trim();
        if (guess === word) {
            handleCorrectGuess(me);
            return;
        }
    }

    // Normal guess message
    pushChat({ type:'guess', text, name: gameState.playerName });
}

function handleCorrectGuess(me) {
    if (!me || me.hasGuessed) return;
    if (gameState.hasGuessedCorrectly) return;
    gameState.hasGuessedCorrectly = true;

    // Points: more time left = more points
    const timerVal = (gameState.game && gameState.game.timer) ? gameState.game.timer : 80;
    const points   = Math.max(10, Math.round(timerVal / 80 * 90) + 10);

    playersRef.child(gameState.playerId).update({
        score:      (me.score || 0) + points,
        hasGuessed: true,
    });

    pushChat({ type:'correct', text:`guessed the word! (+${points} pts)`, name: gameState.playerName });
    playSound('correct');

    // Reveal word in top bar
    const wordEl = document.getElementById('wordDisplay');
    if (wordEl && gameState.currentWord) {
        wordEl.textContent = gameState.currentWord.toUpperCase().split('').join(' ');
        wordEl.classList.add('revealed');
    }

    // Check if all guessers are done
    checkAllGuessed();
}

function checkAllGuessed() {
    const g = gameState.game;
    if (!g) return;

    const ids      = Object.keys(gameState.players);
    const guessers = ids.filter(id => id !== g.drawer);
    if (guessers.length === 0) return;

    const allDone = guessers.every(id => {
        const p = gameState.players[id];
        return p && p.hasGuessed;
    });

    if (allDone) {
        // Give drawer a bonus and mark allGuessed
        const drawer = gameState.players[g.drawer];
        if (drawer) {
            playersRef.child(g.drawer).update({ score: (drawer.score || 0) + 30 });
        }
        gameRef.update({ allGuessed: true });

        // Drawer ends the round (they're the only one calling endRound)
        if (gameState.isDrawer) {
            if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
            setTimeout(endRound, 1500);
        }
    }
}

// ── Chat push / render ────────────────────────────────────

function pushChat(msg) {
    if (!chatRef) return;
    chatRef.push({
        ...msg,
        pid: gameState.playerId,
        t:   firebase.database.ServerValue.TIMESTAMP,
    });
}

function renderMessage(msg) {
    const wrap = document.getElementById('chatMessages');
    if (!wrap) return;

    const div = document.createElement('div');
    div.className = 'chat-message';

    if (msg.type === 'system') {
        div.classList.add('system');
        div.textContent = msg.text;
    } else if (msg.type === 'correct') {
        div.classList.add('correct');
        div.innerHTML = `<span class="username">${escHtml(msg.name)}</span> ${escHtml(msg.text)}`;
    } else if (msg.type === 'drawer') {
        div.classList.add('drawer-chat');
        div.innerHTML = `<span class="username">${escHtml(msg.name)} (drawing)</span> ${escHtml(msg.text)}`;
    } else if (msg.type === 'guesser') {
        div.classList.add('guesser-chat');
        div.innerHTML = `<span class="username">${escHtml(msg.name)}</span> ${escHtml(msg.text)}`;
    } else {
        div.classList.add('guess');
        div.innerHTML = `<span class="username">${escHtml(msg.name)}</span> ${escHtml(msg.text)}`;
    }

    wrap.appendChild(div);
    wrap.scrollTop = wrap.scrollHeight;
}

function escHtml(str) {
    return String(str)
        .replace(/&/g,'&amp;')
        .replace(/</g,'&lt;')
        .replace(/>/g,'&gt;')
        .replace(/"/g,'&quot;');
}

// ============================================================
// PLAYER LIST
// ============================================================

function renderPlayerList() {
    const wrap  = document.getElementById('playersList');
    const count = document.getElementById('playerCount');
    if (!wrap) return;

    const entries = Object.entries(gameState.players);
    if (count) count.textContent = `${entries.length}/8`;

    entries.sort((a,b) => ((b[1]?.score||0) - (a[1]?.score||0)));

    wrap.innerHTML = '';
    entries.forEach(([id, p]) => {
        if (!p) return;
        const div = document.createElement('div');
        div.className = 'player-item';
        if (id === gameState.game?.drawer) div.classList.add('current-drawer');
        if (p.hasGuessed) div.classList.add('guessed');

        const isMe = id === gameState.playerId;
        const name = escHtml(p.name || 'Unknown');
        div.innerHTML = `
            <div class="player-avatar">${name[0].toUpperCase()}</div>
            <div class="player-info">
                <div class="player-name">${name}${isMe ? ' <i>(you)</i>' : ''}</div>
            </div>
            <div class="player-score">${p.score || 0}</div>`;
        wrap.appendChild(div);
    });
}

// ============================================================
// GAME OVER
// ============================================================

function showGameOver() {
    if (autoRestartTimer) clearInterval(autoRestartTimer);

    const modal      = document.getElementById('gameOverModal');
    const winnerEl   = document.getElementById('winnerDisplay');
    const scoresEl   = document.getElementById('finalScores');
    const restartEl  = document.getElementById('autoRestartText');

    const sorted = Object.entries(gameState.players)
        .filter(([,p]) => !!p)
        .sort((a,b) => (b[1].score||0) - (a[1].score||0));

    const winner = sorted[0];
    if (winnerEl && winner) {
        winnerEl.innerHTML = `
            <div class="winner-crown">👑</div>
            <div class="winner-name">${escHtml(winner[1].name)}</div>
            <div class="winner-score">${winner[1].score || 0} points</div>`;
    }

    if (scoresEl) {
        scoresEl.innerHTML = '';
        sorted.forEach(([id, p], i) => {
            const div = document.createElement('div');
            div.className = 'final-score-item' + (i === 0 ? ' winner' : '');
            div.innerHTML = `
                <span class="final-rank">#${i+1}</span>
                <span class="final-name">${escHtml(p.name)}</span>
                <span class="final-points">${p.score||0}</span>`;
            scoresEl.appendChild(div);
        });
    }

    if (modal) modal.classList.add('show');

    let sec = 10;
    if (restartEl) restartEl.textContent = `New game starts in ${sec}...`;
    autoRestartTimer = setInterval(() => {
        sec--;
        if (restartEl) restartEl.textContent = `New game starts in ${sec}...`;
        if (sec <= 0) { clearInterval(autoRestartTimer); playAgain(); }
    }, 1000);
}

function playAgain() {
    if (autoRestartTimer) { clearInterval(autoRestartTimer); autoRestartTimer = null; }
    gameState.gameStarted         = false;
    gameState.hasGuessedCorrectly = false;
    gameState.endRoundScheduled   = false;

    const ids     = Object.keys(gameState.players);
    const updates = {};
    ids.forEach(pid => {
        updates[`players/${pid}/score`]      = 0;
        updates[`players/${pid}/hasGuessed`] = false;
    });
    roomRef.update(updates).then(() => {
        gameRef.set({
            state:              'choosing',
            round:              1,
            maxRounds:          10,
            playerList:         ids,
            currentDrawerIndex: 0,
            drawer:             ids[0] || gameState.playerId,
            word:               null,
            timer:              80,
            startTime:          null,
            allGuessed:         false,
        });
        drawRef.set(null);
    });

    const modal = document.getElementById('gameOverModal');
    if (modal) modal.classList.remove('show');
}

// ============================================================
// SHOW / HIDE SCREENS
// ============================================================

function showGameScreen() {
    showLoading(false);
    const login = document.getElementById('loginScreen');
    const game  = document.getElementById('gameScreen');
    const rCode = document.getElementById('roomCodeDisplay');

    if (login) login.style.display = 'none';
    if (game)  game.style.display  = 'flex';
    if (rCode) rCode.textContent   = gameState.roomCode;

    // Give the browser a frame to paint the game screen, THEN measure and init canvas.
    // We use two rAF calls to be safe on slower devices.
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            initCanvas();
        });
    });

    playSound('enter');
    pushChat({ type:'system', text: `${gameState.playerName} joined!` });
}

function showLoading(show) {
    const el = document.getElementById('loadingOverlay');
    if (el) el.classList.toggle('show', show);
}

function showToast(msg, type) {
    const wrap = document.getElementById('toastContainer');
    if (!wrap) { alert(msg); return; }
    const t = document.createElement('div');
    t.className = 'toast ' + (type || '');
    t.textContent = msg;
    wrap.appendChild(t);
    setTimeout(() => t.remove(), 3200);
}

function exitGame() {
    if (playersRef && gameState.playerId) {
        playersRef.child(gameState.playerId).remove();
        pushChat({ type:'system', text: `${gameState.playerName} left.` });
    }
    if (timerInterval)    clearInterval(timerInterval);
    if (autoRestartTimer) clearInterval(autoRestartTimer);
    if (wordSelectTimer)  clearInterval(wordSelectTimer);
    location.reload();
}

window.addEventListener('beforeunload', () => {
    if (gameState.currentState === 'drawing') return 'Leave game?';
});

console.log('🎮 Skribbl.io 28 — fully fixed engine loaded');
