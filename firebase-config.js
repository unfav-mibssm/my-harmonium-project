// ================================================================
// FIREBASE CONFIGURATION — Skribbl.io 28
// Using Firebase Compat SDK v10 (matches HTML script tags)
// ================================================================

const firebaseConfig = {
    apiKey:            "AIzaSyAY7hSDaaBh71z3k2PXj3s93uxk3AF3Mvs",
    authDomain:        "mini-skribbl.firebaseapp.com",
    databaseURL:       "https://mini-skribbl-default-rtdb.firebaseio.com",
    projectId:         "mini-skribbl",
    storageBucket:     "mini-skribbl.firebasestorage.app",
    messagingSenderId: "423970942237",
    appId:             "1:423970942237:web:ac3853dab889c0fe3305f4",
};

// Initialize Firebase app
firebase.initializeApp(firebaseConfig);

// Global Realtime Database reference used throughout game.js
const database = firebase.database();

// Enable offline persistence so brief disconnects don't break the game
firebase.database().ref('.info/connected').on('value', snap => {
    if (snap.val() === true) {
        console.log('🔥 Firebase: connected');
    } else {
        console.warn('⚠️ Firebase: disconnected — reconnecting...');
    }
});

console.log('🔥 Firebase initialized successfully');
