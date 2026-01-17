// Push Notification System
// Handles permission requests, scheduling, and return triggers

import { EventBus } from '../systems/EventBus';

interface NotificationData {
    title: string;
    body: string;
    tag?: string;
    data?: Record<string, any>;
}

// Notification templates for different triggers
const NOTIFICATION_TEMPLATES = {
    // FOMO triggers
    cosmos_active: [
        { title: '🌌 The cosmos is alive', body: '{count} souls are drifting right now...' },
        { title: '✨ Something magical is happening', body: '{count} people found connection tonight' },
        { title: '🎵 The void is singing', body: 'Someone nearby is playing a beautiful melody' }
    ],
    
    // Social reciprocity
    someone_waiting: [
        { title: '💫 Someone noticed you', body: '{name} sent you a wave while you were away' },
        { title: '🌟 You were missed', body: 'A soul tried to connect with you' },
        { title: '👋 {name} is looking for you', body: 'They visited your last known location' }
    ],
    
    // Loss aversion (streak)
    streak_warning: [
        { title: '🔥 Your streak is fading', body: 'Visit the cosmos to keep your {days} day streak!' },
        { title: '⚠️ Don\'t lose your flame', body: 'Your {days} day streak ends in {hours} hours' }
    ],
    
    // Bond decay
    bond_fading: [
        { title: '💔 A connection grows cold', body: 'Your bond with {name} is fading...' },
        { title: '🌙 {name} hasn\'t seen you lately', body: 'Reconnect before the bond breaks' }
    ],
    
    // Events
    event_starting: [
        { title: '⚡ {eventName} starting NOW', body: 'Don\'t miss out! {duration} only' },
        { title: '🎉 Limited event is LIVE', body: '{eventName} - {bonus}x rewards!' }
    ],
    
    // Milestone/Achievement
    achievement_nearby: [
        { title: '🏆 You\'re so close!', body: 'Just {remaining} more to unlock {achievement}' }
    ],
    
    // Re-engagement (after absence)
    come_back: [
        { title: '🌌 The cosmos remembers you', body: 'It\'s been {days} days. Your echoes still glow.' },
        { title: '✨ New souls have arrived', body: '{count} new travelers since you left' },
        { title: '🎁 A gift awaits', body: 'Return to claim your welcome-back reward' }
    ]
};

class PushNotificationManager {
    private permission: NotificationPermission = 'default';
    private serviceWorkerRegistration: ServiceWorkerRegistration | null = null;
    private scheduledNotifications: Map<string, number> = new Map();
    
    async init(): Promise<boolean> {
        // Check if notifications are supported
        if (!('Notification' in window)) {
            console.log('Push notifications not supported');
            return false;
        }
        
        // Register service worker
        if ('serviceWorker' in navigator) {
            try {
                this.serviceWorkerRegistration = await navigator.serviceWorker.register('/sw.js');
                console.log('✅ Service Worker registered');
            } catch (err) {
                console.error('Service Worker registration failed:', err);
            }
        }
        
        this.permission = Notification.permission;
        
        // Set up visibility change listener for scheduling notifications
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.onUserLeft();
            } else {
                this.onUserReturned();
            }
        });
        
        return this.permission === 'granted';
    }
    
    /**
     * Request notification permission with optimal timing
     * Best to call after a positive user action (level up, achievement, etc.)
     */
    async requestPermission(context: 'onboarding' | 'achievement' | 'social' = 'achievement'): Promise<boolean> {
        if (this.permission === 'granted') return true;
        if (this.permission === 'denied') return false;
        
        // Show custom pre-permission dialog based on context
        const shouldAsk = await this.showPrePermissionDialog(context);
        if (!shouldAsk) return false;
        
        try {
            this.permission = await Notification.requestPermission();
            
            if (this.permission === 'granted') {
                EventBus.emit('notifications:enabled');
                this.sendWelcomeNotification();
                return true;
            }
        } catch (err) {
            console.error('Permission request failed:', err);
        }
        
        return false;
    }
    
    /**
     * Show a custom pre-permission dialog to improve opt-in rates
     */
    private async showPrePermissionDialog(context: string): Promise<boolean> {
        return new Promise((resolve) => {
            const dialog = document.createElement('div');
            dialog.id = 'notification-ask-dialog';
            dialog.innerHTML = `
                <div class="notif-dialog-backdrop"></div>
                <div class="notif-dialog-content">
                    <div class="notif-dialog-icon">🔔</div>
                    <div class="notif-dialog-title">Stay Connected</div>
                    <div class="notif-dialog-text">
                        ${context === 'social' 
                            ? 'Get notified when friends are online or someone tries to reach you.'
                            : 'Don\'t miss cosmic events, friend activity, or your daily rewards.'}
                    </div>
                    <div class="notif-dialog-buttons">
                        <button class="notif-btn-secondary" id="notif-later">Later</button>
                        <button class="notif-btn-primary" id="notif-enable">Enable</button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(dialog);
            
            // Add styles if not present
            if (!document.getElementById('notif-dialog-styles')) {
                const styles = document.createElement('style');
                styles.id = 'notif-dialog-styles';
                styles.textContent = `
                    #notification-ask-dialog {
                        position: fixed;
                        inset: 0;
                        z-index: 99999;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        animation: fadeIn 0.2s ease;
                    }
                    .notif-dialog-backdrop {
                        position: absolute;
                        inset: 0;
                        background: rgba(0,0,0,0.8);
                        backdrop-filter: blur(4px);
                    }
                    .notif-dialog-content {
                        position: relative;
                        background: linear-gradient(135deg, #18181b, #27272a);
                        border: 1px solid rgba(255,255,255,0.1);
                        border-radius: 20px;
                        padding: 32px;
                        max-width: 320px;
                        text-align: center;
                        box-shadow: 0 20px 60px rgba(0,0,0,0.5);
                    }
                    .notif-dialog-icon {
                        font-size: 48px;
                        margin-bottom: 16px;
                    }
                    .notif-dialog-title {
                        font-size: 1.25rem;
                        font-weight: 600;
                        color: #fff;
                        margin-bottom: 8px;
                    }
                    .notif-dialog-text {
                        font-size: 0.9rem;
                        color: rgba(255,255,255,0.6);
                        line-height: 1.5;
                        margin-bottom: 24px;
                    }
                    .notif-dialog-buttons {
                        display: flex;
                        gap: 12px;
                    }
                    .notif-btn-secondary, .notif-btn-primary {
                        flex: 1;
                        padding: 12px 20px;
                        border-radius: 12px;
                        font-weight: 600;
                        font-size: 0.9rem;
                        cursor: pointer;
                        transition: all 0.2s;
                        border: none;
                    }
                    .notif-btn-secondary {
                        background: rgba(255,255,255,0.1);
                        color: rgba(255,255,255,0.7);
                    }
                    .notif-btn-secondary:hover {
                        background: rgba(255,255,255,0.15);
                    }
                    .notif-btn-primary {
                        background: linear-gradient(135deg, #7dd3fc, #38bdf8);
                        color: #000;
                    }
                    .notif-btn-primary:hover {
                        transform: translateY(-1px);
                        box-shadow: 0 4px 20px rgba(125, 211, 252, 0.3);
                    }
                    @keyframes fadeIn {
                        from { opacity: 0; }
                        to { opacity: 1; }
                    }
                `;
                document.head.appendChild(styles);
            }
            
            document.getElementById('notif-later')?.addEventListener('click', () => {
                dialog.remove();
                resolve(false);
            });
            
            document.getElementById('notif-enable')?.addEventListener('click', () => {
                dialog.remove();
                resolve(true);
            });
            
            dialog.querySelector('.notif-dialog-backdrop')?.addEventListener('click', () => {
                dialog.remove();
                resolve(false);
            });
        });
    }
    
    /**
     * Send a local notification immediately
     */
    send(data: NotificationData): void {
        if (this.permission !== 'granted') return;
        
        if (this.serviceWorkerRegistration) {
            this.serviceWorkerRegistration.showNotification(data.title, {
                body: data.body,
                icon: '/thumbnail.png',
                badge: '/thumbnail.png',
                tag: data.tag || 'aura-notification',
                data: data.data
            } as NotificationOptions);
        } else {
            new Notification(data.title, {
                body: data.body,
                icon: '/thumbnail.png',
                tag: data.tag || 'aura-notification'
            });
        }
    }
    
    /**
     * Send welcome notification after permission granted
     */
    private sendWelcomeNotification(): void {
        setTimeout(() => {
            this.send({
                title: '✨ Welcome to the cosmos',
                body: 'You\'ll now receive updates about events and friends.',
                tag: 'aura-welcome'
            });
        }, 2000);
    }
    
    /**
     * Called when user leaves/minimizes the app
     */
    private onUserLeft(): void {
        const leftAt = Date.now();
        localStorage.setItem('aura_last_active', leftAt.toString());
        
        // Schedule a "come back" notification for 4 hours from now
        this.scheduleNotification('come_back', 4 * 60 * 60 * 1000);
        
        // Schedule streak warning if applicable
        this.scheduleStreakWarning();
    }
    
    /**
     * Called when user returns to the app
     */
    private onUserReturned(): void {
        // Cancel scheduled notifications
        this.cancelScheduled('come_back');
        this.cancelScheduled('streak_warning');
    }
    
    /**
     * Schedule a notification for later
     */
    private scheduleNotification(type: keyof typeof NOTIFICATION_TEMPLATES, delayMs: number, data?: Record<string, any>): void {
        // Clear existing scheduled notification of same type
        this.cancelScheduled(type);
        
        const templates = NOTIFICATION_TEMPLATES[type];
        const template = templates[Math.floor(Math.random() * templates.length)];
        
        let body = template.body;
        if (data) {
            Object.entries(data).forEach(([key, value]) => {
                body = body.replace(`{${key}}`, String(value));
            });
        }
        
        const timeoutId = window.setTimeout(() => {
            this.send({
                title: template.title.replace(/\{(\w+)\}/g, (_, key) => data?.[key] || ''),
                body,
                tag: `aura-${type}`
            });
        }, delayMs);
        
        this.scheduledNotifications.set(type, timeoutId);
    }
    
    /**
     * Cancel a scheduled notification
     */
    private cancelScheduled(type: string): void {
        const timeoutId = this.scheduledNotifications.get(type);
        if (timeoutId) {
            clearTimeout(timeoutId);
            this.scheduledNotifications.delete(type);
        }
    }
    
    /**
     * Schedule streak warning notification
     */
    private scheduleStreakWarning(): void {
        const streakData = localStorage.getItem('aura_streak_data');
        if (!streakData) return;
        
        try {
            const { currentStreak, lastVisit } = JSON.parse(streakData);
            if (currentStreak <= 0) return;
            
            // Calculate when streak would expire (36 hours from last visit)
            const expiresAt = lastVisit + (36 * 60 * 60 * 1000);
            const warningTime = expiresAt - (6 * 60 * 60 * 1000); // Warn 6 hours before
            const now = Date.now();
            
            if (warningTime > now) {
                this.scheduleNotification('streak_warning', warningTime - now, {
                    days: currentStreak,
                    hours: Math.ceil((expiresAt - now) / (60 * 60 * 1000))
                });
            }
        } catch (e) {
            console.error('Failed to parse streak data:', e);
        }
    }
    
    /**
     * Notify about someone trying to connect
     */
    notifySocialActivity(fromName: string): void {
        if (document.hidden && this.permission === 'granted') {
            const templates = NOTIFICATION_TEMPLATES.someone_waiting;
            const template = templates[Math.floor(Math.random() * templates.length)];
            
            this.send({
                title: template.title.replace('{name}', fromName),
                body: template.body.replace('{name}', fromName),
                tag: 'aura-social'
            });
        }
    }
    
    /**
     * Notify about active cosmos
     */
    notifyCosmosActive(count: number): void {
        if (document.hidden && this.permission === 'granted' && count > 10) {
            const templates = NOTIFICATION_TEMPLATES.cosmos_active;
            const template = templates[Math.floor(Math.random() * templates.length)];
            
            this.send({
                title: template.title,
                body: template.body.replace('{count}', count.toString()),
                tag: 'aura-activity'
            });
        }
    }
    
    /**
     * Notify about event starting
     */
    notifyEventStarting(eventName: string, duration: string, bonus: number): void {
        if (this.permission === 'granted') {
            this.send({
                title: `⚡ ${eventName} starting NOW`,
                body: `Don't miss out! ${bonus}x rewards for ${duration}`,
                tag: 'aura-event'
            });
        }
    }
    
    /**
     * Get permission status
     */
    getPermission(): NotificationPermission {
        return this.permission;
    }
    
    /**
     * Check if notifications are enabled
     */
    isEnabled(): boolean {
        return this.permission === 'granted';
    }
}

// Export singleton instance
export const pushNotifications = new PushNotificationManager();

// Auto-initialize
pushNotifications.init();
