// Time-Limited Challenges System
// Creates urgency and FOMO with expiring challenges

import { EventBus } from './EventBus';

interface Challenge {
    id: string;
    name: string;
    description: string;
    icon: string;
    type: 'hourly' | 'daily' | 'weekend' | 'flash';
    goal: number;
    progress: number;
    reward: {
        type: 'xp' | 'cosmetic' | 'boost' | 'spin';
        value: number;
        name: string;
    };
    expiresAt: number;
    completed: boolean;
    claimed: boolean;
}

// Challenge templates
const CHALLENGE_TEMPLATES = {
    hourly: [
        { name: 'Quick Explorer', description: 'Visit 3 different areas', icon: '🗺️', goal: 3, reward: { type: 'xp', value: 50, name: '50 XP' } },
        { name: 'Social Butterfly', description: 'Wave to 5 players', icon: '👋', goal: 5, reward: { type: 'xp', value: 75, name: '75 XP' } },
        { name: 'Collector', description: 'Collect 10 items', icon: '✨', goal: 10, reward: { type: 'xp', value: 60, name: '60 XP' } },
        { name: 'Speed Run', description: 'Move 500 units', icon: '⚡', goal: 500, reward: { type: 'xp', value: 50, name: '50 XP' } },
    ],
    daily: [
        { name: 'Daily Wanderer', description: 'Spend 30 minutes online', icon: '⏰', goal: 30, reward: { type: 'xp', value: 200, name: '200 XP' } },
        { name: 'Friendship Builder', description: 'Form 3 bonds', icon: '💖', goal: 3, reward: { type: 'xp', value: 250, name: '250 XP' } },
        { name: 'Voice Champion', description: 'Talk to 10 players', icon: '🎤', goal: 10, reward: { type: 'spin', value: 1, name: 'Bonus Spin' } },
        { name: 'XP Hunter', description: 'Earn 500 XP', icon: '⭐', goal: 500, reward: { type: 'xp', value: 300, name: '300 XP' } },
        { name: 'Community Star', description: 'Give 20 reactions', icon: '💫', goal: 20, reward: { type: 'xp', value: 200, name: '200 XP' } },
    ],
    weekend: [
        { name: 'Weekend Warrior', description: 'Spend 2 hours online', icon: '🎮', goal: 120, reward: { type: 'xp', value: 500, name: '500 XP' } },
        { name: 'Party Host', description: 'Create a group of 5+', icon: '🎉', goal: 1, reward: { type: 'cosmetic', value: 1, name: 'Party Hat' } },
        { name: 'Level Up', description: 'Gain 3 levels', icon: '📈', goal: 3, reward: { type: 'xp', value: 750, name: '750 XP' } },
    ],
    flash: [
        { name: '⚡ FLASH: Wave Frenzy', description: 'Wave to 10 people in 5 min!', icon: '🌊', goal: 10, reward: { type: 'xp', value: 150, name: '150 XP' } },
        { name: '⚡ FLASH: Sprint', description: 'Move 1000 units in 3 min!', icon: '🏃', goal: 1000, reward: { type: 'xp', value: 100, name: '100 XP' } },
        { name: '⚡ FLASH: Social', description: 'Meet 5 new people in 5 min!', icon: '🤝', goal: 5, reward: { type: 'xp', value: 200, name: '200 XP' } },
    ]
};

const STORAGE_KEY = 'aura_challenges';

class ChallengeManager {
    private challenges: Challenge[] = [];
    
    constructor() {
        this.challenges = this.loadChallenges();
        this.setupEventTracking();
        this.startFlashChallengeTimer();
        
        // Clean up expired challenges on load
        this.cleanupExpired();
        
        // Generate initial challenges if needed
        this.ensureChallengesExist();
    }
    
    private loadChallenges(): Challenge[] {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                return JSON.parse(saved);
            }
        } catch (e) {}
        return [];
    }
    
    private saveChallenges(): void {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.challenges));
    }
    
    /**
     * Ensure we have active challenges
     */
    private ensureChallengesExist(): void {
        const now = Date.now();
        
        // Check for hourly challenge
        if (!this.challenges.find(c => c.type === 'hourly' && c.expiresAt > now && !c.completed)) {
            this.generateChallenge('hourly');
        }
        
        // Check for daily challenges (should have 3)
        const activeDailies = this.challenges.filter(c => c.type === 'daily' && c.expiresAt > now && !c.claimed);
        if (activeDailies.length < 3) {
            for (let i = activeDailies.length; i < 3; i++) {
                this.generateChallenge('daily');
            }
        }
        
        // Weekend challenges on Fri-Sun
        const day = new Date().getDay();
        if ((day === 5 || day === 6 || day === 0) && 
            !this.challenges.find(c => c.type === 'weekend' && c.expiresAt > now && !c.claimed)) {
            this.generateChallenge('weekend');
        }
    }
    
    /**
     * Generate a new challenge
     */
    private generateChallenge(type: Challenge['type']): Challenge {
        const templates = CHALLENGE_TEMPLATES[type];
        const template = templates[Math.floor(Math.random() * templates.length)];
        
        // Calculate expiry
        const now = Date.now();
        let expiresAt: number;
        
        switch (type) {
            case 'hourly':
                expiresAt = now + 60 * 60 * 1000; // 1 hour
                break;
            case 'daily':
                // Expire at midnight
                const tomorrow = new Date();
                tomorrow.setHours(24, 0, 0, 0);
                expiresAt = tomorrow.getTime();
                break;
            case 'weekend':
                // Expire Monday midnight
                const monday = new Date();
                monday.setDate(monday.getDate() + (8 - monday.getDay()) % 7);
                monday.setHours(0, 0, 0, 0);
                expiresAt = monday.getTime();
                break;
            case 'flash':
                expiresAt = now + 5 * 60 * 1000; // 5 minutes
                break;
        }
        
        const challenge: Challenge = {
            id: `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: template.name,
            description: template.description,
            icon: template.icon,
            type,
            goal: template.goal,
            progress: 0,
            reward: template.reward as Challenge['reward'],
            expiresAt,
            completed: false,
            claimed: false
        };
        
        this.challenges.push(challenge);
        this.saveChallenges();
        
        // Show notification for new challenge (except on load)
        if (type === 'flash') {
            this.showFlashChallengeNotification(challenge);
        }
        
        return challenge;
    }
    
    /**
     * Clean up expired challenges
     */
    private cleanupExpired(): void {
        const now = Date.now();
        this.challenges = this.challenges.filter(c => 
            c.expiresAt > now || (c.completed && !c.claimed)
        );
        this.saveChallenges();
    }
    
    /**
     * Setup event tracking for challenge progress
     */
    private setupEventTracking(): void {
        // Track waves
        EventBus.on('player:wave', () => {
            this.updateProgress(['Wave to', 'Wave Frenzy'], 1);
        });
        
        // Track XP
        EventBus.on('player:xpGain', (data) => {
            this.updateProgress(['XP'], data.amount);
        });
        
        // Track movement
        EventBus.on('player:move', (data) => {
            this.updateProgress(['Move', 'Sprint'], data.distance || 1);
        });
        
        // Track connections/bonds
        EventBus.on('player:bond', () => {
            this.updateProgress(['bond', 'Friendship'], 1);
        });
        
        // Track time online (every minute)
        setInterval(() => {
            this.updateProgress(['minutes', 'Spend', 'hours'], 1);
        }, 60000);
    }
    
    /**
     * Update progress for matching challenges
     */
    private updateProgress(keywords: string[], amount: number): void {
        let updated = false;
        
        for (const challenge of this.challenges) {
            if (challenge.completed || challenge.claimed) continue;
            if (challenge.expiresAt < Date.now()) continue;
            
            // Check if challenge matches any keyword
            const matches = keywords.some(kw => 
                challenge.name.toLowerCase().includes(kw.toLowerCase()) ||
                challenge.description.toLowerCase().includes(kw.toLowerCase())
            );
            
            if (matches) {
                challenge.progress += amount;
                
                if (challenge.progress >= challenge.goal) {
                    challenge.progress = challenge.goal;
                    challenge.completed = true;
                    this.showChallengeComplete(challenge);
                }
                
                updated = true;
            }
        }
        
        if (updated) {
            this.saveChallenges();
        }
    }
    
    /**
     * Start flash challenge timer
     */
    private startFlashChallengeTimer(): void {
        // Random flash challenges every 15-30 minutes
        const scheduleNext = () => {
            const delay = (15 + Math.random() * 15) * 60 * 1000;
            setTimeout(() => {
                this.generateChallenge('flash');
                scheduleNext();
            }, delay);
        };
        
        scheduleNext();
    }
    
    /**
     * Show flash challenge notification
     */
    private showFlashChallengeNotification(challenge: Challenge): void {
        EventBus.emit('ui:toast', { message: '⚡ Flash Challenge!', type: 'warning' });
        
        const popup = document.createElement('div');
        popup.className = 'flash-challenge-popup';
        popup.innerHTML = `
            <div class="fcp-content">
                <div class="fcp-header">⚡ FLASH CHALLENGE!</div>
                <div class="fcp-icon">${challenge.icon}</div>
                <div class="fcp-name">${challenge.name}</div>
                <div class="fcp-desc">${challenge.description}</div>
                <div class="fcp-timer">5:00</div>
                <div class="fcp-reward">Reward: ${challenge.reward.name}</div>
            </div>
        `;
        
        document.body.appendChild(popup);
        this.addFlashStyles();
        
        // Update timer
        let timeLeft = 5 * 60;
        const timerEl = popup.querySelector('.fcp-timer');
        const timerInterval = setInterval(() => {
            timeLeft--;
            if (timerEl) {
                const mins = Math.floor(timeLeft / 60);
                const secs = timeLeft % 60;
                timerEl.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
            }
            if (timeLeft <= 0) {
                clearInterval(timerInterval);
            }
        }, 1000);
        
        // Auto-dismiss after 5 seconds
        setTimeout(() => {
            popup.style.opacity = '0';
            popup.style.transition = 'opacity 0.3s';
            setTimeout(() => {
                popup.remove();
                clearInterval(timerInterval);
            }, 300);
        }, 5000);
        
        // Dismiss on click
        popup.addEventListener('click', () => {
            popup.remove();
            clearInterval(timerInterval);
            this.showChallengesUI();
        });
    }
    
    /**
     * Show challenge complete notification
     */
    private showChallengeComplete(challenge: Challenge): void {
        EventBus.emit('ui:toast', { message: `Challenge Complete: ${challenge.name}!`, type: 'success' });
        
        const popup = document.createElement('div');
        popup.className = 'challenge-complete-popup';
        popup.innerHTML = `
            <div class="ccp-content">
                <div class="ccp-icon">🎯</div>
                <div class="ccp-text">Challenge Complete!</div>
                <div class="ccp-name">${challenge.name}</div>
                <div class="ccp-reward">+${challenge.reward.name}</div>
                <button class="ccp-claim" id="claim-challenge-${challenge.id}">Claim</button>
            </div>
        `;
        
        document.body.appendChild(popup);
        this.addCompleteStyles();
        
        document.getElementById(`claim-challenge-${challenge.id}`)?.addEventListener('click', () => {
            this.claimReward(challenge);
            popup.remove();
        });
    }
    
    /**
     * Claim a challenge reward
     */
    claimReward(challenge: Challenge): void {
        if (!challenge.completed || challenge.claimed) return;
        
        challenge.claimed = true;
        this.saveChallenges();
        
        EventBus.emit('ui:toast', { message: `Reward claimed!`, type: 'success' });
        
        switch (challenge.reward.type) {
            case 'xp':
                EventBus.emit('player:xpGain', { amount: challenge.reward.value });
                break;
            case 'spin':
                // Give bonus spin - handled by spin wheel system
                const spins = parseInt(localStorage.getItem('aura_bonus_spins') || '0');
                localStorage.setItem('aura_bonus_spins', (spins + challenge.reward.value).toString());
                break;
            case 'cosmetic':
                EventBus.emit('cosmetic:unlocked', { cosmeticId: 'badge_pioneer', name: challenge.reward.name });
                break;
            case 'boost':
                const boostEnd = Date.now() + challenge.reward.value * 60 * 1000;
                localStorage.setItem('aura_active_boost', JSON.stringify({
                    type: 'challenge_boost',
                    endsAt: boostEnd
                }));
                break;
        }
    }
    
    /**
     * Get active challenges
     */
    getActiveChallenges(): Challenge[] {
        const now = Date.now();
        this.cleanupExpired();
        this.ensureChallengesExist();
        return this.challenges.filter(c => 
            (c.expiresAt > now && !c.claimed) || (c.completed && !c.claimed)
        );
    }
    
    /**
     * Show challenges UI
     */
    showChallengesUI(): void {
        const challenges = this.getActiveChallenges();
        
        const overlay = document.createElement('div');
        overlay.id = 'challenges-overlay';
        
        overlay.innerHTML = `
            <div class="ch-container">
                <div class="ch-header">
                    <h2>🎯 Challenges</h2>
                    <button class="ch-close" id="ch-close">×</button>
                </div>
                <div class="ch-list">
                    ${challenges.length === 0 ? '<div class="ch-empty">No active challenges</div>' : ''}
                    ${challenges.map(c => this.renderChallenge(c)).join('')}
                </div>
            </div>
        `;
        
        document.body.appendChild(overlay);
        this.addChallengeStyles();
        
        // Close button
        document.getElementById('ch-close')?.addEventListener('click', () => {
            overlay.remove();
        });
        
        // Claim buttons
        challenges.filter(c => c.completed && !c.claimed).forEach(c => {
            document.getElementById(`ch-claim-${c.id}`)?.addEventListener('click', () => {
                this.claimReward(c);
                overlay.remove();
                this.showChallengesUI();
            });
        });
    }
    
    /**
     * Render a challenge card
     */
    private renderChallenge(challenge: Challenge): string {
        const now = Date.now();
        const timeLeft = challenge.expiresAt - now;
        const hours = Math.floor(timeLeft / (1000 * 60 * 60));
        const mins = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
        
        const progress = Math.min(100, (challenge.progress / challenge.goal) * 100);
        const typeColor = {
            hourly: '#7dd3fc',
            daily: '#6ee7b7',
            weekend: '#c4b5fd',
            flash: '#fb7185'
        };
        
        return `
            <div class="ch-card ${challenge.completed ? 'completed' : ''}" style="--type-color: ${typeColor[challenge.type]}">
                <div class="ch-type">${challenge.type.toUpperCase()}</div>
                <div class="ch-main">
                    <div class="ch-icon">${challenge.icon}</div>
                    <div class="ch-info">
                        <div class="ch-name">${challenge.name}</div>
                        <div class="ch-desc">${challenge.description}</div>
                    </div>
                </div>
                <div class="ch-progress-bar">
                    <div class="ch-progress-fill" style="width: ${progress}%"></div>
                </div>
                <div class="ch-footer">
                    <span class="ch-progress-text">${challenge.progress} / ${challenge.goal}</span>
                    <span class="ch-time">${hours > 0 ? `${hours}h ` : ''}${mins}m left</span>
                </div>
                <div class="ch-reward">${challenge.reward.name}</div>
                ${challenge.completed && !challenge.claimed ? 
                    `<button class="ch-claim-btn" id="ch-claim-${challenge.id}">Claim Reward!</button>` : ''}
            </div>
        `;
    }
    
    /**
     * Show challenges button
     */
    showChallengesButton(): void {
        document.getElementById('challenges-btn')?.remove();
        
        const active = this.getActiveChallenges().filter(c => !c.claimed);
        const completed = active.filter(c => c.completed).length;
        
        const btn = document.createElement('button');
        btn.id = 'challenges-btn';
        btn.innerHTML = `
            <span>🎯</span>
            <span>${active.length}</span>
            ${completed > 0 ? `<span class="ch-notify">${completed}</span>` : ''}
        `;
        btn.style.cssText = `
            position: fixed;
            top: 240px;
            left: 20px;
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 10px 14px;
            background: rgba(255,255,255,0.05);
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 12px;
            font-weight: 600;
            font-size: 0.8rem;
            color: #fff;
            cursor: pointer;
            z-index: 100;
            transition: all 0.2s;
        `;
        
        // Add notification badge style
        if (!document.getElementById('ch-btn-styles')) {
            const style = document.createElement('style');
            style.id = 'ch-btn-styles';
            style.textContent = `
                .ch-notify {
                    position: absolute;
                    top: -5px;
                    right: -5px;
                    background: #fb7185;
                    color: #fff;
                    font-size: 0.65rem;
                    padding: 2px 6px;
                    border-radius: 10px;
                    animation: pulse 1s ease infinite;
                }
                
                @keyframes pulse {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.1); }
                }
            `;
            document.head.appendChild(style);
        }
        
        btn.addEventListener('click', () => this.showChallengesUI());
        
        document.getElementById('ui')?.appendChild(btn);
    }
    
    /**
     * Add flash popup styles
     */
    private addFlashStyles(): void {
        if (document.getElementById('fcp-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'fcp-styles';
        style.textContent = `
            .flash-challenge-popup {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                z-index: 100000;
                animation: flashPop 0.5s ease;
                cursor: pointer;
            }
            
            @keyframes flashPop {
                from { transform: translate(-50%, -50%) scale(0); }
                50% { transform: translate(-50%, -50%) scale(1.1); }
                to { transform: translate(-50%, -50%) scale(1); }
            }
            
            .fcp-content {
                background: linear-gradient(135deg, #fb7185, #f43f5e);
                border-radius: 20px;
                padding: 24px 40px;
                text-align: center;
                box-shadow: 0 8px 40px rgba(244, 63, 94, 0.5);
            }
            
            .fcp-header {
                font-size: 1rem;
                font-weight: 700;
                color: #fff;
                margin-bottom: 8px;
                animation: flashPulse 0.5s ease infinite;
            }
            
            @keyframes flashPulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.7; }
            }
            
            .fcp-icon {
                font-size: 3rem;
                margin-bottom: 8px;
            }
            
            .fcp-name {
                font-size: 1.2rem;
                font-weight: 600;
                color: #fff;
                margin-bottom: 4px;
            }
            
            .fcp-desc {
                font-size: 0.85rem;
                color: rgba(255,255,255,0.8);
                margin-bottom: 12px;
            }
            
            .fcp-timer {
                font-size: 1.5rem;
                font-weight: 700;
                color: #fbbf24;
                margin-bottom: 8px;
            }
            
            .fcp-reward {
                font-size: 0.8rem;
                color: rgba(255,255,255,0.7);
            }
        `;
        document.head.appendChild(style);
    }
    
    /**
     * Add complete popup styles
     */
    private addCompleteStyles(): void {
        if (document.getElementById('ccp-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'ccp-styles';
        style.textContent = `
            .challenge-complete-popup {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                z-index: 100000;
                animation: ccpPop 0.5s ease;
            }
            
            @keyframes ccpPop {
                from { transform: translate(-50%, -50%) scale(0.5); opacity: 0; }
                to { transform: translate(-50%, -50%) scale(1); opacity: 1; }
            }
            
            .ccp-content {
                background: linear-gradient(135deg, #18181b, #27272a);
                border: 2px solid #6ee7b7;
                border-radius: 20px;
                padding: 32px 48px;
                text-align: center;
                box-shadow: 0 8px 40px rgba(110, 231, 183, 0.3);
            }
            
            .ccp-icon {
                font-size: 4rem;
                margin-bottom: 12px;
            }
            
            .ccp-text {
                font-size: 1.5rem;
                font-weight: 700;
                color: #6ee7b7;
                margin-bottom: 8px;
            }
            
            .ccp-name {
                font-size: 1rem;
                color: #fff;
                margin-bottom: 16px;
            }
            
            .ccp-reward {
                font-size: 1.2rem;
                font-weight: 600;
                color: #fbbf24;
                margin-bottom: 20px;
            }
            
            .ccp-claim {
                background: linear-gradient(135deg, #6ee7b7, #34d399);
                border: none;
                padding: 12px 32px;
                border-radius: 12px;
                font-size: 1rem;
                font-weight: 600;
                color: #000;
                cursor: pointer;
                transition: all 0.2s;
            }
            
            .ccp-claim:hover {
                transform: translateY(-2px);
                box-shadow: 0 8px 20px rgba(110, 231, 183, 0.4);
            }
        `;
        document.head.appendChild(style);
    }
    
    /**
     * Add challenge list styles
     */
    private addChallengeStyles(): void {
        if (document.getElementById('ch-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'ch-styles';
        style.textContent = `
            #challenges-overlay {
                position: fixed;
                inset: 0;
                background: rgba(0,0,0,0.9);
                z-index: 10000;
                display: flex;
                align-items: center;
                justify-content: center;
                animation: fadeIn 0.3s ease;
            }
            
            .ch-container {
                background: #18181b;
                border-radius: 20px;
                width: 90%;
                max-width: 420px;
                max-height: 80vh;
                display: flex;
                flex-direction: column;
                overflow: hidden;
            }
            
            .ch-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 20px;
            }
            
            .ch-header h2 {
                margin: 0;
                font-size: 1.3rem;
                color: #fff;
            }
            
            .ch-close {
                background: none;
                border: none;
                color: rgba(255,255,255,0.5);
                font-size: 1.5rem;
                cursor: pointer;
            }
            
            .ch-list {
                flex: 1;
                overflow-y: auto;
                padding: 0 16px 16px;
            }
            
            .ch-empty {
                text-align: center;
                padding: 40px;
                color: rgba(255,255,255,0.4);
            }
            
            .ch-card {
                background: rgba(255,255,255,0.03);
                border: 1px solid rgba(255,255,255,0.08);
                border-radius: 16px;
                padding: 16px;
                margin-bottom: 12px;
                position: relative;
            }
            
            .ch-card.completed {
                border-color: var(--type-color);
                background: linear-gradient(135deg, transparent, var(--type-color)15);
            }
            
            .ch-type {
                position: absolute;
                top: 12px;
                right: 12px;
                font-size: 0.6rem;
                font-weight: 600;
                color: var(--type-color);
                letter-spacing: 0.1em;
            }
            
            .ch-main {
                display: flex;
                align-items: center;
                gap: 12px;
                margin-bottom: 12px;
            }
            
            .ch-icon {
                font-size: 2rem;
            }
            
            .ch-info {
                flex: 1;
            }
            
            .ch-name {
                font-weight: 600;
                color: #fff;
                font-size: 0.95rem;
            }
            
            .ch-desc {
                font-size: 0.8rem;
                color: rgba(255,255,255,0.5);
            }
            
            .ch-progress-bar {
                height: 6px;
                background: rgba(255,255,255,0.1);
                border-radius: 3px;
                overflow: hidden;
                margin-bottom: 8px;
            }
            
            .ch-progress-fill {
                height: 100%;
                background: var(--type-color);
                border-radius: 3px;
                transition: width 0.3s ease;
            }
            
            .ch-footer {
                display: flex;
                justify-content: space-between;
                font-size: 0.75rem;
                color: rgba(255,255,255,0.4);
            }
            
            .ch-reward {
                margin-top: 8px;
                font-size: 0.8rem;
                color: #fbbf24;
            }
            
            .ch-claim-btn {
                width: 100%;
                margin-top: 12px;
                padding: 10px;
                background: linear-gradient(135deg, var(--type-color), var(--type-color)cc);
                border: none;
                border-radius: 10px;
                font-weight: 600;
                color: #000;
                cursor: pointer;
                animation: pulse 1s ease infinite;
            }
        `;
        document.head.appendChild(style);
    }
}

export const challenges = new ChallengeManager();
