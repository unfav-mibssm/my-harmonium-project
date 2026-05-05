// firebase-config.js — Firebase configuration for Skribbl.io 28

const firebaseConfig = {
    apiKey:            "AIzaSyAY7hSDaaBh71z3k2PXj3s93uxk3AF3Mvs",
    authDomain:        "mini-skribbl.firebaseapp.com",
    databaseURL:       "https://mini-skribbl-default-rtdb.firebaseio.com",
    projectId:         "mini-skribbl",
    storageBucket:     "mini-skribbl.firebasestorage.app",
    messagingSenderId: "423970942237",
    appId:             "1:423970942237:web:ac3853dab889c0fe3305f4",
};

firebase.initializeApp(firebaseConfig);
const database = firebase.database();

console.log('🔥 Firebase connected');
