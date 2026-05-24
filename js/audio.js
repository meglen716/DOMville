



const sounds = {
    fire: new Audio('sfx/fire_start.mp3'),
    tornado: new Audio('sfx/tornado_loop.mp3'),
    earthquake: new Audio('sfx/earthquake_rumble.mp3'),
    riot: new Audio('sfx/riot_ambiance.mp3'),
    upgrade: new Audio('sfx/upgrade_ding.mp3'),
    emergency: new Audio('sfx/siren.mp3')
};


sounds.tornado.loop = true;
sounds.riot.loop = true;

window.gameIsMuted = false; 
let audioUnlocked = false;

function playSFX(name, volume = 0.5) {
    if (window.gameIsMuted) return; 

    const sfx = sounds[name];
    if (sfx) {
        sfx.volume = volume;
        sfx.currentTime = 0; 
        
        
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


function unlockAudioAndStart() {
    if (!audioUnlocked) {
        
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

    
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
        loadingScreen.style.opacity = '0';
        setTimeout(() => {
            loadingScreen.style.visibility = 'hidden';
        }, 800); 
    }
}


document.addEventListener('DOMContentLoaded', () => {
    const startBtn = document.getElementById('start-game-btn');
    if (startBtn) {
        startBtn.addEventListener('click', unlockAudioAndStart);
    }
    
    
    const soundToggle = document.getElementById('mute-toggle');
    if (soundToggle) {
        setTimeout(() => { soundToggle.checked = !window.gameIsMuted; }, 150);
        soundToggle.addEventListener('change', (e) => {
            window.gameIsMuted = !e.target.checked; 
            if (window.gameIsMuted) { stopSFX('tornado'); stopSFX('riot'); }
        });
    }
});


window.addEventListener('mousedown', unlockAudio);
window.addEventListener('keydown', unlockAudio);


window.addEventListener('DOMContentLoaded', () => {
    const soundToggle = document.getElementById('mute-toggle');
    
    if (soundToggle) {
        
        setTimeout(() => {
            
            soundToggle.checked = !window.gameIsMuted; 
        }, 150);

        soundToggle.addEventListener('change', (e) => {
            
            window.gameIsMuted = !e.target.checked; 
            
            
            if (window.gameIsMuted) {
                stopSFX('tornado');
                stopSFX('riot');
            }
        });
    }
});

window.unlockAudio = unlockAudioAndStart;