

let weatherState = 'clear'; 
let weatherTimer = 3000;    
const raindrops = [];
let lightningFlash = 0;


function initRain(width, height) {
    if (raindrops.length > 0) return;
    for(let i = 0; i < 400; i++) {
        raindrops.push({
            x: Math.random() * width * 1.5, 
            y: Math.random() * height,
            length: Math.random() * 15 + 10,
            speed: Math.random() * 10 + 15
        });
    }
}


function getWeatherTrafficModifier() {
    if (weatherState === 'storm') return 0.5; 
    if (weatherState === 'rain') return 0.75; 
    return 1.0;
}


function getWeatherState() {
    return weatherState;
}

function updateAndDrawWeather(ctx, width, height, entities, gridSize) {
    initRain(width, height);

    
    weatherTimer--;
    if (weatherTimer <= 0) {
        if (weatherState === 'clear') {
            
            weatherState = Math.random() > 0.7 ? 'rain' : 'clear';
            weatherTimer = 2000 + Math.random() * 2000;
        } else if (weatherState === 'rain') {
            
            weatherState = Math.random() > 0.6 ? 'storm' : 'clear';
            weatherTimer = 1500 + Math.random() * 1000;
        } else if (weatherState === 'storm') {
            
            weatherState = 'rain';
            weatherTimer = 1000 + Math.random() * 1000;
        }
    }

    
    if (weatherState !== 'clear') {
        
        
        if (Math.random() < 0.05) { 
            const burningBuildings = entities.filter(e => e.fireLevel > 0 && !e.isBurned);
            if (burningBuildings.length > 0) {
                const target = burningBuildings[Math.floor(Math.random() * burningBuildings.length)];
                target.fireLevel -= 0.1;
                if (target.fireLevel < 0) target.fireLevel = 0;
            }
        }

        
        ctx.fillStyle = weatherState === 'storm' ? 'rgba(20, 30, 50, 0.4)' : 'rgba(50, 60, 80, 0.2)';
        ctx.fillRect(0, 0, width, height);

        
        ctx.save();
        ctx.strokeStyle = weatherState === 'storm' ? 'rgba(200, 210, 230, 0.6)' : 'rgba(174, 194, 224, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        
        const wind = weatherState === 'storm' ? 8 : 3; 
        
        for (let drop of raindrops) {
            drop.y += drop.speed;
            drop.x -= wind;
            
            
            if (drop.y > height || drop.x < 0) {
                drop.y = -20;
                drop.x = Math.random() * width * 1.5;
            }

            
            if (weatherState === 'storm' || Math.random() > 0.3) {
                ctx.moveTo(drop.x, drop.y);
                ctx.lineTo(drop.x - wind, drop.y + drop.length);
            }
        }
        ctx.stroke();
        ctx.restore();

        
        if (weatherState === 'storm' && Math.random() < 0.003) { 
            lightningFlash = 1.0;
            
            
            const zonable = entities.filter(e => ['house', 'office', 'supermarket', 'school'].includes(e.type) && !e.isBurned);
            if (zonable.length > 0) {
                const target = zonable[Math.floor(Math.random() * zonable.length)];
                target.fireLevel = 1; 
                target.fireTimer = 0;
            }
        }
    }

    
    if (lightningFlash > 0) {
        ctx.fillStyle = `rgba(255, 255, 255, ${lightningFlash})`;
        ctx.fillRect(0, 0, width, height);
        lightningFlash -= 0.05; 
    }
}