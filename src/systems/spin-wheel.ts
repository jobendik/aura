// Daily Spin Wheel System
// Gambling mechanics with variable rewards to maximize dopamine

import { EventBus } from './EventBus';

interface SpinReward {
    id: string;
    name: string;
    icon: string;
    type: 'xp' | 'cosmetic' | 'boost' | 'currency' | 'nothing';
    value: number;
    rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
    weight: number; // Higher = more likely
    color: string;
}

const SPIN_REWARDS: SpinReward[] = [
    { id: 'xp_small', name: '25 XP', icon: '⚡', type: 'xp', value: 25, rarity: 'common', weight: 30, color: '#6ee7b7' },
    { id: 'xp_medium', name: '50 XP', icon: '⚡', type: 'xp', value: 50, rarity: 'common', weight: 20, color: '#6ee7b7' },
    { id: 'xp_large', name: '100 XP', icon: '⚡', type: 'xp', value: 100, rarity: 'uncommon', weight: 12, color: '#7dd3fc' },
    { id: 'xp_huge', name: '250 XP', icon: '💫', type: 'xp', value: 250, rarity: 'rare', weight: 5, color: '#c4b5fd' },
    { id: 'xp_jackpot', name: '500 XP', icon: '🌟', type: 'xp', value: 500, rarity: 'epic', weight: 2, color: '#fb7185' },
    { id: 'boost_speed', name: 'Speed Boost', icon: '🚀', type: 'boost', value: 30, rarity: 'uncommon', weight: 10, color: '#fbbf24' },
    { id: 'boost_xp', name: '2x XP (1hr)', icon: '✨', type: 'boost', value: 60, rarity: 'rare', weight: 6, color: '#f472b6' },
    { id: 'aura_shimmer', name: 'Shimmer Aura', icon: '💎', type: 'cosmetic', value: 1, rarity: 'rare', weight: 4, color: '#818cf8' },
    { id: 'aura_rainbow', name: 'Rainbow Trail', icon: '🌈', type: 'cosmetic', value: 2, rarity: 'epic', weight: 2, color: '#f472b6' },
    { id: 'aura_legendary', name: 'Cosmic Crown', icon: '👑', type: 'cosmetic', value: 3, rarity: 'legendary', weight: 0.5, color: '#fbbf24' },
    { id: 'nothing', name: 'Try Again!', icon: '💨', type: 'nothing', value: 0, rarity: 'common', weight: 8, color: '#71717a' },
];

const STORAGE_KEY = 'aura_daily_spin';
const SPINS_PER_DAY = 1;

interface SpinState {
    lastSpinDate: string;
    spinsUsedToday: number;
    totalSpins: number;
    legendaryWins: number;
}

class DailySpinWheel {
    private state: SpinState;
    private isSpinning: boolean = false;
    
    constructor() {
        this.state = this.loadState();
    }
    
    private loadState(): SpinState {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                return JSON.parse(saved);
            }
        } catch (e) {}
        
        return {
            lastSpinDate: '',
            spinsUsedToday: 0,
            totalSpins: 0,
            legendaryWins: 0
        };
    }
    
    private saveState(): void {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    }
    
    private getToday(): string {
        return new Date().toISOString().split('T')[0];
    }
    
    /**
     * Check if user has free spins available
     */
    hasFreeSpin(): boolean {
        const today = this.getToday();
        if (this.state.lastSpinDate !== today) {
            return true; // New day, reset
        }
        return this.state.spinsUsedToday < SPINS_PER_DAY;
    }
    
    /**
     * Get remaining free spins
     */
    getFreeSpinsRemaining(): number {
        const today = this.getToday();
        if (this.state.lastSpinDate !== today) {
            return SPINS_PER_DAY;
        }
        return Math.max(0, SPINS_PER_DAY - this.state.spinsUsedToday);
    }
    
    /**
     * Select a random reward based on weights
     */
    private selectReward(): SpinReward {
        const totalWeight = SPIN_REWARDS.reduce((sum, r) => sum + r.weight, 0);
        let random = Math.random() * totalWeight;
        
        for (const reward of SPIN_REWARDS) {
            random -= reward.weight;
            if (random <= 0) {
                return reward;
            }
        }
        
        return SPIN_REWARDS[0]; // Fallback
    }
    
    /**
     * Perform a spin
     */
    async spin(useFree: boolean = true): Promise<SpinReward | null> {
        if (this.isSpinning) return null;
        
        const today = this.getToday();
        
        // Reset if new day
        if (this.state.lastSpinDate !== today) {
            this.state.lastSpinDate = today;
            this.state.spinsUsedToday = 0;
        }
        
        // Check if can spin
        if (useFree && this.state.spinsUsedToday >= SPINS_PER_DAY) {
            return null; // No free spins left
        }
        
        this.isSpinning = true;
        
        // Select reward
        const reward = this.selectReward();
        
        // Show wheel UI and animate
        await this.showWheelAnimation(reward);
        
        // Update state
        if (useFree) {
            this.state.spinsUsedToday++;
        }
        this.state.totalSpins++;
        if (reward.rarity === 'legendary') {
            this.state.legendaryWins++;
        }
        this.saveState();
        
        // Apply reward
        this.applyReward(reward);
        
        this.isSpinning = false;
        
        return reward;
    }
    
    /**
     * Show the wheel animation
     */
    private async showWheelAnimation(reward: SpinReward): Promise<void> {
        return new Promise((resolve) => {
            // Create wheel overlay
            const overlay = document.createElement('div');
            overlay.id = 'spin-wheel-overlay';
            overlay.innerHTML = `
                <div class="spin-wheel-container">
                    <div class="spin-wheel-title">🎰 Daily Spin!</div>
                    <div class="spin-wheel">
                        <div class="spin-wheel-pointer">▼</div>
                        <div class="spin-wheel-circle" id="spin-circle">
                            ${SPIN_REWARDS.map((r, i) => `
                                <div class="spin-segment" style="
                                    transform: rotate(${i * (360 / SPIN_REWARDS.length)}deg);
                                    background: linear-gradient(135deg, ${r.color}22, ${r.color}44);
                                ">
                                    <span class="spin-segment-icon">${r.icon}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    <button class="spin-btn" id="do-spin">SPIN!</button>
                </div>
            `;
            
            document.body.appendChild(overlay);
            this.addWheelStyles();
            
            const spinBtn = document.getElementById('do-spin');
            const circle = document.getElementById('spin-circle');
            
            spinBtn?.addEventListener('click', () => {
                if (!circle) return;
                
                spinBtn.style.display = 'none';
                
                // Calculate final rotation to land on reward
                const rewardIndex = SPIN_REWARDS.findIndex(r => r.id === reward.id);
                const segmentAngle = 360 / SPIN_REWARDS.length;
                const targetAngle = 360 - (rewardIndex * segmentAngle) - (segmentAngle / 2);
                const spins = 5 + Math.random() * 3; // 5-8 full spins
                const finalRotation = spins * 360 + targetAngle;
                
                circle.style.transition = 'transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)';
                circle.style.transform = `rotate(${finalRotation}deg)`;
                
                // Play tick sounds during spin
                let tickCount = 0;
                const tickInterval = setInterval(() => {
                    tickCount++;
                    if (tickCount >= 30) {
                        clearInterval(tickInterval);
                    }
                }, 100);
                
                // Show result after spin
                setTimeout(() => {
                    clearInterval(tickInterval);
                    this.showRewardResult(reward, overlay, resolve);
                }, 4200);
            });
        });
    }
    
    /**
     * Show the reward result
     */
    private showRewardResult(reward: SpinReward, overlay: HTMLElement, resolve: () => void): void {
        const container = overlay.querySelector('.spin-wheel-container');
        if (!container) {
            overlay.remove();
            resolve();
            return;
        }
        
        // Emit reward notification
        EventBus.emit('ui:toast', { message: `Won: ${reward.name}!`, type: reward.rarity });
        
        container.innerHTML = `
            <div class="spin-result ${reward.rarity}">
                <div class="spin-result-icon">${reward.icon}</div>
                <div class="spin-result-label">${reward.rarity.toUpperCase()}</div>
                <div class="spin-result-name">${reward.name}</div>
                <button class="spin-claim-btn" id="claim-reward">Claim!</button>
            </div>
        `;
        
        document.getElementById('claim-reward')?.addEventListener('click', () => {
            overlay.style.opacity = '0';
            setTimeout(() => {
                overlay.remove();
                resolve();
            }, 300);
        });
    }
    
    /**
     * Apply the reward to the player
     */
    private applyReward(reward: SpinReward): void {
        switch (reward.type) {
            case 'xp':
                EventBus.emit('player:xpGain', { amount: reward.value });
                break;
            case 'boost':
                // Store boost in localStorage
                const boostEnd = Date.now() + reward.value * 60 * 1000;
                localStorage.setItem('aura_active_boost', JSON.stringify({
                    type: reward.id,
                    endsAt: boostEnd
                }));
                break;
            case 'cosmetic':
                // Store unlocked cosmetic
                const cosmetics = JSON.parse(localStorage.getItem('aura_cosmetics') || '[]');
                if (!cosmetics.includes(reward.id)) {
                    cosmetics.push(reward.id);
                    localStorage.setItem('aura_cosmetics', JSON.stringify(cosmetics));
                }
                EventBus.emit('cosmetic:unlocked', { cosmeticId: reward.id, name: reward.name });
                break;
        }
    }
    
    /**
     * Add wheel styles
     */
    private addWheelStyles(): void {
        if (document.getElementById('spin-wheel-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'spin-wheel-styles';
        style.textContent = `
            #spin-wheel-overlay {
                position: fixed;
                inset: 0;
                background: rgba(0, 0, 0, 0.9);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 100000;
                animation: fadeIn 0.3s ease;
                transition: opacity 0.3s ease;
            }
            
            .spin-wheel-container {
                text-align: center;
            }
            
            .spin-wheel-title {
                font-size: 2rem;
                font-weight: 700;
                color: #fbbf24;
                margin-bottom: 24px;
                text-shadow: 0 0 20px rgba(251, 191, 36, 0.5);
            }
            
            .spin-wheel {
                position: relative;
                width: 300px;
                height: 300px;
                margin: 0 auto 24px;
            }
            
            .spin-wheel-pointer {
                position: absolute;
                top: -20px;
                left: 50%;
                transform: translateX(-50%);
                font-size: 2rem;
                color: #fbbf24;
                z-index: 10;
                filter: drop-shadow(0 0 10px rgba(251, 191, 36, 0.8));
            }
            
            .spin-wheel-circle {
                width: 100%;
                height: 100%;
                border-radius: 50%;
                position: relative;
                background: linear-gradient(135deg, #18181b, #27272a);
                border: 4px solid rgba(251, 191, 36, 0.5);
                box-shadow: 0 0 40px rgba(251, 191, 36, 0.3);
                overflow: hidden;
            }
            
            .spin-segment {
                position: absolute;
                width: 50%;
                height: 50%;
                top: 0;
                right: 0;
                transform-origin: bottom left;
                display: flex;
                align-items: center;
                justify-content: center;
                clip-path: polygon(0 0, 100% 0, 0 100%);
            }
            
            .spin-segment-icon {
                font-size: 1.5rem;
                transform: rotate(45deg) translateX(20px);
            }
            
            .spin-btn {
                background: linear-gradient(135deg, #fbbf24, #f59e0b);
                border: none;
                padding: 16px 48px;
                border-radius: 12px;
                font-size: 1.2rem;
                font-weight: 700;
                color: #000;
                cursor: pointer;
                transition: all 0.2s;
                box-shadow: 0 4px 20px rgba(251, 191, 36, 0.4);
            }
            
            .spin-btn:hover {
                transform: translateY(-2px) scale(1.05);
                box-shadow: 0 8px 30px rgba(251, 191, 36, 0.5);
            }
            
            .spin-result {
                animation: popIn 0.5s ease;
            }
            
            @keyframes popIn {
                from { transform: scale(0.5); opacity: 0; }
                to { transform: scale(1); opacity: 1; }
            }
            
            .spin-result-icon {
                font-size: 5rem;
                margin-bottom: 16px;
                animation: bounce 0.6s ease infinite;
            }
            
            @keyframes bounce {
                0%, 100% { transform: translateY(0); }
                50% { transform: translateY(-10px); }
            }
            
            .spin-result-label {
                font-size: 0.8rem;
                font-weight: 700;
                letter-spacing: 0.2em;
                margin-bottom: 8px;
            }
            
            .spin-result.common .spin-result-label { color: #71717a; }
            .spin-result.uncommon .spin-result-label { color: #6ee7b7; }
            .spin-result.rare .spin-result-label { color: #7dd3fc; }
            .spin-result.epic .spin-result-label { color: #c4b5fd; }
            .spin-result.legendary .spin-result-label { 
                color: #fbbf24; 
                animation: glow 1s ease infinite;
            }
            
            @keyframes glow {
                0%, 100% { text-shadow: 0 0 10px rgba(251, 191, 36, 0.5); }
                50% { text-shadow: 0 0 30px rgba(251, 191, 36, 0.8); }
            }
            
            .spin-result-name {
                font-size: 1.5rem;
                font-weight: 600;
                color: #fff;
                margin-bottom: 24px;
            }
            
            .spin-claim-btn {
                background: linear-gradient(135deg, #7dd3fc, #38bdf8);
                border: none;
                padding: 14px 40px;
                border-radius: 12px;
                font-size: 1rem;
                font-weight: 600;
                color: #000;
                cursor: pointer;
                transition: all 0.2s;
            }
            
            .spin-claim-btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 8px 30px rgba(125, 211, 252, 0.4);
            }
            
            .spin-result.legendary {
                background: radial-gradient(circle, rgba(251, 191, 36, 0.2), transparent);
                padding: 40px;
                border-radius: 24px;
            }
        `;
        document.head.appendChild(style);
    }
    
    /**
     * Show spin button if available
     */
    showSpinButton(): void {
        if (!this.hasFreeSpin()) return;
        
        // Remove existing button
        document.getElementById('daily-spin-btn')?.remove();
        
        const btn = document.createElement('button');
        btn.id = 'daily-spin-btn';
        btn.innerHTML = `
            <span class="spin-btn-icon">🎰</span>
            <span class="spin-btn-text">FREE SPIN!</span>
        `;
        btn.style.cssText = `
            position: fixed;
            top: 120px;
            left: 20px;
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 10px 16px;
            background: linear-gradient(135deg, #fbbf24, #f59e0b);
            border: none;
            border-radius: 12px;
            font-weight: 600;
            font-size: 0.8rem;
            color: #000;
            cursor: pointer;
            z-index: 100;
            animation: pulse-btn 2s ease infinite;
            box-shadow: 0 4px 20px rgba(251, 191, 36, 0.4);
        `;
        
        // Add pulse animation
        if (!document.getElementById('spin-btn-style')) {
            const style = document.createElement('style');
            style.id = 'spin-btn-style';
            style.textContent = `
                @keyframes pulse-btn {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.05); }
                }
                #daily-spin-btn:hover {
                    transform: scale(1.1) !important;
                }
            `;
            document.head.appendChild(style);
        }
        
        btn.addEventListener('click', async () => {
            btn.remove();
            await this.spin(true);
        });
        
        document.getElementById('ui')?.appendChild(btn);
    }
}

export const dailySpin = new DailySpinWheel();
