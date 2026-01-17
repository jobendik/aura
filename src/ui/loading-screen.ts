// Loading Screen Enhancements
// Adds live counter and FOMO elements to the loading screen

/**
 * Initialize loading screen with live data
 */
export function initLoadingScreen(): void {
    // Fetch live player count immediately
    fetchLiveCount();
    
    // Update every 10 seconds while on loading screen
    const interval = setInterval(() => {
        const loading = document.getElementById('loading');
        if (!loading || loading.classList.contains('hide')) {
            clearInterval(interval);
            return;
        }
        fetchLiveCount();
    }, 10000);
    
    // Random country count (between 30-60 for social proof)
    const countriesEl = document.getElementById('loading-countries');
    if (countriesEl) {
        const baseCountries = 30 + Math.floor(Math.random() * 30);
        countriesEl.textContent = baseCountries.toString();
    }
    
    // Make name input optional - generate default name if empty
    const startBtn = document.getElementById('start');
    const nameInput = document.getElementById('name-input') as HTMLInputElement;
    
    if (startBtn && nameInput) {
        startBtn.addEventListener('click', () => {
            if (!nameInput.value.trim()) {
                nameInput.value = generateAnonymousName();
            }
        });
    }
}

/**
 * Fetch live player count from server
 */
async function fetchLiveCount(): Promise<void> {
    const countEl = document.getElementById('loading-live-count');
    const textEl = document.getElementById('loading-live-text');
    if (!countEl) return;
    
    try {
        // Try to get count from server
        const response = await fetch('/aura/status');
        if (response.ok) {
            const data = await response.json();
            const count = data.onlineCount || data.playerCount || 0;
            animateCountUp(countEl, count);
            
            if (textEl) {
                textEl.textContent = count === 1 ? 'soul drifting right now' : 'souls drifting right now';
            }
        }
    } catch (e) {
        // Fallback: show a reasonable estimate
        const fallback = 5 + Math.floor(Math.random() * 20);
        animateCountUp(countEl, fallback);
    }
}

/**
 * Animate count up effect
 */
function animateCountUp(element: HTMLElement, target: number): void {
    const current = parseInt(element.textContent || '0', 10);
    if (current === target) return;
    
    const duration = 500;
    const steps = 20;
    const stepTime = duration / steps;
    const increment = (target - current) / steps;
    
    let step = 0;
    const timer = setInterval(() => {
        step++;
        if (step >= steps) {
            element.textContent = target.toString();
            clearInterval(timer);
        } else {
            element.textContent = Math.round(current + increment * step).toString();
        }
    }, stepTime);
}

/**
 * Generate an anonymous name for frictionless entry
 */
function generateAnonymousName(): string {
    const adjectives = [
        'Wandering', 'Drifting', 'Silent', 'Cosmic', 'Starlit',
        'Dreaming', 'Luminous', 'Nebula', 'Void', 'Gentle',
        'Serene', 'Mystic', 'Ethereal', 'Twilight', 'Aurora'
    ];
    
    const nouns = [
        'Soul', 'Star', 'Spirit', 'Traveler', 'Wanderer',
        'Dreamer', 'Being', 'Light', 'Echo', 'Spark',
        'Voyager', 'Seeker', 'Shadow', 'Whisper', 'Flame'
    ];
    
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    
    return `${adj} ${noun}`;
}

// Export for use
export { generateAnonymousName };

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLoadingScreen);
} else {
    initLoadingScreen();
}
