// Rare Cosmetics System
// Artificial scarcity with collectible items and drop rates

import { EventBus } from './EventBus';

export interface Cosmetic {
    id: string;
    name: string;
    description: string;
    icon: string;
    category: 'aura' | 'trail' | 'badge' | 'title' | 'effect';
    rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic';
    dropRate: number; // 0-1, lower = rarer
    source: 'spin' | 'achievement' | 'event' | 'drop' | 'streak' | 'level';
    requirements?: {
        level?: number;
        streak?: number;
        achievement?: string;
    };
}

// All available cosmetics
export const COSMETICS: Cosmetic[] = [
    // Auras (glow effects)
    { id: 'aura_default', name: 'Standard Glow', description: 'The default aura', icon: '✨', category: 'aura', rarity: 'common', dropRate: 1, source: 'level' },
    { id: 'aura_shimmer', name: 'Shimmer', description: 'A gentle shimmering effect', icon: '💫', category: 'aura', rarity: 'uncommon', dropRate: 0.15, source: 'drop' },
    { id: 'aura_pulse', name: 'Heartbeat', description: 'Pulsing aura that beats like a heart', icon: '💗', category: 'aura', rarity: 'rare', dropRate: 0.08, source: 'drop' },
    { id: 'aura_flame', name: 'Sacred Flame', description: 'Ethereal flames surround you', icon: '🔥', category: 'aura', rarity: 'rare', dropRate: 0.06, source: 'streak', requirements: { streak: 14 } },
    { id: 'aura_void', name: 'Void Walker', description: 'Darkness follows in your wake', icon: '🌑', category: 'aura', rarity: 'epic', dropRate: 0.03, source: 'achievement' },
    { id: 'aura_rainbow', name: 'Prismatic', description: 'All colors of the spectrum', icon: '🌈', category: 'aura', rarity: 'epic', dropRate: 0.02, source: 'spin' },
    { id: 'aura_cosmic', name: 'Cosmic Entity', description: 'Stars orbit around you', icon: '🌌', category: 'aura', rarity: 'legendary', dropRate: 0.005, source: 'drop' },
    { id: 'aura_divine', name: 'Divine Light', description: 'Blessed by the cosmos itself', icon: '👼', category: 'aura', rarity: 'mythic', dropRate: 0.001, source: 'event' },
    
    // Trails (movement effects)
    { id: 'trail_sparkle', name: 'Sparkle Trail', description: 'Leave sparkles as you drift', icon: '✨', category: 'trail', rarity: 'common', dropRate: 0.3, source: 'level', requirements: { level: 3 } },
    { id: 'trail_stardust', name: 'Stardust', description: 'Trail of cosmic dust', icon: '🌟', category: 'trail', rarity: 'uncommon', dropRate: 0.12, source: 'drop' },
    { id: 'trail_hearts', name: 'Love Trail', description: 'Hearts follow your path', icon: '💕', category: 'trail', rarity: 'rare', dropRate: 0.05, source: 'achievement' },
    { id: 'trail_lightning', name: 'Lightning', description: 'Electric energy trails behind', icon: '⚡', category: 'trail', rarity: 'epic', dropRate: 0.02, source: 'spin' },
    { id: 'trail_galaxy', name: 'Galaxy Trail', description: 'A miniature galaxy follows you', icon: '🌀', category: 'trail', rarity: 'legendary', dropRate: 0.003, source: 'drop' },
    
    // Badges (displayed on profile)
    { id: 'badge_pioneer', name: 'Pioneer', description: 'Early explorer of the cosmos', icon: '🚀', category: 'badge', rarity: 'rare', dropRate: 0, source: 'event' },
    { id: 'badge_beloved', name: 'Beloved', description: 'Made 100 connections', icon: '💝', category: 'badge', rarity: 'epic', dropRate: 0, source: 'achievement' },
    { id: 'badge_eternal', name: 'Eternal', description: '100 day streak achieved', icon: '♾️', category: 'badge', rarity: 'legendary', dropRate: 0, source: 'streak', requirements: { streak: 100 } },
    { id: 'badge_legend', name: 'Living Legend', description: 'Reached level 50', icon: '👑', category: 'badge', rarity: 'mythic', dropRate: 0, source: 'level', requirements: { level: 50 } },
    
    // Titles (displayed with name)
    { id: 'title_wanderer', name: 'The Wanderer', description: 'Default title', icon: '🌍', category: 'title', rarity: 'common', dropRate: 1, source: 'level' },
    { id: 'title_seeker', name: 'Soul Seeker', description: 'Found 50 players', icon: '🔍', category: 'title', rarity: 'uncommon', dropRate: 0, source: 'achievement' },
    { id: 'title_singer', name: 'Cosmic Singer', description: 'Sang 1000 times', icon: '🎵', category: 'title', rarity: 'rare', dropRate: 0, source: 'achievement' },
    { id: 'title_guardian', name: 'Guardian', description: 'Protected 10 bonds', icon: '🛡️', category: 'title', rarity: 'epic', dropRate: 0, source: 'achievement' },
    { id: 'title_celestial', name: 'Celestial Being', description: 'Transcended mortality', icon: '⭐', category: 'title', rarity: 'legendary', dropRate: 0.001, source: 'drop' },
    
    // Effects (special visual effects)
    { id: 'effect_glow', name: 'Soft Glow', description: 'Gentle ambient glow', icon: '💡', category: 'effect', rarity: 'common', dropRate: 0.25, source: 'level', requirements: { level: 2 } },
    { id: 'effect_sparkle', name: 'Occasional Sparkle', description: 'Random sparkle bursts', icon: '✨', category: 'effect', rarity: 'uncommon', dropRate: 0.1, source: 'drop' },
    { id: 'effect_orbit', name: 'Orbiting Stars', description: 'Tiny stars orbit you', icon: '🌟', category: 'effect', rarity: 'rare', dropRate: 0.04, source: 'spin' },
    { id: 'effect_halo', name: 'Halo', description: 'A glowing halo above', icon: '😇', category: 'effect', rarity: 'epic', dropRate: 0.015, source: 'streak', requirements: { streak: 30 } },
    { id: 'effect_crown', name: 'Cosmic Crown', description: 'A crown of stars', icon: '👑', category: 'effect', rarity: 'legendary', dropRate: 0.002, source: 'drop' },
    { id: 'effect_wings', name: 'Ethereal Wings', description: 'Wings of pure light', icon: '🪽', category: 'effect', rarity: 'mythic', dropRate: 0.0005, source: 'event' },
];

const RARITY_COLORS = {
    common: '#71717a',
    uncommon: '#6ee7b7',
    rare: '#7dd3fc',
    epic: '#c4b5fd',
    legendary: '#fbbf24',
    mythic: '#f472b6'
};

const STORAGE_KEY = 'aura_unlocked_cosmetics';
const EQUIPPED_KEY = 'aura_equipped_cosmetics';

class CosmeticsManager {
    private unlocked: Set<string>;
    private equipped: Map<string, string>; // category -> cosmeticId
    
    constructor() {
        this.unlocked = this.loadUnlocked();
        this.equipped = this.loadEquipped();
        
        // Listen for cosmetic unlock events
        EventBus.on('cosmetic:unlocked', (data) => {
            this.unlock(data.cosmeticId);
        });
    }
    
    private loadUnlocked(): Set<string> {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                return new Set(JSON.parse(saved));
            }
        } catch (e) {}
        
        // Default unlocked cosmetics
        return new Set(['aura_default', 'title_wanderer']);
    }
    
    private loadEquipped(): Map<string, string> {
        try {
            const saved = localStorage.getItem(EQUIPPED_KEY);
            if (saved) {
                return new Map(Object.entries(JSON.parse(saved)));
            }
        } catch (e) {}
        
        return new Map([
            ['aura', 'aura_default'],
            ['title', 'title_wanderer']
        ]);
    }
    
    private save(): void {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([...this.unlocked]));
        localStorage.setItem(EQUIPPED_KEY, JSON.stringify(Object.fromEntries(this.equipped)));
    }
    
    /**
     * Unlock a cosmetic
     */
    unlock(cosmeticId: string): boolean {
        const cosmetic = COSMETICS.find(c => c.id === cosmeticId);
        if (!cosmetic || this.unlocked.has(cosmeticId)) {
            return false;
        }
        
        this.unlocked.add(cosmeticId);
        this.save();
        
        // Show unlock notification
        this.showUnlockNotification(cosmetic);
        
        return true;
    }
    
    /**
     * Try to get a random drop
     */
    tryRandomDrop(): Cosmetic | null {
        // Filter to only droppable cosmetics that aren't unlocked
        const droppable = COSMETICS.filter(c => 
            c.source === 'drop' && 
            c.dropRate > 0 && 
            !this.unlocked.has(c.id)
        );
        
        if (droppable.length === 0) return null;
        
        // Roll for each cosmetic
        for (const cosmetic of droppable) {
            if (Math.random() < cosmetic.dropRate) {
                this.unlock(cosmetic.id);
                return cosmetic;
            }
        }
        
        return null;
    }
    
    /**
     * Equip a cosmetic
     */
    equip(cosmeticId: string): boolean {
        if (!this.unlocked.has(cosmeticId)) return false;
        
        const cosmetic = COSMETICS.find(c => c.id === cosmeticId);
        if (!cosmetic) return false;
        
        this.equipped.set(cosmetic.category, cosmeticId);
        this.save();
        
        EventBus.emit('cosmetic:equipped', { category: cosmetic.category, cosmeticId });
        
        return true;
    }
    
    /**
     * Get equipped cosmetic for category
     */
    getEquipped(category: string): Cosmetic | null {
        const id = this.equipped.get(category);
        if (!id) return null;
        return COSMETICS.find(c => c.id === id) || null;
    }
    
    /**
     * Get all unlocked cosmetics
     */
    getUnlocked(): Cosmetic[] {
        return COSMETICS.filter(c => this.unlocked.has(c.id));
    }
    
    /**
     * Get all cosmetics (for display)
     */
    getAllCosmetics(): Cosmetic[] {
        return COSMETICS;
    }
    
    /**
     * Check if cosmetic is unlocked
     */
    isUnlocked(cosmeticId: string): boolean {
        return this.unlocked.has(cosmeticId);
    }
    
    /**
     * Show unlock notification
     */
    private showUnlockNotification(cosmetic: Cosmetic): void {
        EventBus.emit('ui:toast', { message: `Unlocked: ${cosmetic.name}!`, type: cosmetic.rarity });
        
        const popup = document.createElement('div');
        popup.className = 'cosmetic-unlock-popup';
        popup.innerHTML = `
            <div class="cup-content" style="border-color: ${RARITY_COLORS[cosmetic.rarity]}40">
                <div class="cup-rarity" style="color: ${RARITY_COLORS[cosmetic.rarity]}">${cosmetic.rarity.toUpperCase()}</div>
                <div class="cup-icon">${cosmetic.icon}</div>
                <div class="cup-name">${cosmetic.name}</div>
                <div class="cup-desc">${cosmetic.description}</div>
                <div class="cup-category">${cosmetic.category}</div>
            </div>
        `;
        
        document.body.appendChild(popup);
        this.addPopupStyles();
        
        setTimeout(() => {
            popup.style.opacity = '0';
            setTimeout(() => popup.remove(), 300);
        }, 4000);
    }
    
    /**
     * Show cosmetics gallery
     */
    showGallery(): void {
        const overlay = document.createElement('div');
        overlay.id = 'cosmetics-gallery';
        
        const categories = ['aura', 'trail', 'badge', 'title', 'effect'];
        
        overlay.innerHTML = `
            <div class="gallery-container">
                <div class="gallery-header">
                    <h2>✨ Cosmetics Collection</h2>
                    <button class="gallery-close" id="gallery-close">×</button>
                </div>
                <div class="gallery-stats">
                    <span>Collected: ${this.unlocked.size} / ${COSMETICS.length}</span>
                    <span class="gallery-percent">${Math.round(this.unlocked.size / COSMETICS.length * 100)}%</span>
                </div>
                <div class="gallery-tabs">
                    ${categories.map(cat => `
                        <button class="gallery-tab" data-cat="${cat}">${cat}</button>
                    `).join('')}
                </div>
                <div class="gallery-grid" id="gallery-grid">
                    ${COSMETICS.map(c => this.renderCosmeticCard(c)).join('')}
                </div>
            </div>
        `;
        
        document.body.appendChild(overlay);
        this.addGalleryStyles();
        
        // Close button
        document.getElementById('gallery-close')?.addEventListener('click', () => {
            overlay.remove();
        });
        
        // Tab filtering
        overlay.querySelectorAll('.gallery-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const cat = (tab as HTMLElement).dataset.cat;
                overlay.querySelectorAll('.gallery-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                overlay.querySelectorAll('.cosmetic-card').forEach(card => {
                    const cardCat = (card as HTMLElement).dataset.category;
                    (card as HTMLElement).style.display = cardCat === cat ? 'block' : 'none';
                });
            });
        });
        
        // Equip on click
        overlay.querySelectorAll('.cosmetic-card.unlocked').forEach(card => {
            card.addEventListener('click', () => {
                const id = (card as HTMLElement).dataset.id;
                if (id) {
                    this.equip(id);
                    // Update equipped indicator
                    overlay.querySelectorAll('.cosmetic-card').forEach(c => c.classList.remove('equipped'));
                    card.classList.add('equipped');
                }
            });
        });
    }
    
    /**
     * Render a cosmetic card
     */
    private renderCosmeticCard(cosmetic: Cosmetic): string {
        const unlocked = this.unlocked.has(cosmetic.id);
        const equipped = this.equipped.get(cosmetic.category) === cosmetic.id;
        
        return `
            <div class="cosmetic-card ${unlocked ? 'unlocked' : 'locked'} ${equipped ? 'equipped' : ''}" 
                 data-id="${cosmetic.id}" 
                 data-category="${cosmetic.category}"
                 style="--rarity-color: ${RARITY_COLORS[cosmetic.rarity]}">
                <div class="cc-rarity">${cosmetic.rarity}</div>
                <div class="cc-icon">${unlocked ? cosmetic.icon : '❓'}</div>
                <div class="cc-name">${unlocked ? cosmetic.name : '???'}</div>
                ${unlocked ? '' : `<div class="cc-source">${this.getSourceText(cosmetic)}</div>`}
                ${equipped ? '<div class="cc-equipped">EQUIPPED</div>' : ''}
            </div>
        `;
    }
    
    /**
     * Get source text for locked cosmetic
     */
    private getSourceText(cosmetic: Cosmetic): string {
        switch (cosmetic.source) {
            case 'spin': return '🎰 Daily Spin';
            case 'achievement': return '🏆 Achievement';
            case 'event': return '🎉 Limited Event';
            case 'drop': return `💎 ${(cosmetic.dropRate * 100).toFixed(2)}% drop`;
            case 'streak': return `🔥 ${cosmetic.requirements?.streak} day streak`;
            case 'level': return `⭐ Level ${cosmetic.requirements?.level}`;
            default: return '';
        }
    }
    
    /**
     * Add popup styles
     */
    private addPopupStyles(): void {
        if (document.getElementById('cup-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'cup-styles';
        style.textContent = `
            .cosmetic-unlock-popup {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                z-index: 100000;
                animation: cupPop 0.5s ease;
                transition: opacity 0.3s ease;
            }
            
            @keyframes cupPop {
                from { transform: translate(-50%, -50%) scale(0.5); opacity: 0; }
                to { transform: translate(-50%, -50%) scale(1); opacity: 1; }
            }
            
            .cup-content {
                background: linear-gradient(135deg, #18181b, #27272a);
                border: 2px solid;
                border-radius: 20px;
                padding: 32px;
                text-align: center;
                min-width: 250px;
            }
            
            .cup-rarity {
                font-size: 0.7rem;
                font-weight: 700;
                letter-spacing: 0.15em;
                margin-bottom: 12px;
            }
            
            .cup-icon {
                font-size: 4rem;
                margin-bottom: 12px;
            }
            
            .cup-name {
                font-size: 1.3rem;
                font-weight: 600;
                color: #fff;
                margin-bottom: 8px;
            }
            
            .cup-desc {
                font-size: 0.85rem;
                color: rgba(255,255,255,0.6);
                margin-bottom: 8px;
            }
            
            .cup-category {
                font-size: 0.7rem;
                color: rgba(255,255,255,0.4);
                text-transform: uppercase;
            }
        `;
        document.head.appendChild(style);
    }
    
    /**
     * Add gallery styles
     */
    private addGalleryStyles(): void {
        if (document.getElementById('gallery-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'gallery-styles';
        style.textContent = `
            #cosmetics-gallery {
                position: fixed;
                inset: 0;
                background: rgba(0,0,0,0.9);
                z-index: 10000;
                display: flex;
                align-items: center;
                justify-content: center;
                animation: fadeIn 0.3s ease;
            }
            
            .gallery-container {
                background: #18181b;
                border-radius: 20px;
                padding: 24px;
                max-width: 600px;
                max-height: 80vh;
                width: 90%;
                overflow: hidden;
                display: flex;
                flex-direction: column;
            }
            
            .gallery-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 16px;
            }
            
            .gallery-header h2 {
                margin: 0;
                font-size: 1.3rem;
                color: #fff;
            }
            
            .gallery-close {
                background: none;
                border: none;
                color: rgba(255,255,255,0.5);
                font-size: 1.5rem;
                cursor: pointer;
            }
            
            .gallery-stats {
                display: flex;
                justify-content: space-between;
                font-size: 0.85rem;
                color: rgba(255,255,255,0.6);
                margin-bottom: 16px;
            }
            
            .gallery-percent {
                color: #7dd3fc;
                font-weight: 600;
            }
            
            .gallery-tabs {
                display: flex;
                gap: 8px;
                margin-bottom: 16px;
                overflow-x: auto;
            }
            
            .gallery-tab {
                padding: 8px 16px;
                background: rgba(255,255,255,0.05);
                border: none;
                border-radius: 8px;
                color: rgba(255,255,255,0.6);
                font-size: 0.8rem;
                text-transform: capitalize;
                cursor: pointer;
                transition: all 0.2s;
            }
            
            .gallery-tab:hover, .gallery-tab.active {
                background: rgba(125, 211, 252, 0.2);
                color: #7dd3fc;
            }
            
            .gallery-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
                gap: 12px;
                overflow-y: auto;
                padding: 4px;
            }
            
            .cosmetic-card {
                background: rgba(255,255,255,0.03);
                border: 1px solid rgba(255,255,255,0.08);
                border-radius: 12px;
                padding: 16px;
                text-align: center;
                cursor: pointer;
                transition: all 0.2s;
            }
            
            .cosmetic-card.locked {
                opacity: 0.5;
                cursor: default;
            }
            
            .cosmetic-card.unlocked:hover {
                border-color: var(--rarity-color);
                transform: translateY(-2px);
            }
            
            .cosmetic-card.equipped {
                border-color: var(--rarity-color);
                background: linear-gradient(135deg, transparent, var(--rarity-color)20);
            }
            
            .cc-rarity {
                font-size: 0.6rem;
                color: var(--rarity-color);
                text-transform: uppercase;
                letter-spacing: 0.1em;
                margin-bottom: 8px;
            }
            
            .cc-icon {
                font-size: 2rem;
                margin-bottom: 8px;
            }
            
            .cc-name {
                font-size: 0.75rem;
                color: #fff;
                font-weight: 500;
            }
            
            .cc-source {
                font-size: 0.65rem;
                color: rgba(255,255,255,0.4);
                margin-top: 4px;
            }
            
            .cc-equipped {
                font-size: 0.6rem;
                color: var(--rarity-color);
                margin-top: 8px;
                font-weight: 600;
            }
        `;
        document.head.appendChild(style);
    }
}

// Export singleton
export const cosmetics = new CosmeticsManager();
