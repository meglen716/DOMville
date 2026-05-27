// weather.js

let weatherState = 'clear'; // 'clear', 'rain', 'storm'
let weatherTimer = 3000;    // Frames until next weather shift
const raindrops = [];
let lightningFlash = 0;

// Initializes the raindrop array
function initRain(width, height) {
    if (raindrops.length > 0) return;
    for(let i = 0; i < 400; i++) {
        raindrops.push({
            x: Math.random() * width * 1.5, // 1.5x width to account for wind pushing drops left
            y: Math.random() * height,
            length: Math.random() * 15 + 10,
            speed: Math.random() * 10 + 15
        });
    }
}

// Global traffic speed modifier
function getWeatherTrafficModifier() {
    if (weatherState === 'storm') return 0.5; // 50% speed
    if (weatherState === 'rain') return 0.75; // 75% speed
    return 1.0;
}

// Returns the current state for the UI
function getWeatherState() {
    return weatherState;
}

function updateAndDrawWeather(ctx, width, height, entities, gridSize) {
    initRain(width, height);

    // 1. State Machine (Weather Transitions)
    weatherTimer--;
    if (weatherTimer <= 0) {
        if (weatherState === 'clear') {
            // 30% chance to rain, otherwise stays clear
            weatherState = Math.random() > 0.7 ? 'rain' : 'clear';
            weatherTimer = 2000 + Math.random() * 2000;
        } else if (weatherState === 'rain') {
            // 40% chance to escalate to a storm, 60% to clear up
            weatherState = Math.random() > 0.6 ? 'storm' : 'clear';
            weatherTimer = 1500 + Math.random() * 1000;
        } else if (weatherState === 'storm') {
            // Storms always calm down into normal rain
            weatherState = 'rain';
            weatherTimer = 1000 + Math.random() * 1000;
        }
    }

    // 2. Weather Mechanics & Visuals
    if (weatherState !== 'clear') {
        
        // Mechanic: Rain slowly extinguishes existing fires
        if (Math.random() < 0.05) { // 5% chance per frame
            const burningBuildings = entities.filter(e => e.fireLevel > 0 && !e.isBurned);
            if (burningBuildings.length > 0) {
                const target = burningBuildings[Math.floor(Math.random() * burningBuildings.length)];
                target.fireLevel -= 0.1;
                if (target.fireLevel < 0) target.fireLevel = 0;
            }
        }

        // Draw Global Tint (Darker for storms)
        ctx.fillStyle = weatherState === 'storm' ? 'rgba(20, 30, 50, 0.4)' : 'rgba(50, 60, 80, 0.2)';
        ctx.fillRect(0, 0, width, height);

        // Draw Raindrops
        ctx.save();
        ctx.strokeStyle = weatherState === 'storm' ? 'rgba(200, 210, 230, 0.6)' : 'rgba(174, 194, 224, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        
        const wind = weatherState === 'storm' ? 8 : 3; // Storms have high wind
        
        for (let drop of raindrops) {
            drop.y += drop.speed;
            drop.x -= wind;
            
            // Loop drops back to the top right when they fall off screen
            if (drop.y > height || drop.x < 0) {
                drop.y = -20;
                drop.x = Math.random() * width * 1.5;
            }

            // Draw fewer drops for light rain, all drops for storm
            if (weatherState === 'storm' || Math.random() > 0.3) {
                ctx.moveTo(drop.x, drop.y);
                ctx.lineTo(drop.x - wind, drop.y + drop.length);
            }
        }
        ctx.stroke();
        ctx.restore();

        // Mechanic: Storm Lightning
        if (weatherState === 'storm' && Math.random() < 0.003) { // 0.3% chance per frame
            lightningFlash = 1.0;
            
            // Strike a random building and start a fire!
            const zonable = entities.filter(e => ['house', 'office', 'supermarket', 'school'].includes(e.type) && !e.isBurned);
            if (zonable.length > 0) {
                const target = zonable[Math.floor(Math.random() * zonable.length)];
                target.fireLevel = 1; // Ignite!
                target.fireTimer = 0;
            }
        }
    }

    // 3. Draw Lightning Flash (Fades out over time)
    if (lightningFlash > 0) {
        ctx.fillStyle = `rgba(255, 255, 255, ${lightningFlash})`;
        ctx.fillRect(0, 0, width, height);
        lightningFlash -= 0.05; // Fade speed
    }
}