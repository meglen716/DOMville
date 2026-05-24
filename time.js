


let gameClock = 8.0; 
let gameDay = 0;     
const TIME_SPEED = 0.005; 

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

function updateTime() {
    gameClock += TIME_SPEED;
    if (gameClock >= 24.0) {
        gameClock = 0;
        gameDay++;
        if (gameDay > 6) gameDay = 0;
    }
}

function isNightTime() {
    return gameClock < 6 || gameClock >= 18;
}

function isWeekend() {
    return gameDay === 5 || gameDay === 6; 
}

function getDayName() {
    return DAYS[gameDay];
}


function drawNightOverlay(ctx, mapWidth, mapHeight) {
    let opacity = 0;
    
    
    if (gameClock >= 18 && gameClock < 20) {
        opacity = (gameClock - 18) / 2 * 0.7; 
    } else if (gameClock >= 20 || gameClock < 5) {
        opacity = 0.7; 
    } else if (gameClock >= 5 && gameClock < 7) {
        opacity = 0.7 - ((gameClock - 5) / 2 * 0.7); 
    }

    if (opacity > 0) {
        ctx.fillStyle = `rgba(10, 15, 30, ${opacity})`;
        
        ctx.fillRect(0, 0, mapWidth, mapHeight);
    }
}