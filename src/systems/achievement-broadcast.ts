// Achievement Broadcast System
// Shows achievement unlocks to nearby players for social proof

import { EventBus } from './EventBus';
import { WebSocketClient } from '../network/WebSocketClient';

export interface AchievementBroadcast {
    playerId: string;
    playerName: string;
    achievementId: string;
    achievementName: string;
    achievementIcon: string;
    x: number;
    y: number;
    timestamp: number;
}

// Recent broadcasts (shown for 5 seconds)
const recentBroadcasts: AchievementBroadcast[] = [];
const BROADCAST_DURATION = 5000;
const MAX_BROADCASTS = 5;

/**
 * Broadcast an achievement unlock to nearby players
 */
export function broadcastAchievement(
    wsClient: WebSocketClient,
    playerId: string,
    playerName: string,
    achievementId: string,
    achievementName: string,
    achievementIcon: string,
    x: number,
    y: number
): void {
    if (!wsClient.isConnected()) return;

    // Send to server to broadcast to nearby players
    // Cast to any since achievement_broadcast is a custom extension
    wsClient.send({
        type: 'achievement_broadcast',
        playerId,
        playerName,
        achievementId,
        achievementName,
        achievementIcon,
        x,
        y,
        timestamp: Date.now()
    } as any);
}

/**
 * Add a received broadcast
 */
export function addBroadcast(broadcast: AchievementBroadcast): void {
    recentBroadcasts.unshift(broadcast);

    // Keep only recent broadcasts
    while (recentBroadcasts.length > MAX_BROADCASTS) {
        recentBroadcasts.pop();
    }

    // Create visual popup
    showAchievementPopup(broadcast);

    EventBus.emit('achievement:unlocked', { achievementId: broadcast.achievementId });
}

/**
 * Show achievement popup UI
 */
function showAchievementPopup(broadcast: AchievementBroadcast): void {
    const popup = document.createElement('div');
    popup.className = 'achievement-popup';
    popup.innerHTML = `
        <div class="achievement-popup-icon">${broadcast.achievementIcon}</div>
        <div class="achievement-popup-content">
            <div class="achievement-popup-title">${broadcast.playerName} earned</div>
            <div class="achievement-popup-name">${broadcast.achievementName}</div>
        </div>
    `;
    document.body.appendChild(popup);

    // Auto-remove after animation
    setTimeout(() => {
        popup.remove();
    }, 4000);
}

/**
 * Get active broadcasts for rendering
 */
export function getActiveBroadcasts(): AchievementBroadcast[] {
    const now = Date.now();
    return recentBroadcasts.filter(b => now - b.timestamp < BROADCAST_DURATION);
}

/**
 * Cleanup old broadcasts
 */
export function cleanupBroadcasts(): void {
    const now = Date.now();
    while (recentBroadcasts.length > 0 && now - recentBroadcasts[recentBroadcasts.length - 1].timestamp >= BROADCAST_DURATION) {
        recentBroadcasts.pop();
    }
}
