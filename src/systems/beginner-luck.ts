// Beginner's Luck System
// Gives new players extra rewards in their first 5 minutes to hook them

import { EventBus } from './EventBus';
import { sounds } from '../core/sounds';

const BEGINNER_DURATION = 5 * 60 * 1000; // 5 minutes
const STORAGE_KEY = 'aura_beginner_started';

interface BeginnerState {
    isActive: boolean;
    startedAt: number;
    xpMultiplier: number;
    bonusesGiven: number;
}

class BeginnerLuckManager {
    private state: BeginnerState = {
        isActive: false,
        startedAt: 0,
        xpMultiplier: 3, // 3x XP for beginners
        bonusesGiven: 0
    };
    
    private checkInterval: number | null = null;
    private bonusInterval: number | null = null;
    
    /**
     * Start beginner mode for new players
     */
    start(): void {
        const existingStart = localStorage.getItem(STORAGE_KEY);
        
        if (existingStart) {
            // Check if still within beginner window
            const startedAt = parseInt(existingStart, 10);
            const elapsed = Date.now() - startedAt;
            
            if (elapsed < BEGINNER_DURATION) {
                // Resume beginner mode
                this.state.isActive = true;
                this.state.startedAt = startedAt;
                this.showBeginnerUI();
                this.startBonusLoop();
                this.startTimer();
            }
            // Otherwise, beginner period is over
            return;
        }
        
        // New player - start beginner mode
        this.state.isActive = true;
        this.state.startedAt = Date.now();
        localStorage.setItem(STORAGE_KEY, this.state.startedAt.toString());
        
        this.showBeginnerUI();
        this.showWelcomeBonus();
        this.startBonusLoop();
        this.startTimer();
        
        console.log('🌟 Beginner\'s Luck activated!');
    }
    
    /**
     * Show the beginner mode UI indicator
     */
    private showBeginnerUI(): void {
        // Create beginner indicator if not exists
        if (!document.getElementById('beginner-mode')) {
            const indicator = document.createElement('div');
            indicator.id = 'beginner-mode';
            indicator.innerHTML = `
                <div class="beginner-glow"></div>
                <span class="beginner-icon">✨</span>
                <span class="beginner-text">3x XP ACTIVE</span>
                <span class="beginner-timer" id="beginner-timer">5:00</span>
            `;
            document.getElementById('ui')?.appendChild(indicator);
            
            // Add styles
            const style = document.createElement('style');
            style.textContent = `
                #beginner-mode {
                    position: fixed;
                    top: 70px;
                    left: 50%;
                    transform: translateX(-50%);
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 8px 16px;
                    background: linear-gradient(135deg, rgba(251, 191, 36, 0.15), rgba(251, 113, 133, 0.15));
                    border: 1px solid rgba(251, 191, 36, 0.3);
                    border-radius: 999px;
                    z-index: 100;
                    animation: beginner-pulse 2s ease-in-out infinite;
                }
                
                @keyframes beginner-pulse {
                    0%, 100% {
                        box-shadow: 0 0 20px rgba(251, 191, 36, 0.2);
                    }
                    50% {
                        box-shadow: 0 0 30px rgba(251, 191, 36, 0.4);
                    }
                }
                
                .beginner-glow {
                    position: absolute;
                    inset: -2px;
                    background: linear-gradient(135deg, #fbbf24, #fb7185);
                    border-radius: 999px;
                    opacity: 0.2;
                    filter: blur(8px);
                    z-index: -1;
                }
                
                .beginner-icon {
                    font-size: 1rem;
                }
                
                .beginner-text {
                    font-size: 0.7rem;
                    font-weight: 700;
                    letter-spacing: 0.1em;
                    color: #fbbf24;
                    text-transform: uppercase;
                }
                
                .beginner-timer {
                    font-size: 0.7rem;
                    font-weight: 600;
                    color: rgba(255,255,255,0.7);
                    font-family: 'JetBrains Mono', monospace;
                }
                
                #beginner-mode.ending {
                    animation: beginner-ending 0.5s ease-in-out infinite;
                }
                
                @keyframes beginner-ending {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                }
                
                @media (max-width: 768px) {
                    #beginner-mode {
                        top: auto;
                        bottom: 180px;
                        padding: 6px 12px;
                    }
                    .beginner-text {
                        font-size: 0.6rem;
                    }
                }
            `;
            document.head.appendChild(style);
        }
    }
    
    /**
     * Show welcome bonus popup
     */
    private showWelcomeBonus(): void {
        // Small delay for dramatic effect
        setTimeout(() => {
            const popup = document.createElement('div');
            popup.className = 'beginner-welcome-popup';
            popup.innerHTML = `
                <div class="bwp-content">
                    <div class="bwp-icon">🎁</div>
                    <div class="bwp-title">Welcome Bonus!</div>
                    <div class="bwp-text">You have <strong>3x XP</strong> for the next 5 minutes</div>
                    <div class="bwp-sub">Make connections to level up fast!</div>
                </div>
            `;
            document.body.appendChild(popup);
            
            // Add styles
            if (!document.getElementById('bwp-styles')) {
                const style = document.createElement('style');
                style.id = 'bwp-styles';
                style.textContent = `
                    .beginner-welcome-popup {
                        position: fixed;
                        inset: 0;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        z-index: 10000;
                        background: rgba(0,0,0,0.7);
                        animation: bwp-fade-in 0.3s ease;
                    }
                    
                    @keyframes bwp-fade-in {
                        from { opacity: 0; }
                        to { opacity: 1; }
                    }
                    
                    .bwp-content {
                        background: linear-gradient(135deg, #18181b, #27272a);
                        border: 1px solid rgba(251, 191, 36, 0.3);
                        border-radius: 24px;
                        padding: 40px;
                        text-align: center;
                        max-width: 320px;
                        animation: bwp-pop 0.4s ease;
                        box-shadow: 0 0 60px rgba(251, 191, 36, 0.2);
                    }
                    
                    @keyframes bwp-pop {
                        from { transform: scale(0.8); opacity: 0; }
                        to { transform: scale(1); opacity: 1; }
                    }
                    
                    .bwp-icon {
                        font-size: 4rem;
                        margin-bottom: 16px;
                        animation: bwp-bounce 1s ease infinite;
                    }
                    
                    @keyframes bwp-bounce {
                        0%, 100% { transform: translateY(0); }
                        50% { transform: translateY(-10px); }
                    }
                    
                    .bwp-title {
                        font-size: 1.5rem;
                        font-weight: 700;
                        color: #fbbf24;
                        margin-bottom: 12px;
                    }
                    
                    .bwp-text {
                        font-size: 1rem;
                        color: rgba(255,255,255,0.9);
                        margin-bottom: 8px;
                    }
                    
                    .bwp-text strong {
                        color: #fbbf24;
                    }
                    
                    .bwp-sub {
                        font-size: 0.8rem;
                        color: rgba(255,255,255,0.5);
                    }
                `;
                document.head.appendChild(style);
            }
            
            sounds.play('level_up');
            
            // Auto-dismiss after 3 seconds
            setTimeout(() => {
                popup.style.opacity = '0';
                popup.style.transition = 'opacity 0.3s ease';
                setTimeout(() => popup.remove(), 300);
            }, 3000);
            
            // Or dismiss on click
            popup.addEventListener('click', () => {
                popup.remove();
            });
        }, 1500);
    }
    
    /**
     * Start the countdown timer
     */
    private startTimer(): void {
        this.checkInterval = window.setInterval(() => {
            const elapsed = Date.now() - this.state.startedAt;
            const remaining = Math.max(0, BEGINNER_DURATION - elapsed);
            
            const timerEl = document.getElementById('beginner-timer');
            if (timerEl) {
                const mins = Math.floor(remaining / 60000);
                const secs = Math.floor((remaining % 60000) / 1000);
                timerEl.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
                
                // Flash when ending soon
                if (remaining < 30000) {
                    document.getElementById('beginner-mode')?.classList.add('ending');
                }
            }
            
            if (remaining <= 0) {
                this.end();
            }
        }, 1000);
    }
    
    /**
     * Give periodic bonuses during beginner mode
     */
    private startBonusLoop(): void {
        // Give a small bonus every 30 seconds to keep dopamine flowing
        this.bonusInterval = window.setInterval(() => {
            if (!this.state.isActive) return;
            
            this.state.bonusesGiven++;
            
            // Emit XP gain event
            EventBus.emit('beginner:bonus', { 
                xp: 10 * this.state.bonusesGiven, // Increasing bonuses
                reason: 'Exploration bonus'
            });
            
            // Show floating text
            this.showFloatingBonus(`+${10 * this.state.bonusesGiven} XP`);
            
        }, 30000); // Every 30 seconds
    }
    
    /**
     * Show floating bonus text
     */
    private showFloatingBonus(text: string): void {
        const float = document.createElement('div');
        float.className = 'floating-bonus';
        float.textContent = text;
        float.style.cssText = `
            position: fixed;
            left: 50%;
            top: 40%;
            transform: translateX(-50%);
            font-size: 1.5rem;
            font-weight: 700;
            color: #fbbf24;
            text-shadow: 0 0 20px rgba(251, 191, 36, 0.5);
            animation: float-up 1.5s ease-out forwards;
            z-index: 1000;
            pointer-events: none;
        `;
        
        if (!document.getElementById('float-bonus-style')) {
            const style = document.createElement('style');
            style.id = 'float-bonus-style';
            style.textContent = `
                @keyframes float-up {
                    0% { opacity: 1; transform: translateX(-50%) translateY(0); }
                    100% { opacity: 0; transform: translateX(-50%) translateY(-50px); }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(float);
        setTimeout(() => float.remove(), 1500);
    }
    
    /**
     * End beginner mode
     */
    private end(): void {
        this.state.isActive = false;
        
        if (this.checkInterval) clearInterval(this.checkInterval);
        if (this.bonusInterval) clearInterval(this.bonusInterval);
        
        // Remove UI
        document.getElementById('beginner-mode')?.remove();
        
        // Show ending message
        this.showEndMessage();
        
        console.log('🌟 Beginner\'s Luck ended');
    }
    
    /**
     * Show message when beginner mode ends
     */
    private showEndMessage(): void {
        const popup = document.createElement('div');
        popup.className = 'beginner-end-popup';
        popup.innerHTML = `
            <div class="bep-content">
                <div class="bep-icon">⭐</div>
                <div class="bep-title">Bonus Time Over</div>
                <div class="bep-text">But your journey has just begun...</div>
                <div class="bep-tip">💡 Keep exploring to unlock new abilities!</div>
            </div>
        `;
        
        popup.style.cssText = `
            position: fixed;
            inset: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            background: rgba(0,0,0,0.7);
            animation: bwp-fade-in 0.3s ease;
        `;
        
        const content = popup.querySelector('.bep-content') as HTMLElement;
        if (content) {
            content.style.cssText = `
                background: linear-gradient(135deg, #18181b, #27272a);
                border: 1px solid rgba(125, 211, 252, 0.3);
                border-radius: 24px;
                padding: 32px;
                text-align: center;
                max-width: 300px;
            `;
        }
        
        document.body.appendChild(popup);
        
        setTimeout(() => {
            popup.style.opacity = '0';
            popup.style.transition = 'opacity 0.3s ease';
            setTimeout(() => popup.remove(), 300);
        }, 3000);
        
        popup.addEventListener('click', () => popup.remove());
    }
    
    /**
     * Get current XP multiplier
     */
    getMultiplier(): number {
        return this.state.isActive ? this.state.xpMultiplier : 1;
    }
    
    /**
     * Check if beginner mode is active
     */
    isActive(): boolean {
        return this.state.isActive;
    }
}

// Export singleton
export const beginnerLuck = new BeginnerLuckManager();
