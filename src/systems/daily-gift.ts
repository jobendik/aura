// Daily Cosmic Gift System
// Guaranteed daily reward to bring users back

import { sounds } from '../core/sounds';

// Storage keys
const DAILY_GIFT_KEY = 'aura_daily_gift';
const GIFT_HISTORY_KEY = 'aura_gift_history';

interface DailyGiftState {
    lastClaimDate: string;  // YYYY-MM-DD
    consecutiveDays: number;
    totalClaimed: number;
}

interface GiftReward {
    type: 'xp' | 'cosmetic' | 'boost' | 'mystery_box';
    value: number;
    rarity: 'common' | 'rare' | 'epic' | 'legendary';
    description: string;
    icon: string;
}

// Consecutive day bonuses
const DAY_BONUSES: Record<number, { multiplier: number; guaranteedRarity?: string }> = {
    1: { multiplier: 1 },
    2: { multiplier: 1.2 },
    3: { multiplier: 1.5, guaranteedRarity: 'rare' },
    4: { multiplier: 1.7 },
    5: { multiplier: 2.0, guaranteedRarity: 'rare' },
    6: { multiplier: 2.5 },
    7: { multiplier: 3.0, guaranteedRarity: 'epic' }
};

/**
 * Get current daily gift state
 */
function getGiftState(): DailyGiftState {
    try {
        const saved = localStorage.getItem(DAILY_GIFT_KEY);
        if (saved) {
            return JSON.parse(saved);
        }
    } catch (e) {
        console.warn('Failed to load daily gift state:', e);
    }
    return {
        lastClaimDate: '',
        consecutiveDays: 0,
        totalClaimed: 0
    };
}

/**
 * Save daily gift state
 */
function saveGiftState(state: DailyGiftState): void {
    try {
        localStorage.setItem(DAILY_GIFT_KEY, JSON.stringify(state));
    } catch (e) {
        console.warn('Failed to save daily gift state:', e);
    }
}

/**
 * Get today's date as string
 */
function getTodayString(): string {
    return new Date().toISOString().split('T')[0];
}

/**
 * Check if daily gift is available
 */
export function isDailyGiftAvailable(): boolean {
    const state = getGiftState();
    const today = getTodayString();
    return state.lastClaimDate !== today;
}

/**
 * Get consecutive days count
 */
export function getConsecutiveDays(): number {
    const state = getGiftState();
    return state.consecutiveDays;
}

/**
 * Generate a gift based on current streak
 */
function generateGift(consecutiveDays: number): GiftReward {
    const dayBonus = DAY_BONUSES[Math.min(consecutiveDays, 7)] || DAY_BONUSES[7];

    // Roll for rarity
    let rarity: GiftReward['rarity'] = 'common';
    const roll = Math.random();

    if (dayBonus.guaranteedRarity === 'epic' || roll < 0.05) {
        rarity = 'epic';
    } else if (dayBonus.guaranteedRarity === 'rare' || roll < 0.2) {
        rarity = 'rare';
    } else if (roll < 0.01) {
        rarity = 'legendary';
    }

    // Generate reward based on rarity
    const baseXP = 25;
    let value = Math.floor(baseXP * dayBonus.multiplier);
    let type: GiftReward['type'] = 'xp';
    let icon = '⚡';
    let description = `${value} XP`;

    if (rarity === 'legendary') {
        type = 'mystery_box';
        value = 100;
        icon = '🎁';
        description = 'Mystery Box';
    } else if (rarity === 'epic') {
        type = Math.random() > 0.5 ? 'boost' : 'cosmetic';
        if (type === 'boost') {
            icon = '🚀';
            description = '30min XP Boost';
        } else {
            icon = '✨';
            description = 'Rare Trail Effect';
        }
    } else if (rarity === 'rare') {
        value = Math.floor(value * 1.5);
        icon = '💫';
        description = `${value} XP + Sparkle`;
    }

    return { type, value, rarity, description, icon };
}

/**
 * Claim the daily gift
 */
export function claimDailyGift(): GiftReward | null {
    if (!isDailyGiftAvailable()) {
        return null;
    }

    const state = getGiftState();
    const today = getTodayString();

    // Check if streak continues (claimed yesterday)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    if (state.lastClaimDate === yesterdayStr) {
        state.consecutiveDays++;
    } else if (state.lastClaimDate !== '') {
        // Streak broken
        state.consecutiveDays = 1;
    } else {
        // First time
        state.consecutiveDays = 1;
    }

    state.lastClaimDate = today;
    state.totalClaimed++;

    saveGiftState(state);

    const gift = generateGift(state.consecutiveDays);

    // Record in history
    recordGiftHistory(gift);

    return gift;
}

/**
 * Record gift in history
 */
function recordGiftHistory(gift: GiftReward): void {
    try {
        const history = JSON.parse(localStorage.getItem(GIFT_HISTORY_KEY) || '[]');
        history.unshift({
            ...gift,
            claimedAt: Date.now()
        });
        localStorage.setItem(GIFT_HISTORY_KEY, JSON.stringify(history.slice(0, 30))); // Keep 30 days
    } catch (e) {
        console.warn('Failed to record gift history:', e);
    }
}

/**
 * Show daily gift popup
 */
export function showDailyGiftPopup(onClaim: () => void): void {
    if (!isDailyGiftAvailable()) return;

    const consecutiveDays = getConsecutiveDays() + 1;
    const dayBonus = DAY_BONUSES[Math.min(consecutiveDays, 7)] || DAY_BONUSES[7];

    // Create popup
    const popup = document.createElement('div');
    popup.id = 'daily-gift-popup';
    popup.className = 'daily-gift-popup';
    popup.innerHTML = `
        <div class="daily-gift-content">
            <div class="daily-gift-icon">🎁</div>
            <div class="daily-gift-title">Daily Cosmic Gift!</div>
            <div class="daily-gift-streak">
                ${consecutiveDays > 1 ? `🔥 ${consecutiveDays} Day Streak!` : 'Day 1'}
            </div>
            <div class="daily-gift-bonus">
                ${dayBonus.multiplier}x Bonus
                ${dayBonus.guaranteedRarity ? `+ Guaranteed ${dayBonus.guaranteedRarity}!` : ''}
            </div>
            <button class="daily-gift-claim" id="claim-daily-gift">✨ Claim Gift ✨</button>
            <button class="daily-gift-later" id="later-daily-gift">Later</button>
        </div>
    `;

    document.body.appendChild(popup);

    // Add styles
    if (!document.getElementById('daily-gift-style')) {
        const style = document.createElement('style');
        style.id = 'daily-gift-style';
        style.textContent = `
            .daily-gift-popup {
                position: fixed;
                inset: 0;
                display: flex;
                align-items: center;
                justify-content: center;
                background: rgba(0, 0, 0, 0.75);
                backdrop-filter: blur(8px);
                z-index: 800;
                animation: fade-in 0.3s ease;
            }
            
            @keyframes fade-in {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            
            .daily-gift-content {
                text-align: center;
                padding: 32px 40px;
                background: linear-gradient(135deg, rgba(30, 35, 50, 0.95), rgba(20, 25, 40, 0.95));
                border: 2px solid rgba(251, 191, 36, 0.4);
                border-radius: 24px;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5), 0 0 40px rgba(251, 191, 36, 0.2);
                animation: pop-in 0.4s ease;
            }
            
            @keyframes pop-in {
                0% { transform: scale(0.5); opacity: 0; }
                70% { transform: scale(1.05); }
                100% { transform: scale(1); opacity: 1; }
            }
            
            .daily-gift-icon {
                font-size: 4rem;
                margin-bottom: 16px;
                animation: gift-bounce 1s ease-in-out infinite;
            }
            
            @keyframes gift-bounce {
                0%, 100% { transform: translateY(0); }
                50% { transform: translateY(-10px); }
            }
            
            .daily-gift-title {
                font-size: 1.8rem;
                font-weight: 700;
                color: white;
                margin-bottom: 8px;
            }
            
            .daily-gift-streak {
                font-size: 1.2rem;
                color: var(--amber);
                margin-bottom: 4px;
            }
            
            .daily-gift-bonus {
                font-size: 0.9rem;
                color: var(--text-secondary);
                margin-bottom: 24px;
            }
            
            .daily-gift-claim {
                display: block;
                width: 100%;
                padding: 14px 32px;
                background: linear-gradient(135deg, var(--amber), var(--coral));
                border: none;
                border-radius: 12px;
                font-size: 1.1rem;
                font-weight: 600;
                color: white;
                cursor: pointer;
                margin-bottom: 12px;
                transition: all 0.2s ease;
            }
            
            .daily-gift-claim:hover {
                transform: scale(1.05);
                box-shadow: 0 5px 20px rgba(251, 191, 36, 0.4);
            }
            
            .daily-gift-later {
                background: none;
                border: none;
                color: var(--text-muted);
                font-size: 0.85rem;
                cursor: pointer;
            }
            
            .daily-gift-later:hover {
                color: var(--text-secondary);
            }
        `;
        document.head.appendChild(style);
    }

    // Event handlers
    document.getElementById('claim-daily-gift')?.addEventListener('click', () => {
        const gift = claimDailyGift();
        if (gift) {
            sounds.play(`gift_collect_${gift.rarity}` as any);
            showGiftReveal(gift);
        }
        popup.remove();
        onClaim();
    });

    document.getElementById('later-daily-gift')?.addEventListener('click', () => {
        popup.remove();
    });
}

/**
 * Show gift reveal animation
 */
function showGiftReveal(gift: GiftReward): void {
    const reveal = document.createElement('div');
    reveal.className = 'gift-reveal';
    reveal.innerHTML = `
        <div class="gift-reveal-content">
            <div class="gift-reveal-icon ${gift.rarity}">${gift.icon}</div>
            <div class="gift-reveal-rarity">${gift.rarity.toUpperCase()}</div>
            <div class="gift-reveal-description">${gift.description}</div>
        </div>
    `;

    document.body.appendChild(reveal);

    // Add styles
    if (!document.getElementById('gift-reveal-style')) {
        const style = document.createElement('style');
        style.id = 'gift-reveal-style';
        style.textContent = `
            .gift-reveal {
                position: fixed;
                inset: 0;
                display: flex;
                align-items: center;
                justify-content: center;
                background: rgba(0, 0, 0, 0.8);
                z-index: 850;
                animation: fade-in 0.2s ease;
            }
            
            .gift-reveal-content {
                text-align: center;
                animation: reveal-pop 0.5s ease;
            }
            
            @keyframes reveal-pop {
                0% { transform: scale(0) rotate(-180deg); opacity: 0; }
                60% { transform: scale(1.2) rotate(10deg); }
                100% { transform: scale(1) rotate(0deg); opacity: 1; }
            }
            
            .gift-reveal-icon {
                font-size: 6rem;
                margin-bottom: 16px;
            }
            
            .gift-reveal-icon.legendary {
                animation: legendary-glow 1s ease-in-out infinite alternate;
            }
            
            @keyframes legendary-glow {
                from { filter: drop-shadow(0 0 20px rgba(251, 191, 36, 0.5)); }
                to { filter: drop-shadow(0 0 40px rgba(251, 191, 36, 0.8)); }
            }
            
            .gift-reveal-rarity {
                font-size: 1rem;
                font-weight: 700;
                letter-spacing: 0.2em;
                margin-bottom: 8px;
            }
            
            .gift-reveal-rarity:has(+ .gift-reveal-description) { color: var(--text-secondary); }
            
            .gift-reveal-content:has(.legendary) .gift-reveal-rarity { color: var(--amber); }
            .gift-reveal-content:has(.epic) .gift-reveal-rarity { color: var(--lavender); }
            .gift-reveal-content:has(.rare) .gift-reveal-rarity { color: var(--accent); }
            
            .gift-reveal-description {
                font-size: 1.5rem;
                font-weight: 600;
                color: white;
            }
        `;
        document.head.appendChild(style);
    }

    // Auto-close after 2.5s
    setTimeout(() => {
        reveal.style.opacity = '0';
        setTimeout(() => reveal.remove(), 300);
    }, 2500);
}

/**
 * Initialize daily gift system - show popup on login if available
 */
export function initDailyGiftSystem(): void {
    // Show popup after a short delay (let user settle in)
    if (isDailyGiftAvailable()) {
        setTimeout(() => {
            showDailyGiftPopup(() => {
                console.log('Daily gift claimed!');
            });
        }, 3000);
    }
}
