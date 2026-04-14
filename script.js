const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const sampleCache = {};

// Key mapping for computer keyboard
const keyMap = {
    'a': 'C4', 'w': 'C#4', 's': 'D4', 'e': 'D#4', 'd': 'E4', 
    'f': 'F4', 't': 'F#4', 'g': 'G4', 'y': 'G#4', 'h': 'A4', 
    'u': 'A#4', 'j': 'B4'
};

// Start Audio on Button Click
document.getElementById('start-btn').addEventListener('click', () => {
    audioCtx.resume();
    document.getElementById('welcome-screen').style.display = 'none';
});

// Load your WAV files
async function loadSamples() {
    const notes = ['A4', 'B4', 'C4', 'D4', 'E4', 'F4', 'G4'];
    for (let note of notes) {
        try {
            const response = await fetch(`audio/${note}.wav`);
            const arrayBuffer = await response.arrayBuffer();
            sampleCache[note] = await audioCtx.decodeAudioData(arrayBuffer);
        } catch (e) {
            console.error(`Failed to load ${note}`, e);
        }
    }
}

function playNote(noteName) {
    let source = audioCtx.createBufferSource();
    let playbackRate = 1;

    // Pitch-shifting logic for Sharps
    if (noteName.includes('#')) {
        let rootNote = noteName.replace('#', ''); 
        source.buffer = sampleCache[rootNote];
        playbackRate = Math.pow(2, 1/12); // Shift up by one semitone
    } else {
        source.buffer = sampleCache[noteName];
    }

    if (!source.buffer) return;

    const gainNode = audioCtx.createGain();
    source.playbackRate.value = playbackRate;
    
    // Smooth envelope to prevent clicking
    gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.6, audioCtx.currentTime + 0.1);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 1.5);

    source.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    source.start();
    source.stop(audioCtx.currentTime + 1.6);
}

// Event Listeners for UI
document.querySelectorAll('.key').forEach(key => {
    key.addEventListener('mousedown', () => {
        const note = key.dataset.note;
        playNote(note);
        key.classList.add('active');
    });
    key.addEventListener('mouseup', () => key.classList.remove('active'));
    key.addEventListener('mouseleave', () => key.classList.remove('active'));
});

// Event Listeners for Computer Keyboard
window.addEventListener('keydown', (e) => {
    const note = keyMap[e.key.toLowerCase()];
    if (note) {
        playNote(note);
        const el = document.querySelector(`[data-note="${note}"]`);
        if (el) el.classList.add('active');
    }
});

window.addEventListener('keyup', (e) => {
    const note = keyMap[e.key.toLowerCase()];
    const el = document.querySelector(`[data-note="${note}"]`);
    if (el) el.classList.remove('active');
});

loadSamples();
