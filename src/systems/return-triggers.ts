// Return Triggers System
// Shows "someone was waiting for you" and other return notifications

import { EventBus } from './EventBus';
import { pushNotifications } from './push-notifications';

const STORAGE_KEYS = {
    PENDING_WAVES: 'aura_pending_waves',
    LAST_ACTIVE: 'aura_last_active',
    MISSED_EVENTS: 'aura_missed_events'
};

interface PendingWave {
    fromId: string;
    fromName: string;
    timestamp: number;
}

interface MissedEvent {
    type: 'event' | 'friend_online' | 'bond_milestone';
    title: string;
    timestamp: number;
}

class ReturnTriggersManager {
    private pendingWaves: PendingWave[] = [];
    private missedEvents: MissedEvent[] = [];
    private hasShownReturnPopup: boolean = false;
    
    constructor() {
        this.loadFromStorage();
        
        // Listen for incoming waves/interactions while user might be away
        EventBus.on('player:waveReceived', (data) => {
            this.addPendingWave(data.fromId, data.fromName);
        });
        
        // Listen for when tab becomes visible
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                this.onUserReturned();
            }
        });
    }
    
    /**
     * Load pending data from storage
     */
    private loadFromStorage(): void {
        try {
            const waves = localStorage.getItem(STORAGE_KEYS.PENDING_WAVES);
            if (waves) {
                this.pendingWaves = JSON.parse(waves);
            }
            
            const events = localStorage.getItem(STORAGE_KEYS.MISSED_EVENTS);
            if (events) {
                this.missedEvents = JSON.parse(events);
            }
        } catch (e) {
            console.error('Failed to load return triggers:', e);
        }
    }
    
    /**
     * Save pending data to storage
     */
    private saveToStorage(): void {
        localStorage.setItem(STORAGE_KEYS.PENDING_WAVES, JSON.stringify(this.pendingWaves));
        localStorage.setItem(STORAGE_KEYS.MISSED_EVENTS, JSON.stringify(this.missedEvents));
    }
    
    /**
     * Add a pending wave from another player
     */
    addPendingWave(fromId: string, fromName: string): void {
        // Don't add duplicates from same person in last hour
        const recentFromSame = this.pendingWaves.find(
            w => w.fromId === fromId && Date.now() - w.timestamp < 3600000
        );
        
        if (!recentFromSame) {
            this.pendingWaves.push({
                fromId,
                fromName,
                timestamp: Date.now()
            });
            this.saveToStorage();
            
            // Send push notification if tab is hidden
            if (document.hidden) {
                pushNotifications.notifySocialActivity(fromName);
            }
        }
    }
    
    /**
     * Add a missed event
     */
    addMissedEvent(type: MissedEvent['type'], title: string): void {
        this.missedEvents.push({
            type,
            title,
            timestamp: Date.now()
        });
        
        // Keep only last 5 events
        if (this.missedEvents.length > 5) {
            this.missedEvents = this.missedEvents.slice(-5);
        }
        
        this.saveToStorage();
    }
    
    /**
     * Called when user returns to the app
     */
    private onUserReturned(): void {
        if (this.hasShownReturnPopup) return;
        
        const lastActive = localStorage.getItem(STORAGE_KEYS.LAST_ACTIVE);
        if (!lastActive) return;
        
        const lastActiveTime = parseInt(lastActive, 10);
        const awayTime = Date.now() - lastActiveTime;
        
        // Only show if away for more than 5 minutes
        if (awayTime < 5 * 60 * 1000) return;
        
        // Check for pending waves
        const recentWaves = this.pendingWaves.filter(
            w => Date.now() - w.timestamp < 24 * 60 * 60 * 1000 // Last 24 hours
        );
        
        if (recentWaves.length > 0) {
            this.showReturnPopup(recentWaves);
            this.hasShownReturnPopup = true;
        }
    }
    
    /**
     * Show the return popup
     */
    private showReturnPopup(waves: PendingWave[]): void {
        const popup = document.createElement('div');
        popup.id = 'return-popup';
        
        const names = waves.slice(0, 3).map(w => w.fromName);
        const extraCount = waves.length - 3;
        
        let namesText = names.join(', ');
        if (extraCount > 0) {
            namesText += ` and ${extraCount} more`;
        }
        
        popup.innerHTML = `
            <div class="return-popup-content">
                <div class="return-popup-icon">👋</div>
                <div class="return-popup-title">Welcome back!</div>
                <div class="return-popup-text">
                    <strong>${namesText}</strong> ${waves.length === 1 ? 'tried' : 'tried'} to connect with you
                </div>
                <div class="return-popup-sub">
                    ${waves.length === 1 ? 'They might still be around...' : 'Some might still be around...'}
                </div>
                <button class="return-popup-btn" id="return-popup-close">Enter Cosmos</button>
            </div>
        `;
        
        document.body.appendChild(popup);
        this.addReturnPopupStyles();
        
        // Clear pending waves
        this.pendingWaves = [];
        this.saveToStorage();
        
        // Close button
        document.getElementById('return-popup-close')?.addEventListener('click', () => {
            popup.style.opacity = '0';
            setTimeout(() => popup.remove(), 300);
        });
        
        // Auto-dismiss after 5 seconds
        setTimeout(() => {
            if (document.getElementById('return-popup')) {
                popup.style.opacity = '0';
                setTimeout(() => popup.remove(), 300);
            }
        }, 5000);
    }
    
    /**
     * Add styles for return popup
     */
    private addReturnPopupStyles(): void {
        if (document.getElementById('return-popup-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'return-popup-styles';
        style.textContent = `
            #return-popup {
                position: fixed;
                inset: 0;
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                background: rgba(0, 0, 0, 0.8);
                animation: fadeIn 0.3s ease;
                transition: opacity 0.3s ease;
            }
            
            .return-popup-content {
                background: linear-gradient(135deg, #18181b, #27272a);
                border: 1px solid rgba(125, 211, 252, 0.2);
                border-radius: 24px;
                padding: 40px;
                text-align: center;
                max-width: 340px;
                animation: popIn 0.4s ease;
            }
            
            @keyframes popIn {
                from { transform: scale(0.9); opacity: 0; }
                to { transform: scale(1); opacity: 1; }
            }
            
            .return-popup-icon {
                font-size: 3.5rem;
                margin-bottom: 16px;
                animation: wave 1s ease-in-out infinite;
            }
            
            @keyframes wave {
                0%, 100% { transform: rotate(0deg); }
                25% { transform: rotate(20deg); }
                75% { transform: rotate(-20deg); }
            }
            
            .return-popup-title {
                font-size: 1.5rem;
                font-weight: 700;
                color: #fff;
                margin-bottom: 12px;
            }
            
            .return-popup-text {
                font-size: 1rem;
                color: rgba(255, 255, 255, 0.8);
                margin-bottom: 8px;
            }
            
            .return-popup-text strong {
                color: var(--accent, #7dd3fc);
            }
            
            .return-popup-sub {
                font-size: 0.85rem;
                color: rgba(255, 255, 255, 0.5);
                margin-bottom: 24px;
            }
            
            .return-popup-btn {
                background: linear-gradient(135deg, #7dd3fc, #38bdf8);
                border: none;
                padding: 14px 32px;
                border-radius: 12px;
                color: #000;
                font-weight: 600;
                font-size: 1rem;
                cursor: pointer;
                transition: all 0.2s;
            }
            
            .return-popup-btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 8px 30px rgba(125, 211, 252, 0.3);
            }
        `;
        document.head.appendChild(style);
    }
    
    /**
     * Get pending wave count
     */
    getPendingCount(): number {
        return this.pendingWaves.length;
    }
    
    /**
     * Clear all pending data
     */
    clear(): void {
        this.pendingWaves = [];
        this.missedEvents = [];
        this.saveToStorage();
    }
}

// Export singleton
export const returnTriggers = new ReturnTriggersManager();
