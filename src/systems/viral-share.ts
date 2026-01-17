// Viral Share System
// One-tap sharing, referral tracking, and orbit invites

import { EventBus } from './EventBus';

interface ShareData {
    url: string;
    title: string;
    text: string;
}

// Storage key for referral tracking
const REFERRAL_KEY = 'aura_referral_source';

/**
 * Generate a shareable orbit link with player position & referral
 */
export function generateShareLink(playerId: string, x: number, y: number): string {
    const seedVal = Math.floor(x) + Math.floor(y) * 10000;
    const baseUrl = `${window.location.origin}${window.location.pathname}`;
    return `${baseUrl}?seed=${seedVal}&ref=${playerId.slice(0, 8)}`;
}

/**
 * Share using Web Share API (mobile) or clipboard fallback
 */
export async function shareOrbit(playerId: string, playerName: string, x: number, y: number): Promise<boolean> {
    const url = generateShareLink(playerId, x, y);
    const shareData: ShareData = {
        url,
        title: 'Join my orbit in AURA',
        text: `${playerName} invites you to drift together in the cosmos ✨`
    };

    try {
        // Try Web Share API first (works on mobile)
        if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
            await navigator.share(shareData);
            EventBus.emit('ui:toast', { message: '🔗 Orbit link shared!', type: 'success' });
            trackShareEvent('native_share');
            return true;
        }
    } catch (err) {
        // User cancelled or share failed
        console.log('Native share cancelled or failed:', err);
    }

    // Fallback to clipboard
    return copyToClipboard(url);
}

/**
 * Copy URL to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
    try {
        await navigator.clipboard.writeText(text);
        EventBus.emit('ui:toast', { message: '📋 Link copied to clipboard!', type: 'success' });
        trackShareEvent('clipboard_copy');
        return true;
    } catch (err) {
        // Final fallback
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand('copy');
            EventBus.emit('ui:toast', { message: '📋 Link copied!', type: 'success' });
            trackShareEvent('fallback_copy');
            return true;
        } catch {
            EventBus.emit('ui:toast', { message: '⚠️ Could not copy link', type: 'warning' });
            return false;
        } finally {
            document.body.removeChild(textArea);
        }
    }
}

/**
 * Check if user came from a referral
 */
export function checkReferralSource(): string | null {
    const urlParams = new URLSearchParams(window.location.search);
    const refId = urlParams.get('ref');

    if (refId) {
        // Store referral source
        try {
            const existing = localStorage.getItem(REFERRAL_KEY);
            if (!existing) {
                localStorage.setItem(REFERRAL_KEY, JSON.stringify({
                    referrerId: refId,
                    timestamp: Date.now()
                }));
            }
        } catch (e) {
            console.warn('Failed to store referral:', e);
        }
        return refId;
    }

    return null;
}

/**
 * Track a successful referral (when new user reaches level 2)
 */
export function trackReferralSuccess(newPlayerId: string): void {
    try {
        const refData = localStorage.getItem(REFERRAL_KEY);
        if (refData) {
            const { referrerId } = JSON.parse(refData);
            // Could send to server for referral rewards
            console.log(`🎉 Referral success: ${referrerId} referred ${newPlayerId}`);
        }
    } catch (e) {
        console.warn('Failed to track referral:', e);
    }
}

/**
 * Track share events for analytics
 */
function trackShareEvent(method: string): void {
    try {
        const shares = JSON.parse(localStorage.getItem('aura_shares') || '[]');
        shares.push({ method, timestamp: Date.now() });
        localStorage.setItem('aura_shares', JSON.stringify(shares.slice(-50))); // Keep last 50
    } catch (e) {
        console.warn('Failed to track share:', e);
    }
}

/**
 * Get share count for gamification
 */
export function getShareCount(): number {
    try {
        const shares = JSON.parse(localStorage.getItem('aura_shares') || '[]');
        return shares.length;
    } catch {
        return 0;
    }
}

/**
 * Create floating share button (mobile-optimized)
 */
export function createShareButton(playerId: string, playerName: string, getPosition: () => { x: number; y: number }): void {
    const existing = document.getElementById('share-fab');
    if (existing) return;

    const fab = document.createElement('button');
    fab.id = 'share-fab';
    fab.className = 'share-fab';
    fab.innerHTML = '🔗';
    fab.title = 'Share your orbit';

    fab.addEventListener('click', () => {
        const pos = getPosition();
        shareOrbit(playerId, playerName, pos.x, pos.y);
    });

    document.body.appendChild(fab);

    // Add styles
    const style = document.createElement('style');
    style.textContent = `
        .share-fab {
            position: fixed;
            bottom: 180px;
            right: 20px;
            width: 56px;
            height: 56px;
            border-radius: 50%;
            border: 2px solid rgba(125, 211, 252, 0.4);
            background: linear-gradient(135deg, rgba(125, 211, 252, 0.2), rgba(196, 181, 253, 0.2));
            backdrop-filter: blur(12px);
            font-size: 24px;
            cursor: pointer;
            z-index: 100;
            display: none;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 20px rgba(125, 211, 252, 0.3);
            transition: all 0.2s ease;
            -webkit-tap-highlight-color: transparent;
        }
        
        .share-fab:hover, .share-fab:active {
            transform: scale(1.1);
            border-color: rgba(125, 211, 252, 0.6);
        }
        
        @media (max-width: 768px), (pointer: coarse) {
            .share-fab {
                display: flex;
                bottom: calc(260px + env(safe-area-inset-bottom));
            }
        }
        
        /* Desktop: show in different position */
        @media (min-width: 769px) and (pointer: fine) {
            .share-fab {
                display: flex;
                bottom: 100px;
                right: 20px;
                width: 48px;
                height: 48px;
                font-size: 20px;
            }
        }
    `;
    document.head.appendChild(style);
}

/**
 * Show "X friends playing" indicator
 */
export function updateFriendsOnlineIndicator(onlineFriends: { id: string; name: string }[]): void {
    let indicator = document.getElementById('friends-online');

    if (onlineFriends.length === 0) {
        indicator?.remove();
        return;
    }

    if (!indicator) {
        indicator = document.createElement('div');
        indicator.id = 'friends-online';
        indicator.className = 'friends-online-indicator';
        document.body.appendChild(indicator);

        // Add styles if not exists
        if (!document.getElementById('friends-online-style')) {
            const style = document.createElement('style');
            style.id = 'friends-online-style';
            style.textContent = `
                .friends-online-indicator {
                    position: fixed;
                    top: 70px;
                    left: 50%;
                    transform: translateX(-50%);
                    padding: 8px 16px;
                    background: rgba(251, 113, 133, 0.15);
                    border: 1px solid rgba(251, 113, 133, 0.3);
                    border-radius: 20px;
                    backdrop-filter: blur(12px);
                    font-size: 0.85rem;
                    color: rgba(255, 255, 255, 0.9);
                    z-index: 100;
                    cursor: pointer;
                    animation: friend-pulse 2s ease-in-out infinite;
                }
                
                @keyframes friend-pulse {
                    0%, 100% { box-shadow: 0 0 10px rgba(251, 113, 133, 0.2); }
                    50% { box-shadow: 0 0 20px rgba(251, 113, 133, 0.4); }
                }
                
                .friends-online-indicator:hover {
                    background: rgba(251, 113, 133, 0.25);
                }
            `;
            document.head.appendChild(style);
        }
    }

    const names = onlineFriends.slice(0, 3).map(f => f.name).join(', ');
    const extra = onlineFriends.length > 3 ? ` +${onlineFriends.length - 3} more` : '';
    indicator.innerHTML = `💫 ${names}${extra} online`;
}
