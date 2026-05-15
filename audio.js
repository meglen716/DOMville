// ==========================================
// AUDIO ENGINE MODULE
// ==========================================

const sounds = {
    fire: new Audio('sfx/fire_start.mp3'),
    tornado: new Audio('sfx/tornado_loop.mp3'),
    earthquake: new Audio('sfx/earthquake_rumble.mp3'),
    riot: new Audio('sfx/riot_ambiance.mp3'),
    upgrade: new Audio('sfx/upgrade_ding.mp3'),
    emergency: new Audio('sfx/siren.mp3')
};

// Configure loops for long-duration events
sounds.tornado.loop = true;
sounds.riot.loop = true;

window.gameIsMuted = false; 
let audioUnlocked = false;

function playSFX(name, volume = 0.5) {
    if (window.gameIsMuted) return; // Prevent playing if muted

    const sfx = sounds[name];
    if (sfx) {
        sfx.volume = volume;
        sfx.currentTime = 0; 
        
        // Browsers require checking the promise to prevent console errors
        let playPromise = sfx.play();
        if (playPromise !== undefined) {
            playPromise.catch(error => {
                console.log("Audio play blocked by browser. Awaiting user click.");
            });
        }
    }
}

function stopSFX(name) {
    const sfx = sounds[name];
    if (sfx) {
        sfx.pause();
        sfx.currentTime = 0;
    }
}

// --- DOMVILLE LOADING SCREEN & AUDIO UNLOCK ---
function unlockAudioAndStart() {
    if (!audioUnlocked) {
        // Silently touch all audio files to appease the browser gods
        for (let key in sounds) {
            let sfx = sounds[key];
            sfx.volume = 0; 
            let p = sfx.play();
            if (p !== undefined) {
                p.then(() => {
                    sfx.pause(); sfx.currentTime = 0; sfx.volume = 1;
                }).catch(() => {});
            }
        }
        audioUnlocked = true;
        console.log("Audio Engine successfully unlocked.");
    }

    // Fade out the DOMville Loading Screen
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
        loadingScreen.style.opacity = '0';
        setTimeout(() => {
            loadingScreen.style.visibility = 'hidden';
        }, 800); // Waits for the CSS fade transition to finish
    }
}

// Bind the start button to the unlock sequence
document.addEventListener('DOMContentLoaded', () => {
    const startBtn = document.getElementById('start-game-btn');
    if (startBtn) {
        startBtn.addEventListener('click', unlockAudioAndStart);
    }
    
    // Setup Toggle Switch functionality
    const soundToggle = document.getElementById('mute-toggle');
    if (soundToggle) {
        setTimeout(() => { soundToggle.checked = !window.gameIsMuted; }, 150);
        soundToggle.addEventListener('change', (e) => {
            window.gameIsMuted = !e.target.checked; 
            if (window.gameIsMuted) { stopSFX('tornado'); stopSFX('riot'); }
        });
    }
});

// Listen for the very first interaction with the game
window.addEventListener('mousedown', unlockAudio);
window.addEventListener('keydown', unlockAudio);

// Setup Toggle Switch functionality
window.addEventListener('DOMContentLoaded', () => {
    const soundToggle = document.getElementById('mute-toggle');
    
    if (soundToggle) {
        // Delay slightly to ensure game.js has loaded the save file
        setTimeout(() => {
            // Checkbox checked = Sound ON. Unchecked = Sound OFF (Muted)
            soundToggle.checked = !window.gameIsMuted; 
        }, 150);

        soundToggle.addEventListener('change', (e) => {
            // e.target.checked is true when the switch is flipped ON
            window.gameIsMuted = !e.target.checked; 
            
            // Immediately stop any active looping sounds if we just muted
            if (window.gameIsMuted) {
                stopSFX('tornado');
                stopSFX('riot');
            }
        });
    }
});