// Addiction Mechanics System
// Core psychological engagement mechanisms for maximum retention

import { EventBus } from './EventBus';

// ===== TYPES =====

export interface StreakData {
    currentStreak: number;
    longestStreak: number;
    lastVisit: number;  // Timestamp
    streakProtected: boolean;  // One-time protection available
}

export interface CosmicGift {
    id: string;
    type: 'xp' | 'cosmetic' | 'mystery' | 'boost';
    rarity: 'common' | 'rare' | 'epic' | 'legendary';
    value: number;
    x: number;
    y: number;
    expiresAt: number;
    collected: boolean;
}

export interface MysteryEncounter {
    id: string;
    type: 'legendary_soul' | 'cosmic_wanderer' | 'ancient_echo' | 'star_child';
    name: string;
    x: number;
    y: number;
    hue: number;
    rarity: 'rare' | 'epic' | 'legendary';
    spawnedAt: number;
    duration: number;  // How long they stay
}

export interface PendingInteraction {
    id: string;
    fromId: string;
    fromName: string;
    type: 'wave' | 'gift' | 'whisper_attempt' | 'bond_request';
    timestamp: number;
    read: boolean;
}

// ===== CONSTANTS =====

const STREAK_RESET_HOURS = 36;  // Give some buffer beyond 24h
const GIFT_SPAWN_INTERVAL = 45000;  // 45 seconds
const GIFT_SPAWN_CHANCE = 0.3;  // 30% chance per interval
const GIFT_LIFETIME = 30000;  // 30 seconds to collect
const MYSTERY_SPAWN_INTERVAL = 120000;  // 2 minutes
const MYSTERY_SPAWN_CHANCE = 0.15;  // 15% chance
const MYSTERY_DURATION = 60000;  // 1 minute presence

const GIFT_RARITIES = {
    common: { chance: 0.6, xpMultiplier: 1 },
    rare: { chance: 0.25, xpMultiplier: 2 },
    epic: { chance: 0.12, xpMultiplier: 5 },
    legendary: { chance: 0.03, xpMultiplier: 15 }
};

const MYSTERY_TYPES = [
    { type: 'legendary_soul', name: 'Legendary Soul', weight: 0.4, rarity: 'rare' as const },
    { type: 'cosmic_wanderer', name: 'Cosmic Wanderer', weight: 0.35, rarity: 'epic' as const },
    { type: 'ancient_echo', name: 'Ancient Echo', weight: 0.2, rarity: 'epic' as const },
    { type: 'star_child', name: 'Star Child', weight: 0.05, rarity: 'legendary' as const }
];

const STREAK_BONUSES = [
    { days: 1, multiplier: 1.0, title: 'First Light' },
    { days: 3, multiplier: 1.2, title: 'Rising Star' },
    { days: 7, multiplier: 1.5, title: 'Weekly Voyager' },
    { days: 14, multiplier: 2.0, title: 'Cosmic Regular' },
    { days: 30, multiplier: 3.0, title: 'Monthly Legend' },
    { days: 100, multiplier: 5.0, title: 'Eternal Flame' }
];

// ===== STORAGE KEYS =====
const STORAGE_KEYS = {
    STREAK: 'aura_streak_data',
    PENDING: 'aura_pending_interactions',
    GIFTS_COLLECTED: 'aura_gifts_collected_today',
    LAST_GIFT_SPAWN: 'aura_last_gift_spawn'
};

// ===== ADDICTION MANAGER =====

class AddictionManager {
    private streak: StreakData;
    private gifts: CosmicGift[] = [];
    private mysteryEncounters: MysteryEncounter[] = [];
    private pendingInteractions: PendingInteraction[] = [];
    private giftSpawnTimer: number | null = null;
    private mysterySpawnTimer: number | null = null;
    private playerX: number = 0;
    private playerY: number = 0;

    constructor() {
        this.streak = this.loadStreak();
        this.pendingInteractions = this.loadPendingInteractions();
        this.updateStreak();
    }

    // ===== STREAK SYSTEM =====

    private loadStreak(): StreakData {
        try {
            const saved = localStorage.getItem(STORAGE_KEYS.STREAK);
            if (saved) {
                return JSON.parse(saved);
            }
        } catch (e) {
            console.warn('Failed to load streak data:', e);
        }
        return {
            currentStreak: 0,
            longestStreak: 0,
            lastVisit: 0,
            streakProtected: true
        };
    }

    private saveStreak(): void {
        try {
            localStorage.setItem(STORAGE_KEYS.STREAK, JSON.stringify(this.streak));
        } catch (e) {
            console.warn('Failed to save streak data:', e);
        }
    }

    private updateStreak(): void {
        const now = Date.now();
        const hoursSinceLastVisit = (now - this.streak.lastVisit) / (1000 * 60 * 60);

        if (this.streak.lastVisit === 0) {
            // First ever visit
            this.streak.currentStreak = 1;
            this.streak.lastVisit = now;
            EventBus.emit('addiction:firstVisit');
        } else if (hoursSinceLastVisit >= 24 && hoursSinceLastVisit < STREAK_RESET_HOURS) {
            // Valid new day visit - increment streak!
            this.streak.currentStreak++;
            this.streak.lastVisit = now;
            EventBus.emit('addiction:streakIncreased', {
                streak: this.streak.currentStreak,
                bonus: this.getStreakBonus()
            });
        } else if (hoursSinceLastVisit >= STREAK_RESET_HOURS) {
            // Streak broken!
            if (this.streak.streakProtected && this.streak.currentStreak > 3) {
                // Use protection!
                this.streak.streakProtected = false;
                this.streak.lastVisit = now;
                EventBus.emit('addiction:streakProtected', { streak: this.streak.currentStreak });
            } else {
                // Streak lost
                const lostStreak = this.streak.currentStreak;
                this.streak.currentStreak = 1;
                this.streak.lastVisit = now;
                EventBus.emit('addiction:streakLost', { lostStreak });
            }
        }
        // else: Same day, no change

        // Update longest streak record
        if (this.streak.currentStreak > this.streak.longestStreak) {
            this.streak.longestStreak = this.streak.currentStreak;
        }

        this.saveStreak();
    }

    getStreakBonus(): { multiplier: number; title: string } {
        for (let i = STREAK_BONUSES.length - 1; i >= 0; i--) {
            if (this.streak.currentStreak >= STREAK_BONUSES[i].days) {
                return STREAK_BONUSES[i];
            }
        }
        return { multiplier: 1.0, title: 'New Explorer' };
    }

    getStreak(): StreakData {
        return { ...this.streak };
    }

    // ===== COSMIC GIFTS (Variable Rewards) =====

    startGiftSpawning(getPlayerPosition: () => { x: number; y: number }): void {
        if (this.giftSpawnTimer) return;

        this.giftSpawnTimer = window.setInterval(() => {
            const pos = getPlayerPosition();
            this.playerX = pos.x;
            this.playerY = pos.y;
            this.trySpawnGift();
            this.cleanupExpiredGifts();
        }, GIFT_SPAWN_INTERVAL);
    }

    stopGiftSpawning(): void {
        if (this.giftSpawnTimer) {
            clearInterval(this.giftSpawnTimer);
            this.giftSpawnTimer = null;
        }
    }

    private trySpawnGift(): void {
        if (this.gifts.length >= 3) return;  // Max 3 active gifts
        if (Math.random() > GIFT_SPAWN_CHANCE) return;

        const rarity = this.rollRarity();
        const angle = Math.random() * Math.PI * 2;
        const distance = 150 + Math.random() * 300;  // 150-450 units away

        const gift: CosmicGift = {
            id: `gift-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type: this.getGiftType(rarity),
            rarity,
            value: this.getGiftValue(rarity),
            x: this.playerX + Math.cos(angle) * distance,
            y: this.playerY + Math.sin(angle) * distance,
            expiresAt: Date.now() + GIFT_LIFETIME,
            collected: false
        };

        this.gifts.push(gift);
        EventBus.emit('addiction:giftSpawned', { gift });
    }

    private rollRarity(): CosmicGift['rarity'] {
        const roll = Math.random();
        let cumulative = 0;
        for (const [rarity, data] of Object.entries(GIFT_RARITIES)) {
            cumulative += data.chance;
            if (roll <= cumulative) {
                return rarity as CosmicGift['rarity'];
            }
        }
        return 'common';
    }

    private getGiftType(rarity: CosmicGift['rarity']): CosmicGift['type'] {
        if (rarity === 'legendary') return 'mystery';
        if (rarity === 'epic') return Math.random() > 0.5 ? 'boost' : 'cosmetic';
        if (rarity === 'rare') return Math.random() > 0.7 ? 'cosmetic' : 'xp';
        return 'xp';
    }

    private getGiftValue(rarity: CosmicGift['rarity']): number {
        const base = 10;
        return Math.floor(base * GIFT_RARITIES[rarity].xpMultiplier * this.getStreakBonus().multiplier);
    }

    private cleanupExpiredGifts(): void {
        const now = Date.now();
        const expired = this.gifts.filter(g => g.expiresAt <= now && !g.collected);
        this.gifts = this.gifts.filter(g => g.expiresAt > now || g.collected);

        for (const gift of expired) {
            EventBus.emit('addiction:giftExpired', { gift });
        }
    }

    collectGift(giftId: string): CosmicGift | null {
        const gift = this.gifts.find(g => g.id === giftId && !g.collected);
        if (!gift) return null;

        gift.collected = true;
        EventBus.emit('addiction:giftCollected', { gift });

        // Remove after a short delay for animation
        setTimeout(() => {
            this.gifts = this.gifts.filter(g => g.id !== giftId);
        }, 500);

        return gift;
    }

    getActiveGifts(): CosmicGift[] {
        return this.gifts.filter(g => !g.collected && g.expiresAt > Date.now());
    }

    // ===== MYSTERY ENCOUNTERS =====

    startMysterySpawning(): void {
        if (this.mysterySpawnTimer) return;

        this.mysterySpawnTimer = window.setInterval(() => {
            this.trySpawnMystery();
            this.cleanupExpiredMysteries();
        }, MYSTERY_SPAWN_INTERVAL);
    }

    stopMysterySpawning(): void {
        if (this.mysterySpawnTimer) {
            clearInterval(this.mysterySpawnTimer);
            this.mysterySpawnTimer = null;
        }
    }

    private trySpawnMystery(): void {
        if (this.mysteryEncounters.length >= 1) return;  // Max 1 mystery at a time
        if (Math.random() > MYSTERY_SPAWN_CHANCE) return;

        const mysteryType = this.rollMysteryType();
        const distance = 400 + Math.random() * 600;
        const angle = Math.random() * Math.PI * 2;

        const mystery: MysteryEncounter = {
            id: `mystery-${Date.now()}`,
            type: mysteryType.type as MysteryEncounter['type'],
            name: mysteryType.name,
            x: this.playerX + Math.cos(angle) * distance,
            y: this.playerY + Math.sin(angle) * distance,
            hue: Math.random() * 360,
            rarity: mysteryType.rarity,
            spawnedAt: Date.now(),
            duration: MYSTERY_DURATION
        };

        this.mysteryEncounters.push(mystery);
        EventBus.emit('addiction:mysterySpawned', { mystery });
    }

    private rollMysteryType(): typeof MYSTERY_TYPES[0] {
        const totalWeight = MYSTERY_TYPES.reduce((sum, t) => sum + t.weight, 0);
        let roll = Math.random() * totalWeight;

        for (const type of MYSTERY_TYPES) {
            roll -= type.weight;
            if (roll <= 0) return type;
        }
        return MYSTERY_TYPES[0];
    }

    private cleanupExpiredMysteries(): void {
        const now = Date.now();
        const expired = this.mysteryEncounters.filter(
            m => now - m.spawnedAt >= m.duration
        );
        this.mysteryEncounters = this.mysteryEncounters.filter(
            m => now - m.spawnedAt < m.duration
        );

        for (const mystery of expired) {
            EventBus.emit('addiction:mysteryDeparted', { mystery });
        }
    }

    getMysteryEncounters(): MysteryEncounter[] {
        return [...this.mysteryEncounters];
    }

    // ===== SOCIAL RECIPROCITY =====

    private loadPendingInteractions(): PendingInteraction[] {
        try {
            const saved = localStorage.getItem(STORAGE_KEYS.PENDING);
            if (saved) {
                return JSON.parse(saved);
            }
        } catch (e) {
            console.warn('Failed to load pending interactions:', e);
        }
        return [];
    }

    private savePendingInteractions(): void {
        try {
            localStorage.setItem(STORAGE_KEYS.PENDING, JSON.stringify(this.pendingInteractions));
        } catch (e) {
            console.warn('Failed to save pending interactions:', e);
        }
    }

    addPendingInteraction(interaction: Omit<PendingInteraction, 'id' | 'read'>): void {
        const pending: PendingInteraction = {
            ...interaction,
            id: `pending-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            read: false
        };

        this.pendingInteractions.push(pending);
        this.savePendingInteractions();

        EventBus.emit('addiction:pendingAdded', { interaction: pending });
    }

    getPendingInteractions(): PendingInteraction[] {
        return this.pendingInteractions.filter(p => !p.read);
    }

    markInteractionRead(id: string): void {
        const interaction = this.pendingInteractions.find(p => p.id === id);
        if (interaction) {
            interaction.read = true;
            this.savePendingInteractions();
        }
    }

    clearOldInteractions(): void {
        const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
        this.pendingInteractions = this.pendingInteractions.filter(
            p => p.timestamp > oneDayAgo
        );
        this.savePendingInteractions();
    }

    // ===== UTILITY =====

    updatePlayerPosition(x: number, y: number): void {
        this.playerX = x;
        this.playerY = y;
    }

    destroy(): void {
        this.stopGiftSpawning();
        this.stopMysterySpawning();
    }
}

// Singleton export
export const addictionManager = new AddictionManager();
