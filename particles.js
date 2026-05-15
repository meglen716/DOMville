// particles.js

const particles = [];

// Spawns a burst of particles at a specific grid location
function spawnDustParticles(x, y, amount = 15, color = '#7f8c8d', gridSize = 40) {
    for (let i = 0; i < amount; i++) {
        particles.push({
            // Start somewhere inside the grid square
            x: x + (Math.random() * gridSize),
            y: y + (Math.random() * gridSize),
            
            // Explode outward in random directions
            vx: (Math.random() - 0.5) * 5, 
            vy: (Math.random() - 0.5) * 5 - 1, // Bias slightly upward
            
            life: 1.0, // Start fully opaque
            decay: 0.02 + Math.random() * 0.03, // Fade out at random speeds
            size: 2 + Math.random() * 4, // Random chunk sizes
            color: color
        });
    }
}

// Special particles for when houses level up!
function spawnLevelUpParticles(x, y, gridSize = 40) {
    spawnDustParticles(x, y, 20, '#f1c40f', gridSize); // Golden sparkles
}

// Moves and renders all active particles
function updateAndDrawParticles(ctx) {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        
        // Move by velocity
        p.x += p.vx;
        p.y += p.vy;
        
        // Add friction so they slow down over time
        p.vx *= 0.92;
        p.vy *= 0.92;
        
        // Float upward slightly like real dust
        p.vy -= 0.05; 
        
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
        ctx.fillRect(p.x, p.y, p.size, p.size); // Square dust chunks fit the blocky aesthetic
        ctx.restore();
    }
}