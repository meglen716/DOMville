// ==========================================
// TIME & DAY CYCLE SYSTEM
// ==========================================
let gameClock = 8.0; // Starts at 8:00 AM
let gameDay = 0;     // 0 = Monday, 6 = Sunday
const TIME_SPEED = 0.005; // Clock speed (Adjust this to make days longer/shorter)

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
    return gameDay === 5 || gameDay === 6; // 5 is Saturday, 6 is Sunday
}

function getDayName() {
    return DAYS[gameDay];
}

// Draws the dynamic lighting over the map
function drawNightOverlay(ctx, mapWidth, mapHeight) {
    let opacity = 0;
    
    // Smooth transitions for dawn and dusk
    if (gameClock >= 18 && gameClock < 20) {
        opacity = (gameClock - 18) / 2 * 0.7; // Dusk fading in (6 PM to 8 PM)
    } else if (gameClock >= 20 || gameClock < 5) {
        opacity = 0.7; // Deep night (8 PM to 5 AM)
    } else if (gameClock >= 5 && gameClock < 7) {
        opacity = 0.7 - ((gameClock - 5) / 2 * 0.7); // Dawn fading out (5 AM to 7 AM)
    }

    if (opacity > 0) {
        ctx.fillStyle = `rgba(10, 15, 30, ${opacity})`;
        // Map dimensions are passed in (WORLD_SIZE) so it covers the terrain perfectly
        ctx.fillRect(0, 0, mapWidth, mapHeight);
    }
}