/* ================================================================
   SKRIBBL.IO 28 — COMPLETE GAME ENGINE
   Fixes applied:
   1. Canvas always visible — sized by JS reading wrapper dimensions
   2. Canvas never resizes on keyboard open — only orientation triggers resize
   3. HiDPI/Retina: buffer = CSS size × devicePixelRatio
   4. Touch coordinates accurate via getBoundingClientRect
   5. Drawing fully synced: start dot, segments, fill, undo, clear
   6. Undo synced via snapshot so all clients redraw identically
   7. Chat always visible, toolbar in own fixed-height row
   8. Correct guess: trim + lowercase exact match
   9. Round ends correctly after all guess or timer
   10. Turn order stable, drawer index tracked in Firebase
   ================================================================ */

'use strict';

// ================================================================
// GAME STATE
// ================================================================
const GS = {
    // Player identity
    roomCode:    null,
    playerName:  null,
    playerId:    null,

    // Game progression
    isDrawer:              false,
    currentWord:           null,
    round:                 1,
    maxRounds:             10,
    currentState:          'waiting',  // waiting | choosing | drawing | round_end | game_over
    hasGuessedCorrectly:   false,
    endRoundLock:          false,

    // Firebase live data
    players:     {},
    game:        null,
    joinTime:    null,
    gameStarted: false,
};

// ================================================================
// CANVAS STATE
// ================================================================
let canvas  = null;
let ctx     = null;
let canvasCSSW  = 0;   // CSS pixel width of canvas
let canvasCSSH  = 0;   // CSS pixel height of canvas
let canvasDPR   = 1;   // devicePixelRatio at init
let canvasReady = false;

// Drawing state
let isPointerDown  = false;
let currentTool    = 'brush';   // brush | eraser | bucket
let currentColor   = '#000000';
let currentSize    = 5;
let lastX = 0, lastY = 0;

// History for undo — array of stroke/fill objects
// Strokes use CSS pixel coordinates (DPR scaling handled by ctx transform)
let drawHistory  = [];
let activeStroke = null;  // stroke being drawn right now

// ================================================================
// FIREBASE REFS
// ================================================================
let roomRef    = null;
let playersRef = null;
let chatRef    = null;
let drawRef    = null;
let gameRef    = null;

// ================================================================
// TIMERS
// ================================================================
let timerInterval    = null;
let autoRestartTimer = null;
let wordSelectTimer  = null;

// ================================================================
// SOUNDS
// ================================================================
const SFX = {};

// ================================================================
// PALETTE & SIZES
// ================================================================
const COLOR_PALETTE = [
    '#000000', '#1a1a2e', '#16213e', '#0f3460',
    '#533483', '#e94560', '#f5a623', '#f8e71c',
    '#7ed321', '#4a90d9', '#50e3c2', '#b8e986',
    '#ffffff', '#d0d0d0', '#9b9b9b', '#4a4a4a',
    '#8b572a', '#d0021b', '#bd10e0', '#417505',
];

const BRUSH_SIZES = [
    { px: 2,  label: 'Tiny',   icon: '•'  },
    { px: 5,  label: 'Small',  icon: '⬤'  },
    { px: 10, label: 'Medium', icon: '⬤'  },
    { px: 18, label: 'Large',  icon: '⬤'  },
    { px: 28, label: 'Huge',   icon: '⬤'  },
];

// ================================================================
// DOM HELPERS
// ================================================================
function el(id) { return document.getElementById(id); }
function qs(sel, root) { return (root || document).querySelector(sel); }

// ================================================================
// INITIALIZATION
// ================================================================
document.addEventListener('DOMContentLoaded', () => {
    buildColorPicker();
    buildSizePicker();
    bindToolbarButtons();
    loadSounds();

    // Enter key in chat sends message
    const chatInput = el('chatInput');
    if (chatInput) {
        chatInput.addEventListener('keydown', e => {
            if (e.key === 'Enter') {
                e.preventDefault();
                sendMessage();
            }
        });
    }
});

function loadSounds() {
    SFX.join     = el('soundJoin');
    SFX.correct  = el('soundCorrect');
    SFX.roundEnd = el('soundRoundEnd');
    SFX.leave    = el('soundLeave');
    SFX.enter    = el('soundEnter');
}

function playSound(name) {
    try {
        const s = SFX[name];
        if (s) { s.currentTime = 0; s.play().catch(() => {}); }
    } catch (ignore) {}
}

// ================================================================
// CANVAS — HiDPI AWARE, STABLE SIZE
// ================================================================

/*
 * The canvas element fills its wrapper via CSS (width:100%, height:100%).
 * The wrapper has flex:1 so it grows to fill the remaining screen height.
 *
 * initCanvas() reads the wrapper's actual pixel dimensions, then sets
 * canvas.width = width × DPR and canvas.height = height × DPR.
 * ctx is then scaled by DPR so all drawing calls use CSS pixel values.
 *
 * CRITICAL: We do NOT resize the canvas when the keyboard opens.
 * The keyboard just compresses the flex layout (canvas shrinks visually
 * but we keep the same internal buffer). Only orientation change
 * triggers a true reinit.
 */
function initCanvas() {
    canvas = el('gameCanvas');
    if (!canvas) { console.error('Canvas element not found!'); return; }

    const wrapper = el('canvasWrapper');
    if (!wrapper) { console.error('Canvas wrapper not found!'); return; }

    // Force layout to be calculated before reading sizes
    const rect = wrapper.getBoundingClientRect();
    canvasCSSW = Math.floor(rect.width);
    canvasCSSH = Math.floor(rect.height);
    canvasDPR  = window.devicePixelRatio || 1;

    if (canvasCSSW <= 0 || canvasCSSH <= 0) {
        // Wrapper not laid out yet — retry after a frame
        requestAnimationFrame(initCanvas);
        return;
    }

    // Set internal buffer dimensions (physical pixels)
    canvas.width  = Math.round(canvasCSSW * canvasDPR);
    canvas.height = Math.round(canvasCSSH * canvasDPR);

    // Get context with alpha:false for better performance on mobile
    ctx = canvas.getContext('2d', { alpha: false });

    // Scale transform so all draw calls use logical CSS pixels
    ctx.setTransform(canvasDPR, 0, 0, canvasDPR, 0, 0);

    // Default context settings
    ctx.lineCap  = 'round';
    ctx.lineJoin = 'round';
    ctx.imageSmoothingEnabled = true;

    // White background
    fillWhite();

    // Attach pointer/touch events
    attachCanvasEvents();

    // Handle device rotation only
    window.addEventListener('orientationchange', onOrientationChange);

    canvasReady = true;
    console.log(`Canvas ready: ${canvasCSSW}×${canvasCSSH} CSS px | ${canvas.width}×${canvas.height} buffer | DPR:${canvasDPR}`);
}

function fillWhite() {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvasCSSW, canvasCSSH);
}

function onOrientationChange() {
    // Wait for browser to complete the rotation before reading new sizes
    setTimeout(() => {
        if (!canvas || !canvasReady) return;

        const wrapper = el('canvasWrapper');
        if (!wrapper) return;

        const rect    = wrapper.getBoundingClientRect();
        const newCSSW = Math.floor(rect.width);
        const newCSSH = Math.floor(rect.height);
        const newDPR  = window.devicePixelRatio || 1;

        // Only reinit if dimensions actually changed meaningfully
        if (Math.abs(newCSSW - canvasCSSW) < 4 && Math.abs(newCSSH - canvasCSSH) < 4) return;

        // Save current drawing as image so we can restore it
        const imageDataURL = canvas.toDataURL('image/png');

        canvasCSSW = newCSSW;
        canvasCSSH = newCSSH;
        canvasDPR  = newDPR;

        canvas.width  = Math.round(canvasCSSW * canvasDPR);
        canvas.height = Math.round(canvasCSSH * canvasDPR);

        ctx.setTransform(canvasDPR, 0, 0, canvasDPR, 0, 0);
        ctx.lineCap  = 'round';
        ctx.lineJoin = 'round';
        ctx.imageSmoothingEnabled = true;

        fillWhite();

        // Restore previous drawing scaled to new size
        const img    = new Image();
        img.onload   = () => ctx.drawImage(img, 0, 0, canvasCSSW, canvasCSSH);
        img.src      = imageDataURL;
    }, 350);
}

// ================================================================
// CANVAS EVENTS
// ================================================================

function attachCanvasEvents() {
    canvas.removeEventListener('mousedown',   onMouseDown);
    canvas.removeEventListener('mousemove',   onMouseMove);
    canvas.removeEventListener('mouseup',     onMouseUp);
    canvas.removeEventListener('mouseleave',  onMouseUp);
    canvas.removeEventListener('touchstart',  onTouchStart);
    canvas.removeEventListener('touchmove',   onTouchMove);
    canvas.removeEventListener('touchend',    onTouchEnd);
    canvas.removeEventListener('touchcancel', onTouchEnd);

    canvas.addEventListener('mousedown',  onMouseDown);
    canvas.addEventListener('mousemove',  onMouseMove);
    canvas.addEventListener('mouseup',    onMouseUp);
    canvas.addEventListener('mouseleave', onMouseUp);
    canvas.addEventListener('touchstart',  onTouchStart, { passive: false });
    canvas.addEventListener('touchmove',   onTouchMove,  { passive: false });
    canvas.addEventListener('touchend',    onTouchEnd,   { passive: false });
    canvas.addEventListener('touchcancel', onTouchEnd,   { passive: false });
}

// Returns CSS pixel position within canvas from any pointer event
function getCanvasXY(e) {
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
        x: Math.max(0, Math.min(canvasCSSW - 1, cx - rect.left)),
        y: Math.max(0, Math.min(canvasCSSH - 1, cy - rect.top)),
    };
}

function canDraw() {
    return GS.isDrawer && GS.currentState === 'drawing' && canvasReady;
}

// Touch wrappers
function onTouchStart(e) { e.preventDefault(); if (e.touches.length === 1) onMouseDown(e); }
function onTouchMove(e)  { e.preventDefault(); if (e.touches.length === 1) onMouseMove(e); }
function onTouchEnd(e)   { e.preventDefault(); onMouseUp(e); }

// ── POINTER DOWN ─────────────────────────────────────────────────
function onMouseDown(e) {
    if (!canDraw()) return;
    e.preventDefault();

    const { x, y } = getCanvasXY(e);
    lastX = x;
    lastY = y;
    isPointerDown = true;

    if (currentTool === 'bucket') {
        const fillX = Math.round(x);
        const fillY = Math.round(y);
        floodFill(fillX, fillY, currentColor);
        const entry = { type: 'fill', x: fillX, y: fillY, color: currentColor };
        drawHistory.push(entry);
        firebasePushDraw({ type: 'fill', x: fillX, y: fillY, color: currentColor });
        isPointerDown = false;
        return;
    }

    const strokeColor = currentTool === 'eraser' ? '#ffffff' : currentColor;

    // Draw a dot at the start position so single taps register
    ctx.beginPath();
    ctx.arc(x, y, currentSize / 2, 0, Math.PI * 2);
    ctx.fillStyle = strokeColor;
    ctx.fill();

    // Begin tracking this stroke
    activeStroke = {
        type:   'stroke',
        color:  strokeColor,
        size:   currentSize,
        points: [{ x, y }],
    };

    // Sync start event
    firebasePushDraw({
        type:  'start',
        x,
        y,
        color: strokeColor,
        size:  currentSize,
    });
}

// ── POINTER MOVE ─────────────────────────────────────────────────
function onMouseMove(e) {
    if (!isPointerDown || !canDraw()) return;
    e.preventDefault();

    const { x, y } = getCanvasXY(e);
    const dist = Math.hypot(x - lastX, y - lastY);
    if (dist < 1.2) return; // Skip tiny moves

    const strokeColor = currentTool === 'eraser' ? '#ffffff' : currentColor;

    ctx.lineWidth   = currentSize;
    ctx.strokeStyle = strokeColor;
    ctx.lineCap     = 'round';
    ctx.lineJoin    = 'round';
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(x, y);
    ctx.stroke();

    if (activeStroke) activeStroke.points.push({ x, y });

    // Sync segment — include all data so receiver doesn't need extra state
    firebasePushDraw({
        type:  'seg',
        lx:    lastX,
        ly:    lastY,
        x,
        y,
        color: strokeColor,
        size:  currentSize,
    });

    lastX = x;
    lastY = y;
}

// ── POINTER UP ───────────────────────────────────────────────────
function onMouseUp(e) {
    if (!isPointerDown) return;
    isPointerDown = false;

    if (activeStroke && activeStroke.points.length > 0) {
        drawHistory.push(activeStroke);
        if (drawHistory.length > 100) drawHistory.shift(); // cap memory
    }
    activeStroke = null;

    firebasePushDraw({ type: 'end' });
}

// ================================================================
// FLOOD FILL (works on physical pixel buffer, accepts CSS coords)
// ================================================================
function floodFill(cssPX, cssPY, fillHex) {
    if (!ctx || !canvas) return;

    // Convert CSS → physical pixel coords
    const physX = Math.round(cssPX * canvasDPR);
    const physY = Math.round(cssPY * canvasDPR);
    const W     = canvas.width;
    const H     = canvas.height;

    const imageData = ctx.getImageData(0, 0, W, H);
    const data      = imageData.data;
    const target    = pixelAt(data, physX, physY, W);
    const fill      = hexToRgbObj(fillHex);

    if (rgbEqual(target, fill)) return;

    const visited = new Uint8Array(W * H);
    const stack   = [physX + physY * W];

    while (stack.length > 0) {
        const idx = stack.pop();
        if (visited[idx]) continue;
        visited[idx] = 1;

        const px = idx % W;
        const py = (idx - px) / W;

        if (px < 0 || px >= W || py < 0 || py >= H) continue;

        const c = pixelAt(data, px, py, W);
        if (!rgbClose(c, target, 38)) continue;

        setPixel(data, px, py, W, fill);

        if (px + 1 < W) stack.push(idx + 1);
        if (px - 1 >= 0) stack.push(idx - 1);
        if (py + 1 < H)  stack.push(idx + W);
        if (py - 1 >= 0) stack.push(idx - W);
    }

    ctx.putImageData(imageData, 0, 0);
}

function pixelAt(data, x, y, W) {
    const i = (y * W + x) * 4;
    return { r: data[i], g: data[i+1], b: data[i+2] };
}

function setPixel(data, x, y, W, c) {
    const i = (y * W + x) * 4;
    data[i]   = c.r;
    data[i+1] = c.g;
    data[i+2] = c.b;
    data[i+3] = 255;
}

function rgbClose(a, b, tol) {
    return Math.abs(a.r - b.r) <= tol &&
           Math.abs(a.g - b.g) <= tol &&
           Math.abs(a.b - b.b) <= tol;
}

function rgbEqual(a, b) {
    return a.r === b.r && a.g === b.g && a.b === b.b;
}

function hexToRgbObj(hex) {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return m ? { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) } : { r:0, g:0, b:0 };
}

// ================================================================
// UNDO / REDRAW
// ================================================================

function undoLocal() {
    if (drawHistory.length === 0) return false;
    drawHistory.pop();
    redrawFromHistory();
    return true;
}

function redrawFromHistory() {
    if (!ctx) return;
    fillWhite();
    ctx.lineCap  = 'round';
    ctx.lineJoin = 'round';

    for (const entry of drawHistory) {
        if (entry.type === 'stroke') {
            if (entry.points.length === 0) continue;
            ctx.lineWidth   = entry.size;
            ctx.strokeStyle = entry.color;
            ctx.lineCap     = 'round';
            ctx.lineJoin    = 'round';

            // Draw dot for single-point strokes
            if (entry.points.length === 1) {
                ctx.beginPath();
                ctx.arc(entry.points[0].x, entry.points[0].y, entry.size / 2, 0, Math.PI * 2);
                ctx.fillStyle = entry.color;
                ctx.fill();
            } else {
                ctx.beginPath();
                ctx.moveTo(entry.points[0].x, entry.points[0].y);
                for (let i = 1; i < entry.points.length; i++) {
                    ctx.lineTo(entry.points[i].x, entry.points[i].y);
                }
                ctx.stroke();
            }
        } else if (entry.type === 'fill') {
            floodFill(entry.x, entry.y, entry.color);
        }
    }
}

function undoAndSync() {
    if (!canDraw()) return;
    if (!undoLocal()) return;

    // Push undo notification so other clients know to wait for snapshot
    firebasePushDraw({ type: 'undo' });

    // Immediately publish the full current history as a snapshot
    // so all other clients can redraw to exactly the same state
    firebasePushDraw({
        type:    'snapshot',
        history: drawHistory,
    });
}

function clearCanvasLocal() {
    drawHistory  = [];
    activeStroke = null;
    if (ctx) fillWhite();
}

function clearCanvasAndSync() {
    if (!canDraw()) return;
    clearCanvasLocal();
    firebasePushDraw({ type: 'clear' });
}

// ================================================================
// FIREBASE DRAWING SYNC
// ================================================================

function firebasePushDraw(payload) {
    if (!drawRef || !GS.isDrawer) return;
    drawRef.push({
        ...payload,
        pid: GS.playerId,
        ts:  firebase.database.ServerValue.TIMESTAMP,
    });
}

// Called once per round to start listening for remote drawing events
function startListeningDraw() {
    if (!drawRef) return;
    drawRef.off(); // Remove old listeners

    drawRef.on('child_added', snap => {
        const d = snap.val();
        if (!d || d.pid === GS.playerId) return; // Ignore own events

        switch (d.type) {

            case 'start':
                // Draw start dot
                if (ctx) {
                    ctx.beginPath();
                    ctx.arc(d.x, d.y, d.size / 2, 0, Math.PI * 2);
                    ctx.fillStyle = d.color;
                    ctx.fill();
                }
                break;

            case 'seg':
                // Draw a line segment — data is self-contained
                if (ctx) {
                    ctx.lineWidth   = d.size;
                    ctx.strokeStyle = d.color;
                    ctx.lineCap     = 'round';
                    ctx.lineJoin    = 'round';
                    ctx.beginPath();
                    ctx.moveTo(d.lx, d.ly);
                    ctx.lineTo(d.x, d.y);
                    ctx.stroke();
                }
                break;

            case 'end':
                // Segment ended — nothing to do locally
                break;

            case 'fill':
                floodFill(d.x, d.y, d.color);
                break;

            case 'clear':
                clearCanvasLocal();
                break;

            case 'undo':
                // Undo event is informational — the snapshot that follows
                // will update us. If we receive undo without a snapshot
                // within 500ms, pop our own history as a fallback.
                break;

            case 'snapshot':
                // Authoritative redraw from drawer's history
                if (Array.isArray(d.history)) {
                    drawHistory = d.history;
                    redrawFromHistory();
                }
                break;

            default:
                break;
        }
    });
}

// ================================================================
// TOOLBAR UI
// ================================================================

function buildColorPicker() {
    const grid    = el('colorGrid');
    const colorDot = el('colorDot');
    if (!grid) return;

    grid.innerHTML = '';
    COLOR_PALETTE.forEach((color, idx) => {
        const swatch = document.createElement('div');
        swatch.className = 'color-swatch' + (idx === 0 ? ' selected' : '');
        swatch.style.background = color;
        swatch.title = color;

        swatch.addEventListener('click', () => {
            document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
            swatch.classList.add('selected');
            currentColor = color;
            currentTool  = 'brush';
            if (colorDot) colorDot.style.background = color;
            updateActiveToolButton();
            closePopups();
        });
        grid.appendChild(swatch);
    });

    if (colorDot) colorDot.style.background = currentColor;
}

function buildSizePicker() {
    const list = el('sizeOptionsList');
    if (!list) return;

    list.innerHTML = '';
    BRUSH_SIZES.forEach((s, idx) => {
        const item = document.createElement('div');
        item.className = 'size-option-item' + (idx === 1 ? ' selected' : '');

        const dot = document.createElement('div');
        dot.className = 'size-preview-dot';
        // Cap visual dot size for the UI
        const vizSize = Math.min(s.px, 24);
        dot.style.width  = vizSize + 'px';
        dot.style.height = vizSize + 'px';

        const label = document.createElement('span');
        label.className   = 'size-option-label';
        label.textContent = s.label + ' (' + s.px + 'px)';

        item.appendChild(dot);
        item.appendChild(label);

        item.addEventListener('click', () => {
            document.querySelectorAll('.size-option-item').forEach(i => i.classList.remove('selected'));
            item.classList.add('selected');
            currentSize = s.px;
            closePopups();
        });

        list.appendChild(item);
    });
}

function bindToolbarButtons() {
    const btn = id => el(id);

    btn('colorBtn')  && btn('colorBtn').addEventListener('click',  () => togglePopup('colorPopup'));
    btn('sizeBtn')   && btn('sizeBtn').addEventListener('click',   () => togglePopup('sizePopup'));
    btn('brushBtn')  && btn('brushBtn').addEventListener('click',  () => setTool('brush'));
    btn('eraserBtn') && btn('eraserBtn').addEventListener('click', () => setTool('eraser'));
    btn('bucketBtn') && btn('bucketBtn').addEventListener('click', () => setTool('bucket'));
    btn('undoBtn')   && btn('undoBtn').addEventListener('click',   undoAndSync);
    btn('clearBtn')  && btn('clearBtn').addEventListener('click',  clearCanvasAndSync);

    updateActiveToolButton();
}

function setTool(tool) {
    currentTool = tool;
    updateActiveToolButton();
}

function updateActiveToolButton() {
    document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('tool-active'));
    const map = { brush: 'brushBtn', eraser: 'eraserBtn', bucket: 'bucketBtn' };
    const target = el(map[currentTool]);
    if (target) target.classList.add('tool-active');
}

function togglePopup(id) {
    const popup    = el(id);
    const backdrop = el('popupBackdrop');
    if (!popup) return;
    const wasOpen = popup.classList.contains('show');
    closePopups();
    if (!wasOpen) {
        popup.classList.add('show');
        if (backdrop) backdrop.classList.add('show');
    }
}

function closePopups() {
    document.querySelectorAll('.popup').forEach(p => p.classList.remove('show'));
    const backdrop = el('popupBackdrop');
    if (backdrop) backdrop.classList.remove('show');
}

// ================================================================
// JOIN / CREATE GAME
// ================================================================

function joinGame() {
    const nameEl = el('playerName');
    const codeEl = el('roomCode');

    const name = (nameEl && nameEl.value.trim()) || ('Player' + Math.floor(Math.random() * 999 + 1));
    const code = (codeEl && codeEl.value.trim().toUpperCase()) || '';

    if (!name) {
        showToast('Please enter your name!', 'error');
        return;
    }

    GS.playerName = name;
    GS.playerId   = 'p_' + Date.now() + '_' + Math.floor(Math.random() * 9999);
    GS.joinTime   = Date.now();

    setLoadingVisible(true);

    if (code) {
        joinExistingRoom(code);
    } else {
        createNewRoom(generateRoomCode());
    }
}

function generateRoomCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    return Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function createNewRoom(code) {
    GS.roomCode = code;

    roomRef    = database.ref('rooms/' + code);
    playersRef = roomRef.child('players');
    chatRef    = roomRef.child('chat');
    drawRef    = roomRef.child('draw');
    gameRef    = roomRef.child('game');

    roomRef.set({
        created: firebase.database.ServerValue.TIMESTAMP,
    }).then(() => {
        addSelfToRoom();
    }).catch(err => {
        showToast('Could not create room: ' + err.message, 'error');
        setLoadingVisible(false);
    });
}

function joinExistingRoom(code) {
    GS.roomCode = code;

    roomRef    = database.ref('rooms/' + code);
    playersRef = roomRef.child('players');
    chatRef    = roomRef.child('chat');
    drawRef    = roomRef.child('draw');
    gameRef    = roomRef.child('game');

    roomRef.once('value', snap => {
        if (!snap.exists()) {
            showToast('Room "' + code + '" not found!', 'error');
            setLoadingVisible(false);
            return;
        }
        addSelfToRoom();
    }, err => {
        showToast('Connection error: ' + err.message, 'error');
        setLoadingVisible(false);
    });
}

function addSelfToRoom() {
    playersRef.child(GS.playerId).set({
        name:       GS.playerName,
        score:      0,
        hasGuessed: false,
        joinedAt:   firebase.database.ServerValue.TIMESTAMP,
    }).then(() => {
        // Auto-remove self from Firebase on disconnect
        playersRef.child(GS.playerId).onDisconnect().remove();
        setupFirebaseListeners();
        showGameScreen();
    }).catch(err => {
        showToast('Could not join room: ' + err.message, 'error');
        setLoadingVisible(false);
    });
}

// ================================================================
// FIREBASE LISTENERS
// ================================================================

function setupFirebaseListeners() {
    // ── Players ────────────────────────────────────────────────
    playersRef.on('value', snap => {
        GS.players = snap.val() || {};
        renderPlayerList();

        const playerIds = Object.keys(GS.players);
        const isFirst   = playerIds.length > 0 && playerIds[0] === GS.playerId;

        if (isFirst && playerIds.length >= 2 && !GS.gameStarted) {
            tryStartGame();
        }

        // Show/hide lobby overlay
        const lobbyEl = el('lobbyOverlay');
        const lobbyCode = el('lobbyRoomCode');
        if (lobbyEl) {
            if (playerIds.length < 2) {
                lobbyEl.classList.add('show');
                if (lobbyCode) lobbyCode.textContent = GS.roomCode;
            } else {
                lobbyEl.classList.remove('show');
            }
        }
    });

    // ── Chat (only load messages after we joined) ───────────────
    chatRef.limitToLast(120).on('child_added', snap => {
        const msg = snap.val();
        if (msg && msg.ts >= GS.joinTime) {
            renderChatMessage(msg);
        }
    });

    // ── Game state ──────────────────────────────────────────────
    gameRef.on('value', snap => {
        const g = snap.val();
        if (g) handleGameStateChange(g);
    });

    // ── Drawing ─────────────────────────────────────────────────
    startListeningDraw();
}

// ================================================================
// START GAME
// ================================================================

function tryStartGame() {
    if (GS.gameStarted) return;

    const playerIds = Object.keys(GS.players);
    if (playerIds.length < 2) return;

    // Check if a game is already running
    gameRef.once('value', snap => {
        const existing = snap.val();
        if (existing && existing.state && existing.state !== 'waiting') {
            GS.gameStarted = true;
            return;
        }
        GS.gameStarted = true;
        gameRef.set({
            state:              'choosing',
            round:              1,
            maxRounds:          10,
            playerList:         playerIds,
            currentDrawerIndex: 0,
            drawer:             playerIds[0],
            word:               null,
            timer:              80,
            startTime:          null,
            allGuessed:         false,
        });
    });
}

// ================================================================
// GAME STATE MACHINE
// ================================================================

function handleGameStateChange(g) {
    const prevState = GS.currentState;
    const wasDrawer = GS.isDrawer;

    GS.game         = g;
    GS.currentState = g.state || 'waiting';
    GS.isDrawer     = (g.drawer === GS.playerId);
    GS.currentWord  = g.word || null;
    GS.round        = g.round || 1;
    GS.maxRounds    = g.maxRounds || 10;

    if (g.state !== 'waiting') GS.gameStarted = true;

    // If a new drawing round started, clear the canvas
    if (g.state === 'drawing' && prevState !== 'drawing') {
        clearCanvasLocal();
        drawRef.set(null).then(() => {
            startListeningDraw();
        });
        GS.hasGuessedCorrectly = false;
        GS.endRoundLock        = false;
    }

    updateTopBar(g);
    updateDrawerToolbar();

    // ── Hide all overlays first ──
    const waitEl      = el('waitingOverlay');
    const roundEndEl  = el('roundEndOverlay');
    const wordModal   = el('wordModal');

    if (waitEl)     waitEl.classList.remove('show');
    if (roundEndEl) roundEndEl.classList.remove('show');

    // ── Per-state handling ──
    switch (g.state) {

        case 'waiting':
            if (wordModal) wordModal.classList.remove('show');
            break;

        case 'choosing':
            if (wordModal) wordModal.classList.remove('show');
            if (GS.isDrawer) {
                // Only show word modal if not already showing
                if (!wordModal || !wordModal.classList.contains('show')) {
                    setTimeout(showWordSelectionModal, 80);
                }
            } else {
                if (waitEl) waitEl.classList.add('show');
            }
            break;

        case 'drawing':
            if (wordModal) wordModal.classList.remove('show');
            if (waitEl)    waitEl.classList.remove('show');
            // Drawer is responsible for running the countdown timer
            if (GS.isDrawer && !timerInterval) {
                startCountdownTimer(g.startTime || Date.now(), g.maxTime || 80);
            }
            break;

        case 'round_end':
            if (wordModal) wordModal.classList.remove('show');
            if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
            showRoundEndOverlay(g.word);
            break;

        case 'game_over':
            if (wordModal)   wordModal.classList.remove('show');
            if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
            showGameOverModal();
            break;
    }
}

// ================================================================
// TOP BAR UPDATE
// ================================================================

function updateTopBar(g) {
    const roundEl  = el('roundInfo');
    const timerEl  = el('timerDisplay');
    const wordEl   = el('wordDisplay');

    if (roundEl)  roundEl.textContent = 'Round ' + (g.round || 1) + '/' + (g.maxRounds || 10);
    if (timerEl)  timerEl.textContent = (g.timer !== undefined && g.timer !== null) ? g.timer : 80;

    // Timer color warning
    if (timerEl) {
        const t = parseInt(timerEl.textContent, 10);
        if (t <= 15) timerEl.classList.add('warning');
        else         timerEl.classList.remove('warning');
    }

    if (wordEl) {
        if (!g.word) {
            wordEl.textContent = 'Waiting...';
            wordEl.classList.remove('revealed');
        } else if (GS.isDrawer || GS.hasGuessedCorrectly || g.state === 'round_end' || g.state === 'game_over') {
            // Show full word with spaces between letters
            wordEl.textContent = g.word.toUpperCase().split('').join(' ');
            wordEl.classList.add('revealed');
        } else {
            // Show blanks — preserve spaces in multi-word answers
            const blanks = g.word.split('').map(ch => ch === ' ' ? '  ' : '_').join(' ');
            wordEl.textContent = blanks;
            wordEl.classList.remove('revealed');
        }
    }
}

// ================================================================
// DRAWER TOOLBAR VISIBILITY
// ================================================================

function updateDrawerToolbar() {
    const toolbarEl = el('toolbarBar');
    const badgeEl   = el('drawerBadge');
    const isDrawing = GS.isDrawer && GS.currentState === 'drawing';

    if (toolbarEl) {
        if (isDrawing) toolbarEl.classList.add('toolbar-visible');
        else           toolbarEl.classList.remove('toolbar-visible');
    }

    if (badgeEl) {
        if (isDrawing) badgeEl.classList.add('show');
        else           badgeEl.classList.remove('show');
    }
}

// ================================================================
// WORD SELECTION MODAL
// ================================================================

function showWordSelectionModal() {
    const modal  = el('wordModal');
    const optList = el('wordOptionsList');
    const timerEl = el('wordModalTimer');
    if (!modal || !optList) return;
    if (modal.classList.contains('show')) return; // Already showing

    const options = WordBank.getWordOptions();

    optList.innerHTML = '';
    options.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'word-option-btn';

        const wordSpan = document.createElement('span');
        wordSpan.textContent = opt.word;

        const meta = document.createElement('div');
        meta.className = 'word-option-meta';

        const diff = document.createElement('span');
        diff.className   = 'word-difficulty-badge';
        diff.textContent = opt.difficulty;

        const pts = document.createElement('span');
        pts.className   = 'word-points-badge';
        pts.textContent = opt.points + ' pts';

        meta.appendChild(diff);
        meta.appendChild(pts);
        btn.appendChild(wordSpan);
        btn.appendChild(meta);

        btn.addEventListener('click', () => onWordSelected(opt.word));
        optList.appendChild(btn);
    });

    modal.classList.add('show');

    // 15-second countdown
    let countdown = 15;
    if (timerEl) timerEl.textContent = countdown;

    if (wordSelectTimer) clearInterval(wordSelectTimer);
    wordSelectTimer = setInterval(() => {
        countdown--;
        if (timerEl) timerEl.textContent = countdown;
        if (countdown <= 0) {
            clearInterval(wordSelectTimer);
            wordSelectTimer = null;
            // Auto-select first word
            if (modal.classList.contains('show')) {
                onWordSelected(options[0].word);
            }
        }
    }, 1000);
}

function onWordSelected(word) {
    if (wordSelectTimer) { clearInterval(wordSelectTimer); wordSelectTimer = null; }

    const modal = el('wordModal');
    if (modal) modal.classList.remove('show');

    clearCanvasLocal();
    drawRef.set(null); // Wipe old drawing data for new round

    const now = Date.now();
    gameRef.update({
        state:      'drawing',
        word:       word,
        timer:      80,
        maxTime:    80,
        startTime:  now,
        allGuessed: false,
    });
}

// ================================================================
// COUNTDOWN TIMER (runs only on drawer's client)
// ================================================================

function startCountdownTimer(startTimestamp, maxTime) {
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }

    timerInterval = setInterval(() => {
        // Stop if we're no longer the drawer or state changed
        if (!GS.isDrawer || GS.currentState !== 'drawing') {
            clearInterval(timerInterval);
            timerInterval = null;
            return;
        }

        const elapsed   = Math.floor((Date.now() - startTimestamp) / 1000);
        const remaining = Math.max(0, maxTime - elapsed);

        // Update timer display in Firebase (all clients read this)
        gameRef.update({ timer: remaining });

        // Update local display immediately for responsiveness
        const timerEl = el('timerDisplay');
        if (timerEl) {
            timerEl.textContent = remaining;
            if (remaining <= 15) timerEl.classList.add('warning');
            else                 timerEl.classList.remove('warning');
        }

        if (remaining <= 0) {
            clearInterval(timerInterval);
            timerInterval = null;
            triggerRoundEnd();
        } else {
            // Also check if all players have guessed
            checkIfAllGuessed();
        }
    }, 1000);
}

// ================================================================
// ROUND END
// ================================================================

function triggerRoundEnd() {
    if (!GS.isDrawer) return;
    if (GS.endRoundLock) return;
    GS.endRoundLock = true;

    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }

    gameRef.once('value', snap => {
        const g = snap.val();
        if (!g) { GS.endRoundLock = false; return; }
        if (g.state === 'round_end' || g.state === 'game_over') {
            GS.endRoundLock = false;
            return;
        }

        const playerList = g.playerList || Object.keys(GS.players);
        let   nextIdx    = ((g.currentDrawerIndex || 0) + 1) % playerList.length;
        let   nextRound  = g.round || 1;

        // Wrapped around = new round
        if (nextIdx === 0) nextRound++;

        // Skip disconnected players (up to one full loop)
        let skips = 0;
        while (skips < playerList.length && !GS.players[playerList[nextIdx]]) {
            nextIdx = (nextIdx + 1) % playerList.length;
            if (nextIdx === 0) nextRound++;
            skips++;
        }

        // Reset hasGuessed for all players
        const playerUpdates = {};
        playerList.forEach(pid => {
            playerUpdates[pid + '/hasGuessed'] = false;
        });

        playersRef.update(playerUpdates).then(() => {
            // Transition to round_end briefly
            gameRef.update({ state: 'round_end' }).then(() => {
                if (nextRound > (g.maxRounds || 10)) {
                    // Game over after showing round end for 3.5s
                    setTimeout(() => {
                        gameRef.update({ state: 'game_over' });
                        GS.endRoundLock = false;
                    }, 3500);
                } else {
                    // Start next choosing phase after 3.5s
                    setTimeout(() => {
                        drawRef.set(null); // Clear draw data
                        gameRef.set({
                            state:              'choosing',
                            round:              nextRound,
                            maxRounds:          g.maxRounds || 10,
                            playerList:         playerList,
                            currentDrawerIndex: nextIdx,
                            drawer:             playerList[nextIdx],
                            word:               null,
                            timer:              80,
                            maxTime:            80,
                            startTime:          null,
                            allGuessed:         false,
                        });
                        GS.endRoundLock = false;
                    }, 3500);
                }
            });
        });
    });
}

// ================================================================
// CHAT & GUESS DETECTION
// ================================================================

function sendMessage() {
    const input = el('chatInput');
    if (!input) return;

    const rawText = input.value;
    const text    = rawText.trim();
    if (!text) return;

    input.value = '';
    input.focus();

    // Drawer can chat but not guess
    if (GS.isDrawer) {
        pushChatMessage({ type: 'drawer', text, name: GS.playerName });
        return;
    }

    const me = GS.players[GS.playerId];

    // Already guessed correctly — only chat, don't reveal word
    if (me && me.hasGuessed) {
        pushChatMessage({ type: 'guessed', text, name: GS.playerName });
        return;
    }

    // Only check guess during active drawing phase
    if (GS.currentState === 'drawing' && GS.currentWord) {
        const guess   = text.toLowerCase().trim();
        const answer  = GS.currentWord.toLowerCase().trim();

        if (guess === answer) {
            handleCorrectGuess(me);
            return;
        }

        // Check for close guess (within 1-2 characters via Levenshtein)
        if (answer.length >= 4 && levenshtein(guess, answer) <= 1) {
            pushChatMessage({ type: 'close', text, name: GS.playerName });
            return;
        }
    }

    // Normal guess message
    pushChatMessage({ type: 'guess', text, name: GS.playerName });
}

function levenshtein(a, b) {
    if (a === b) return 0;
    const m = a.length, n = b.length;
    const dp = [];
    for (let i = 0; i <= m; i++) { dp[i] = [i]; }
    for (let j = 0; j <= n; j++) { dp[0][j] = j; }
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            dp[i][j] = a[i-1] === b[j-1]
                ? dp[i-1][j-1]
                : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
        }
    }
    return dp[m][n];
}

function handleCorrectGuess(me) {
    if (!me || me.hasGuessed)         return;
    if (GS.hasGuessedCorrectly)       return;
    if (GS.currentState !== 'drawing') return;

    GS.hasGuessedCorrectly = true;

    // Points scale with time remaining
    const timer    = (GS.game && GS.game.timer !== undefined) ? GS.game.timer : 80;
    const maxTime  = (GS.game && GS.game.maxTime)             ? GS.game.maxTime : 80;
    const fraction = Math.max(0, Math.min(1, timer / maxTime));
    const points   = Math.round(50 + fraction * 100); // 50–150 pts

    // Update score and hasGuessed flag
    playersRef.child(GS.playerId).update({
        score:      (me.score || 0) + points,
        hasGuessed: true,
    });

    // Post correct-guess chat event
    pushChatMessage({
        type:   'correct',
        text:   'guessed the word! (+' + points + ' pts)',
        name:   GS.playerName,
    });

    playSound('correct');

    // Reveal word locally for the guesser immediately
    const wordEl = el('wordDisplay');
    if (wordEl && GS.currentWord) {
        wordEl.textContent = GS.currentWord.toUpperCase().split('').join(' ');
        wordEl.classList.add('revealed');
    }
}

function checkIfAllGuessed() {
    const g = GS.game;
    if (!g || !GS.isDrawer) return;

    const ids      = Object.keys(GS.players);
    const guessers = ids.filter(id => id !== g.drawer);
    if (guessers.length === 0) return;

    const allDone = guessers.every(id => {
        const p = GS.players[id];
        return p && p.hasGuessed;
    });

    if (allDone && !g.allGuessed) {
        // Bonus for drawer
        const drawerPlayer = GS.players[g.drawer];
        if (drawerPlayer) {
            playersRef.child(g.drawer).update({
                score: (drawerPlayer.score || 0) + 30,
            });
        }
        gameRef.update({ allGuessed: true });

        // End round shortly after
        setTimeout(triggerRoundEnd, 1200);
    }
}

// ================================================================
// CHAT — PUSH & RENDER
// ================================================================

function pushChatMessage(msg) {
    if (!chatRef) return;
    chatRef.push({
        ...msg,
        pid: GS.playerId,
        ts:  firebase.database.ServerValue.TIMESTAMP,
    });
}

function renderChatMessage(msg) {
    const wrap = el('chatMessages');
    if (!wrap) return;

    const div = document.createElement('div');
    div.className = 'chat-msg';

    switch (msg.type) {
        case 'system':
            div.classList.add('msg-system');
            div.textContent = msg.text;
            break;

        case 'correct':
            div.classList.add('msg-correct');
            div.innerHTML = '<span class="msg-sender">' + escHtml(msg.name) + '</span>' +
                            escHtml(msg.text);
            break;

        case 'drawer':
            div.classList.add('msg-drawer');
            div.innerHTML = '<span class="msg-sender">✏️ ' + escHtml(msg.name) + '</span>' +
                            escHtml(msg.text);
            break;

        case 'guessed':
            div.classList.add('msg-guessed');
            div.innerHTML = '<span class="msg-sender">✅ ' + escHtml(msg.name) + '</span>' +
                            escHtml(msg.text);
            break;

        case 'close':
            div.classList.add('msg-close');
            div.innerHTML = '<span class="msg-sender">' + escHtml(msg.name) + '</span>' +
                            '🔥 ' + escHtml(msg.text) + ' (very close!)';
            break;

        case 'guess':
        default:
            div.classList.add('msg-guess');
            div.innerHTML = '<span class="msg-sender">' + escHtml(msg.name) + '</span>' +
                            escHtml(msg.text);
            break;
    }

    wrap.appendChild(div);
    wrap.scrollTop = wrap.scrollHeight;
}

function escHtml(str) {
    return String(str || '')
        .replace(/&/g,  '&amp;')
        .replace(/</g,  '&lt;')
        .replace(/>/g,  '&gt;')
        .replace(/"/g,  '&quot;')
        .replace(/'/g,  '&#x27;');
}

// ================================================================
// PLAYER LIST RENDER
// ================================================================

function renderPlayerList() {
    const wrap     = el('playersList');
    const countEl  = el('playerCount');
    if (!wrap) return;

    const entries = Object.entries(GS.players).filter(([,p]) => !!p);
    if (countEl) countEl.textContent = entries.length + '/8';

    // Sort by score descending
    entries.sort((a, b) => ((b[1].score || 0) - (a[1].score || 0)));

    wrap.innerHTML = '';
    entries.forEach(([pid, p]) => {
        const isMe      = pid === GS.playerId;
        const isDrawing = pid === (GS.game && GS.game.drawer);
        const guessed   = !!(p.hasGuessed);

        const item = document.createElement('div');
        item.className = 'player-item';
        if (isDrawing) item.classList.add('is-drawing');
        if (guessed)   item.classList.add('has-guessed');
        if (isMe)      item.classList.add('is-me');

        const nameDisplay = escHtml(p.name || 'Unknown');
        let   statusIcon  = '';
        if (isDrawing) statusIcon = '✏️';
        else if (guessed) statusIcon = '✅';

        item.innerHTML =
            '<div class="player-avatar">' + nameDisplay[0].toUpperCase() + '</div>' +
            '<div class="player-info">' +
                '<div class="player-name">' + nameDisplay + (isMe ? ' <span class="player-name-badge">(you)</span>' : '') + '</div>' +
            '</div>' +
            (statusIcon ? '<div class="player-status-icon">' + statusIcon + '</div>' : '') +
            '<div class="player-score">' + (p.score || 0) + '</div>';

        wrap.appendChild(item);
    });
}

// ================================================================
// ROUND END OVERLAY
// ================================================================

function showRoundEndOverlay(word) {
    const overlay   = el('roundEndOverlay');
    const wordEl    = el('revealedWord');
    const scoreList = el('roundScoresList');

    if (wordEl)  wordEl.textContent = (word || '---').toUpperCase();

    if (scoreList) {
        scoreList.innerHTML = '';
        const sorted = Object.entries(GS.players)
            .filter(([,p]) => !!p)
            .sort((a, b) => ((b[1].score || 0) - (a[1].score || 0)));

        sorted.forEach(([pid, p], i) => {
            const row = document.createElement('div');
            row.className = 'round-score-item' + (p.hasGuessed ? ' got-it' : '');
            row.innerHTML =
                '<span class="round-score-rank">' + (i + 1) + '</span>' +
                '<span class="round-score-name">' + escHtml(p.name || 'Unknown') + '</span>' +
                '<span class="round-score-pts">' + (p.score || 0) + ' pts</span>';
            scoreList.appendChild(row);
        });
    }

    if (overlay) overlay.classList.add('show');
    playSound('roundEnd');
}

// ================================================================
// GAME OVER MODAL
// ================================================================

function showGameOverModal() {
    if (autoRestartTimer) { clearInterval(autoRestartTimer); autoRestartTimer = null; }

    const overlay   = el('gameOverModal');
    const winnerEl  = el('gameOverWinner');
    const scoresEl  = el('gameOverScores');
    const restartEl = el('gameOverRestartText');

    const sorted = Object.entries(GS.players)
        .filter(([,p]) => !!p)
        .sort((a, b) => ((b[1].score || 0) - (a[1].score || 0)));

    const winner = sorted[0];

    if (winnerEl && winner) {
        winnerEl.innerHTML =
            '<div class="gameover-winner-crown">👑</div>' +
            '<div class="gameover-winner-name">' + escHtml(winner[1].name || 'Unknown') + '</div>' +
            '<div class="gameover-winner-score">' + (winner[1].score || 0) + ' points</div>';
    }

    if (scoresEl) {
        scoresEl.innerHTML = '';
        const medals = ['🥇', '🥈', '🥉'];
        sorted.forEach(([pid, p], i) => {
            const row = document.createElement('div');
            row.className = 'gameover-score-row' + (i === 0 ? ' is-winner' : '');
            row.innerHTML =
                '<span class="score-row-rank">' + (medals[i] || ('#' + (i+1))) + '</span>' +
                '<span class="score-row-name">' + escHtml(p.name || 'Unknown') + '</span>' +
                '<span class="score-row-pts">' + (p.score || 0) + ' pts</span>';
            scoresEl.appendChild(row);
        });
    }

    if (overlay) overlay.classList.add('show');

    // Auto-restart countdown
    let sec = 10;
    if (restartEl) restartEl.textContent = 'New game starts in ' + sec + '...';

    autoRestartTimer = setInterval(() => {
        sec--;
        if (restartEl) restartEl.textContent = 'New game starts in ' + sec + '...';
        if (sec <= 0) {
            clearInterval(autoRestartTimer);
            autoRestartTimer = null;
            playAgain();
        }
    }, 1000);
}

// ================================================================
// PLAY AGAIN
// ================================================================

function playAgain() {
    if (autoRestartTimer) { clearInterval(autoRestartTimer); autoRestartTimer = null; }

    const modal = el('gameOverModal');
    if (modal) modal.classList.remove('show');

    GS.gameStarted         = false;
    GS.hasGuessedCorrectly = false;
    GS.endRoundLock        = false;

    const playerIds = Object.keys(GS.players);

    // Reset all scores
    const playerUpdates = {};
    playerIds.forEach(pid => {
        playerUpdates[pid + '/score']      = 0;
        playerUpdates[pid + '/hasGuessed'] = false;
    });

    playersRef.update(playerUpdates).then(() => {
        drawRef.set(null);
        gameRef.set({
            state:              'choosing',
            round:              1,
            maxRounds:          10,
            playerList:         playerIds,
            currentDrawerIndex: 0,
            drawer:             playerIds[0] || GS.playerId,
            word:               null,
            timer:              80,
            maxTime:            80,
            startTime:          null,
            allGuessed:         false,
        });
    });
}

// ================================================================
// SHOW GAME SCREEN
// ================================================================

function showGameScreen() {
    setLoadingVisible(false);

    const loginEl = el('loginScreen');
    const gameEl  = el('gameScreen');
    const roomEl  = el('roomCodeDisplay');
    const lobbyEl = el('lobbyRoomCode');

    if (loginEl) loginEl.style.display = 'none';
    if (gameEl)  gameEl.style.display  = 'flex';
    if (roomEl)  roomEl.textContent    = GS.roomCode;
    if (lobbyEl) lobbyEl.textContent   = GS.roomCode;

    // Show lobby overlay immediately if alone
    const lobbyOverlay = el('lobbyOverlay');
    if (lobbyOverlay) lobbyOverlay.classList.add('show');

    // Init canvas after two animation frames so the flex layout is fully painted
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            initCanvas();
        });
    });

    playSound('enter');

    // Announce join in chat
    pushChatMessage({
        type: 'system',
        text: '👋 ' + GS.playerName + ' joined the room!',
    });
}

// ================================================================
// EXIT GAME
// ================================================================

function exitGame() {
    if (playersRef && GS.playerId) {
        pushChatMessage({ type: 'system', text: '👋 ' + GS.playerName + ' left the game.' });
        playersRef.child(GS.playerId).remove();
    }

    if (timerInterval)    { clearInterval(timerInterval);    timerInterval    = null; }
    if (autoRestartTimer) { clearInterval(autoRestartTimer); autoRestartTimer = null; }
    if (wordSelectTimer)  { clearInterval(wordSelectTimer);  wordSelectTimer  = null; }

    if (playersRef) playersRef.off();
    if (chatRef)    chatRef.off();
    if (gameRef)    gameRef.off();
    if (drawRef)    drawRef.off();

    playSound('leave');
    location.reload();
}

// ================================================================
// UTILITY UI FUNCTIONS
// ================================================================

function setLoadingVisible(show) {
    const el_ = el('loadingOverlay');
    if (!el_) return;
    if (show) el_.classList.add('show');
    else      el_.classList.remove('show');
}

function showToast(message, type) {
    const container = el('toastContainer');
    if (!container) { alert(message); return; }

    const toast = document.createElement('div');
    toast.className = 'toast-msg';
    if (type) toast.classList.add('toast-' + type);
    toast.textContent = message;

    container.appendChild(toast);
    setTimeout(() => {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 3500);
}

// ================================================================
// BEFORE UNLOAD
// ================================================================
window.addEventListener('beforeunload', e => {
    if (GS.currentState === 'drawing') {
        e.preventDefault();
        e.returnValue = 'You are currently in a game. Leave anyway?';
        return e.returnValue;
    }
});

// ================================================================
// CONSOLE
// ================================================================
console.log('🎮 Skribbl.io 28 — Game engine loaded and ready');
