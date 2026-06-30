// ==========================================
// UI, MENUS, AND EVENT LISTENERS (ui.js)
// ==========================================
window.addEventListener('DOMContentLoaded', () => {
    
    // --- SETTINGS PANEL (Floating) ---
    const settingsBtn = document.getElementById('settings-btn');
    const settingsPanel = document.getElementById('settings-panel');
    const closeSettings = document.getElementById('close-settings-btn');

    // Toggles the 'active' class to trigger the CSS slide-up animation
    if (settingsBtn) settingsBtn.addEventListener('click', () => settingsPanel.classList.toggle('active'));
    if (closeSettings) closeSettings.addEventListener('click', () => settingsPanel.classList.remove('active'));

    // --- TOGGLES ---
    const outlineToggle = document.getElementById('outline-toggle');
    if (outlineToggle) {
        outlineToggle.addEventListener('change', (e) => {
            window.showBuildingOutlines = e.target.checked;
            if (typeof saveGame === 'function') saveGame();
        });
    }

    // Sound toggle logic (Assuming you have window.gameIsMuted)
    const soundToggle = document.getElementById('sound-toggle');
    if (soundToggle) {
        soundToggle.addEventListener('change', (e) => {
            window.gameIsMuted = !e.target.checked; // If checked, NOT muted
            if (typeof saveGame === 'function') saveGame();
        });
    }

    // --- REBUILD & DEMOLISH TOGGLES ---
    const demToggle = document.getElementById('demolish-toggle');
    const rebToggle = document.getElementById('rebuild-toggle');

    if (demToggle) {
        demToggle.addEventListener('change', (e) => {
            if (e.target.checked) {
                if (rebToggle) rebToggle.checked = false; // Turn off rebuild
                document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
                window.currentTool = 'delete';
            } else {
                window.currentTool = null;
            }
        });
    }

    if (rebToggle) {
        rebToggle.addEventListener('change', (e) => {
            if (e.target.checked) {
                if (demToggle) demToggle.checked = false; // Turn off demolish
                document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
                window.currentTool = 'rebuild';
            } else {
                window.currentTool = null;
            }
        });
    }

    const newGameBtn = document.getElementById('new-game-btn');
    if (newGameBtn) {
        newGameBtn.addEventListener('click', () => {
            if (confirm("Are you sure you want to start a new city? All progress will be lost!")) { 
                localStorage.removeItem('miniCitySave'); 
                location.reload(); 
            }
        });
    }
});