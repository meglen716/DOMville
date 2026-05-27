// ==========================================
// PARTICLE ENGINE (Dust & Smoke)
// ==========================================

const particles = [];

// Spawns a burst of blocky dust (Used for demolition & leveling up)
function spawnDustParticles(x, y, amount = 15, color = '#7f8c8d', gridSize = 30) {
    for (let i = 0; i < amount; i++) {
        particles.push({
            type: 'dust',
            x: x + (Math.random() * gridSize),
            y: y + (Math.random() * gridSize),
            vx: (Math.random() - 0.5) * 5, 
            vy: (Math.random() - 0.5) * 5 - 1, 
            life: 1.0, 
            decay: 0.02 + Math.random() * 0.03, 
            size: 2 + Math.random() * 4, 
            color: color
        });
    }
}

// Special particles for when houses level up!
function spawnLevelUpParticles(x, y, gridSize = 30) {
    spawnDustParticles(x, y, 20, '#f1c40f', gridSize); // Golden sparkles
}

// NEW: Spawns a single, soft smoke puff that drifts and expands (Used for Factories/Power Plants)
function spawnSmokeParticle(x, y, color = 'rgba(189, 195, 199, 0.6)') {
    particles.push({
        type: 'smoke',
        x: x,
        y: y,
        vx: (Math.random() - 0.5) * 0.5, // Slow horizontal drift
        vy: -0.5 - Math.random() * 1.5,  // Float steadily upward
        life: 1.0,
        decay: 0.01 + Math.random() * 0.015, // Slow fade
        size: 4 + Math.random() * 4, // Starts small
        maxSize: 15 + Math.random() * 10, // Expands to this size as it rises
        color: color
    });
}

// Moves and renders all active particles
function updateAndDrawParticles(ctx) {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        
        // Move by velocity
        p.x += p.vx;
        p.y += p.vy;
        
        if (p.type === 'dust') {
            p.vx *= 0.92; // Friction
            p.vy *= 0.92;
            p.vy -= 0.05; // Gravity
        } else if (p.type === 'smoke') {
            // Smoke expands as it rises
            if (p.size < p.maxSize) p.size += 0.2;
            // Simulated wind (drifts slightly right)
            p.vx += 0.01; 
        }
        
        // Fade out
        p.life -= p.decay;
        
        // Remove dead particles from the array so we don't lag the game
        if (p.life <= 0) {
            particles.splice(i, 1);
            continue;
        }
        
        // Draw the particle
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.color;
        
        if (p.type === 'smoke') {
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); // Soft circles for smoke
            ctx.fill();
        } else {
            ctx.fillRect(p.x, p.y, p.size, p.size); // Square chunks for dust
        }
        
        ctx.restore();
    }
}