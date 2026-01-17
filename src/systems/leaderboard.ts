// Leaderboard System
// Competition and social comparison to drive engagement

import { EventBus } from './EventBus';

interface LeaderboardEntry {
    rank: number;
    playerId: string;
    name: string;
    score: number;
    level: number;
    badge?: string;
    isYou?: boolean;
}

interface LeaderboardData {
    daily: LeaderboardEntry[];
    weekly: LeaderboardEntry[];
    allTime: LeaderboardEntry[];
    friends: LeaderboardEntry[];
    lastUpdated: number;
}

const STORAGE_KEY = 'aura_leaderboard_cache';
const PLAYER_KEY = 'aura_player_stats';

class LeaderboardManager {
    private data: LeaderboardData;
    private playerStats: {
        totalXP: number;
        connections: number;
        streak: number;
        totalTime: number;
        level: number;
        name: string;
    };
    
    constructor() {
        this.data = this.loadCache();
        this.playerStats = this.loadPlayerStats();
        
        // Track XP gains
        EventBus.on('player:xpGain', (data) => {
            this.playerStats.totalXP += data.amount;
            this.playerStats.level = Math.floor(Math.sqrt(this.playerStats.totalXP / 100)) + 1;
            this.savePlayerStats();
        });
        
        // Generate fake leaderboard data
        this.generateLeaderboardData();
    }
    
    private loadCache(): LeaderboardData {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                return JSON.parse(saved);
            }
        } catch (e) {}
        
        return {
            daily: [],
            weekly: [],
            allTime: [],
            friends: [],
            lastUpdated: 0
        };
    }
    
    private loadPlayerStats(): typeof this.playerStats {
        try {
            const saved = localStorage.getItem(PLAYER_KEY);
            if (saved) {
                return JSON.parse(saved);
            }
        } catch (e) {}
        
        return {
            totalXP: 0,
            connections: 0,
            streak: 0,
            totalTime: 0,
            level: 1,
            name: 'You'
        };
    }
    
    private savePlayerStats(): void {
        localStorage.setItem(PLAYER_KEY, JSON.stringify(this.playerStats));
    }
    
    /**
     * Generate realistic fake leaderboard data
     * Designed to make player feel competitive but not hopeless
     */
    private generateLeaderboardData(): void {
        const names = [
            'CosmicDreamer', 'StarChild_', 'NightOwl27', 'ZenMaster', 'LunarEcho',
            'SoulWanderer', 'AuroraLight', 'MidnightSun', 'DreamWeaver', 'SilentStorm',
            'EternalFlame', 'MysticRiver', 'CloudWalker', 'FireflyGlow', 'OceanBreeze',
            'VelvetNight', 'CrystalWave', 'ThunderSoul', 'RainbowDust', 'GoldenHour',
            'ShadowDance', 'MoonlitPath', 'StarryEyed', 'WildSpirit', 'PeacefulMind',
            'GentleBreeze', 'SunsetGlow', 'MorningDew', 'TwilightSky', 'CozyCorner'
        ];
        
        const badges = ['👑', '🌟', '💫', '✨', '🔥', '💎', '🌈', '⚡', '💖', '🎭'];
        
        // Generate entries with strategic placement for the player
        const generateEntries = (maxScore: number, playerScore: number, count: number): LeaderboardEntry[] => {
            const entries: LeaderboardEntry[] = [];
            
            for (let i = 0; i < count; i++) {
                const rank = i + 1;
                // Exponential decay for scores - top players have much higher scores
                const scoreMultiplier = Math.pow(0.85, i);
                const score = Math.floor(maxScore * scoreMultiplier * (0.9 + Math.random() * 0.2));
                
                entries.push({
                    rank,
                    playerId: `player_${i}`,
                    name: names[i % names.length] + (i >= names.length ? i : ''),
                    score,
                    level: Math.floor(Math.sqrt(score / 100)) + 1,
                    badge: i < 3 ? badges[i] : (Math.random() < 0.3 ? badges[Math.floor(Math.random() * badges.length)] : undefined)
                });
            }
            
            // Find where player would rank and insert them
            let playerRank = entries.findIndex(e => e.score < playerScore);
            if (playerRank === -1) playerRank = entries.length;
            
            // Make sure player is visible (not too low on first visit)
            // New players should see themselves in top 50 to feel competitive
            if (playerScore === 0 && playerRank > 45) {
                playerRank = 45 + Math.floor(Math.random() * 5);
            }
            
            entries.splice(playerRank, 0, {
                rank: playerRank + 1,
                playerId: 'you',
                name: this.playerStats.name,
                score: playerScore,
                level: this.playerStats.level,
                isYou: true
            });
            
            // Reindex ranks
            entries.forEach((e, i) => e.rank = i + 1);
            
            return entries.slice(0, 100);
        };
        
        // Daily: smaller scores, easier to climb
        this.data.daily = generateEntries(5000, this.playerStats.totalXP, 100);
        
        // Weekly: medium scores
        this.data.weekly = generateEntries(25000, this.playerStats.totalXP * 7, 100);
        
        // All time: big scores but player still visible
        this.data.allTime = generateEntries(500000, this.playerStats.totalXP, 100);
        
        // Friends: always show player in good position
        this.data.friends = generateEntries(this.playerStats.totalXP * 1.5, this.playerStats.totalXP, 15);
        
        this.data.lastUpdated = Date.now();
    }
    
    /**
     * Get player's rank in a category
     */
    getPlayerRank(timeframe: 'daily' | 'weekly' | 'allTime' = 'daily'): number {
        const list = this.data[timeframe];
        const entry = list.find(e => e.isYou);
        return entry?.rank || 999;
    }
    
    /**
     * Show the leaderboard UI
     */
    showLeaderboard(initialTab: 'daily' | 'weekly' | 'allTime' = 'daily'): void {
        // Refresh data
        this.generateLeaderboardData();
        
        const overlay = document.createElement('div');
        overlay.id = 'leaderboard-overlay';
        
        overlay.innerHTML = `
            <div class="lb-container">
                <div class="lb-header">
                    <h2>🏆 Leaderboard</h2>
                    <button class="lb-close" id="lb-close">×</button>
                </div>
                <div class="lb-tabs">
                    <button class="lb-tab ${initialTab === 'daily' ? 'active' : ''}" data-tab="daily">Today</button>
                    <button class="lb-tab ${initialTab === 'weekly' ? 'active' : ''}" data-tab="weekly">This Week</button>
                    <button class="lb-tab ${initialTab === 'allTime' ? 'active' : ''}" data-tab="allTime">All Time</button>
                    <button class="lb-tab" data-tab="friends">Friends</button>
                </div>
                <div class="lb-your-rank">
                    <span>Your Rank</span>
                    <span class="lb-rank-num">#${this.getPlayerRank(initialTab)}</span>
                </div>
                <div class="lb-list" id="lb-list">
                    ${this.renderList(initialTab)}
                </div>
            </div>
        `;
        
        document.body.appendChild(overlay);
        this.addStyles();
        
        // Close button
        document.getElementById('lb-close')?.addEventListener('click', () => {
            overlay.remove();
        });
        
        // Tab switching
        overlay.querySelectorAll('.lb-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const tabName = (tab as HTMLElement).dataset.tab as keyof LeaderboardData;
                overlay.querySelectorAll('.lb-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                const list = document.getElementById('lb-list');
                if (list) {
                    list.innerHTML = this.renderList(tabName);
                }
                
                const rankNum = overlay.querySelector('.lb-rank-num');
                if (rankNum && tabName !== 'friends') {
                    rankNum.textContent = `#${this.getPlayerRank(tabName as 'daily' | 'weekly' | 'allTime')}`;
                }
            });
        });
        
        // UI opened
    }
    
    /**
     * Render leaderboard list
     */
    private renderList(tab: keyof LeaderboardData): string {
        const entries = this.data[tab] as LeaderboardEntry[];
        const playerEntry = entries.find(e => e.isYou);
        const playerRank = playerEntry?.rank || 0;
        
        // Show top 10 + entries around player
        const toShow: LeaderboardEntry[] = [];
        
        // Always show top 10
        toShow.push(...entries.slice(0, 10));
        
        // If player is not in top 10, show entries around them
        if (playerRank > 10) {
            toShow.push({ rank: -1, playerId: '', name: '', score: 0, level: 0 }); // Divider
            const start = Math.max(10, playerRank - 3);
            const end = Math.min(entries.length, playerRank + 3);
            toShow.push(...entries.slice(start, end));
        }
        
        return toShow.map(entry => {
            if (entry.rank === -1) {
                return `<div class="lb-divider">• • •</div>`;
            }
            
            const rankClass = entry.rank <= 3 ? `top-${entry.rank}` : '';
            const youClass = entry.isYou ? 'is-you' : '';
            
            return `
                <div class="lb-entry ${rankClass} ${youClass}">
                    <div class="lb-rank">${this.getRankDisplay(entry.rank)}</div>
                    <div class="lb-info">
                        <div class="lb-name">${entry.badge || ''} ${entry.name}</div>
                        <div class="lb-level">Lv. ${entry.level}</div>
                    </div>
                    <div class="lb-score">${this.formatScore(entry.score)}</div>
                </div>
            `;
        }).join('');
    }
    
    /**
     * Get rank display (emoji for top 3)
     */
    private getRankDisplay(rank: number): string {
        if (rank === 1) return '🥇';
        if (rank === 2) return '🥈';
        if (rank === 3) return '🥉';
        return `#${rank}`;
    }
    
    /**
     * Format large scores
     */
    private formatScore(score: number): string {
        if (score >= 1000000) return `${(score / 1000000).toFixed(1)}M`;
        if (score >= 1000) return `${(score / 1000).toFixed(1)}K`;
        return score.toString();
    }
    
    /**
     * Check if player moved up
     */
    checkRankUp(): void {
        const oldRank = parseInt(localStorage.getItem('aura_last_rank') || '999');
        const newRank = this.getPlayerRank('daily');
        
        if (newRank < oldRank) {
            this.showRankUpNotification(oldRank, newRank);
        }
        
        localStorage.setItem('aura_last_rank', newRank.toString());
    }
    
    /**
     * Show rank up notification
     */
    private showRankUpNotification(oldRank: number, newRank: number): void {
        EventBus.emit('ui:toast', { message: `Rank up! #${oldRank} → #${newRank}`, type: 'success' });
        
        const popup = document.createElement('div');
        popup.className = 'rank-up-popup';
        popup.innerHTML = `
            <div class="rup-content">
                <div class="rup-icon">📈</div>
                <div class="rup-text">Rank Up!</div>
                <div class="rup-ranks">
                    <span class="rup-old">#${oldRank}</span>
                    <span class="rup-arrow">→</span>
                    <span class="rup-new">#${newRank}</span>
                </div>
            </div>
        `;
        
        document.body.appendChild(popup);
        
        if (!document.getElementById('rup-styles')) {
            const style = document.createElement('style');
            style.id = 'rup-styles';
            style.textContent = `
                .rank-up-popup {
                    position: fixed;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    z-index: 100000;
                    animation: rupPop 0.5s ease;
                }
                
                @keyframes rupPop {
                    from { transform: translate(-50%, -50%) scale(0.5); opacity: 0; }
                    to { transform: translate(-50%, -50%) scale(1); opacity: 1; }
                }
                
                .rup-content {
                    background: linear-gradient(135deg, #059669, #10b981);
                    border-radius: 16px;
                    padding: 24px 40px;
                    text-align: center;
                    box-shadow: 0 8px 40px rgba(16, 185, 129, 0.4);
                }
                
                .rup-icon {
                    font-size: 3rem;
                    margin-bottom: 8px;
                }
                
                .rup-text {
                    font-size: 1.5rem;
                    font-weight: 700;
                    color: #fff;
                    margin-bottom: 12px;
                }
                
                .rup-ranks {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 12px;
                    font-size: 1.2rem;
                    font-weight: 600;
                }
                
                .rup-old { color: rgba(255,255,255,0.6); }
                .rup-arrow { color: #fff; }
                .rup-new { color: #fbbf24; }
            `;
            document.head.appendChild(style);
        }
        
        setTimeout(() => {
            popup.style.opacity = '0';
            popup.style.transition = 'opacity 0.3s';
            setTimeout(() => popup.remove(), 300);
        }, 3000);
    }
    
    /**
     * Add leaderboard styles
     */
    private addStyles(): void {
        if (document.getElementById('lb-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'lb-styles';
        style.textContent = `
            #leaderboard-overlay {
                position: fixed;
                inset: 0;
                background: rgba(0,0,0,0.9);
                z-index: 10000;
                display: flex;
                align-items: center;
                justify-content: center;
                animation: fadeIn 0.3s ease;
            }
            
            .lb-container {
                background: #18181b;
                border-radius: 20px;
                width: 90%;
                max-width: 420px;
                max-height: 80vh;
                display: flex;
                flex-direction: column;
                overflow: hidden;
            }
            
            .lb-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 20px 20px 0;
            }
            
            .lb-header h2 {
                margin: 0;
                font-size: 1.3rem;
                color: #fff;
            }
            
            .lb-close {
                background: none;
                border: none;
                color: rgba(255,255,255,0.5);
                font-size: 1.5rem;
                cursor: pointer;
            }
            
            .lb-tabs {
                display: flex;
                padding: 16px 20px;
                gap: 8px;
                overflow-x: auto;
            }
            
            .lb-tab {
                padding: 8px 14px;
                background: rgba(255,255,255,0.05);
                border: none;
                border-radius: 20px;
                color: rgba(255,255,255,0.6);
                font-size: 0.8rem;
                cursor: pointer;
                white-space: nowrap;
                transition: all 0.2s;
            }
            
            .lb-tab:hover, .lb-tab.active {
                background: linear-gradient(135deg, #fbbf24, #f59e0b);
                color: #000;
            }
            
            .lb-your-rank {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 12px 20px;
                background: rgba(251, 191, 36, 0.1);
                border-bottom: 1px solid rgba(255,255,255,0.05);
            }
            
            .lb-your-rank span:first-child {
                color: rgba(255,255,255,0.6);
                font-size: 0.85rem;
            }
            
            .lb-rank-num {
                font-size: 1.2rem;
                font-weight: 700;
                color: #fbbf24;
            }
            
            .lb-list {
                flex: 1;
                overflow-y: auto;
                padding: 12px 16px;
            }
            
            .lb-entry {
                display: flex;
                align-items: center;
                padding: 12px;
                background: rgba(255,255,255,0.02);
                border-radius: 12px;
                margin-bottom: 8px;
                transition: all 0.2s;
            }
            
            .lb-entry.is-you {
                background: linear-gradient(135deg, rgba(251, 191, 36, 0.15), rgba(251, 191, 36, 0.05));
                border: 1px solid rgba(251, 191, 36, 0.3);
            }
            
            .lb-entry.top-1 { background: linear-gradient(135deg, rgba(251, 191, 36, 0.15), transparent); }
            .lb-entry.top-2 { background: linear-gradient(135deg, rgba(192, 192, 192, 0.1), transparent); }
            .lb-entry.top-3 { background: linear-gradient(135deg, rgba(205, 127, 50, 0.1), transparent); }
            
            .lb-rank {
                width: 40px;
                font-weight: 600;
                color: rgba(255,255,255,0.8);
                font-size: 0.9rem;
            }
            
            .lb-info {
                flex: 1;
                min-width: 0;
            }
            
            .lb-name {
                font-weight: 500;
                color: #fff;
                font-size: 0.9rem;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            
            .lb-level {
                font-size: 0.7rem;
                color: rgba(255,255,255,0.4);
            }
            
            .lb-score {
                font-weight: 600;
                color: #7dd3fc;
                font-size: 0.9rem;
            }
            
            .lb-divider {
                text-align: center;
                padding: 12px;
                color: rgba(255,255,255,0.3);
            }
        `;
        document.head.appendChild(style);
    }
    
    /**
     * Show leaderboard button
     */
    showLeaderboardButton(): void {
        // Remove existing
        document.getElementById('leaderboard-btn')?.remove();
        
        const btn = document.createElement('button');
        btn.id = 'leaderboard-btn';
        btn.innerHTML = `<span>🏆</span><span>#${this.getPlayerRank()}</span>`;
        btn.style.cssText = `
            position: fixed;
            top: 180px;
            left: 20px;
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 10px 14px;
            background: linear-gradient(135deg, rgba(251, 191, 36, 0.2), rgba(251, 191, 36, 0.1));
            border: 1px solid rgba(251, 191, 36, 0.3);
            border-radius: 12px;
            font-weight: 600;
            font-size: 0.8rem;
            color: #fbbf24;
            cursor: pointer;
            z-index: 100;
            transition: all 0.2s;
        `;
        
        btn.addEventListener('click', () => this.showLeaderboard());
        btn.addEventListener('mouseenter', () => {
            btn.style.transform = 'scale(1.05)';
        });
        btn.addEventListener('mouseleave', () => {
            btn.style.transform = 'scale(1)';
        });
        
        document.getElementById('ui')?.appendChild(btn);
    }
}

export const leaderboard = new LeaderboardManager();
