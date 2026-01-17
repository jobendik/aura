// Limited-Time Events System
// FOMO-inducing time-limited events, realms, and bonuses

import { EventBus } from './EventBus';

export interface LimitedEvent {
    id: string;
    name: string;
    description: string;
    icon: string;
    startTime: number;
    endTime: number;
    type: 'double_xp' | 'mystery_realm' | 'gift_shower' | 'social_boost' | 'cosmic_bloom';
    bonus: number;  // Multiplier or bonus value
    realm?: string; // If locked to specific realm
}

// Current active events
const activeEvents: LimitedEvent[] = [];

// Event schedule (can be loaded from server)
const upcomingEvents: LimitedEvent[] = [];

/**
 * Check if an event is currently active
 */
function isEventActive(event: LimitedEvent): boolean {
    const now = Date.now();
    return now >= event.startTime && now < event.endTime;
}

/**
 * Get remaining time for an event
 */
export function getEventTimeRemaining(event: LimitedEvent): number {
    return Math.max(0, event.endTime - Date.now());
}

/**
 * Format time remaining as string
 */
export function formatTimeRemaining(ms: number): string {
    if (ms <= 0) return 'Ended';

    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);

    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
        return `${minutes}m ${seconds}s`;
    } else {
        return `${seconds}s`;
    }
}

/**
 * Update active events
 */
export function updateEvents(): LimitedEvent[] {
    const now = Date.now();

    // Remove expired events
    for (let i = activeEvents.length - 1; i >= 0; i--) {
        if (now >= activeEvents[i].endTime) {
            const expired = activeEvents.splice(i, 1)[0];
            EventBus.emit('event:ended', { eventId: expired.id, eventName: expired.name });
            showEventEndedNotification(expired);
        }
    }

    // Check for newly active events
    for (let i = upcomingEvents.length - 1; i >= 0; i--) {
        const event = upcomingEvents[i];
        if (isEventActive(event)) {
            upcomingEvents.splice(i, 1);
            activeEvents.push(event);
            EventBus.emit('event:started', { eventId: event.id, eventName: event.name });
            showEventStartedNotification(event);
        }
    }

    return activeEvents;
}

/**
 * Get all active events
 */
export function getActiveEvents(): LimitedEvent[] {
    return activeEvents;
}

/**
 * Get XP multiplier from active events
 */
export function getEventXPMultiplier(): number {
    let multiplier = 1;

    for (const event of activeEvents) {
        if (event.type === 'double_xp') {
            multiplier *= event.bonus;
        }
    }

    return multiplier;
}

/**
 * Check if a realm is event-locked
 */
export function isRealmEventLocked(realmId: string): LimitedEvent | null {
    for (const event of activeEvents) {
        if (event.type === 'mystery_realm' && event.realm === realmId) {
            return event;
        }
    }
    return null;
}

/**
 * Show event started notification
 */
function showEventStartedNotification(event: LimitedEvent): void {
    // Create full-screen event announcement
    const announcement = document.createElement('div');
    announcement.className = 'event-announcement';
    announcement.innerHTML = `
        <div class="event-announcement-content">
            <div class="event-announcement-icon">${event.icon}</div>
            <div class="event-announcement-title">EVENT STARTED!</div>
            <div class="event-announcement-name">${event.name}</div>
            <div class="event-announcement-desc">${event.description}</div>
            <div class="event-announcement-timer">
                Ends in: <span id="event-timer">${formatTimeRemaining(getEventTimeRemaining(event))}</span>
            </div>
        </div>
    `;

    document.body.appendChild(announcement);

    // Add styles
    addEventStyles();

    // Auto-close
    setTimeout(() => {
        announcement.style.opacity = '0';
        setTimeout(() => announcement.remove(), 500);
    }, 4000);

    // Update UI
    updateEventBanner();
}

/**
 * Show event ended notification
 */
function showEventEndedNotification(event: LimitedEvent): void {
    EventBus.emit('ui:toast', {
        message: `⏰ ${event.name} has ended!`,
        type: 'info'
    });

    updateEventBanner();
}

/**
 * Update event banner in UI
 */
function updateEventBanner(): void {
    let banner = document.getElementById('event-banner');

    if (activeEvents.length === 0) {
        banner?.remove();
        return;
    }

    if (!banner) {
        banner = document.createElement('div');
        banner.id = 'event-banner';
        banner.className = 'event-banner';
        document.body.appendChild(banner);
    }

    const event = activeEvents[0]; // Show first active event
    const remaining = getEventTimeRemaining(event);

    banner.innerHTML = `
        <span class="event-banner-icon">${event.icon}</span>
        <span class="event-banner-name">${event.name}</span>
        <span class="event-banner-timer">${formatTimeRemaining(remaining)}</span>
    `;

    // Pulsing effect when time is low
    if (remaining < 5 * 60 * 1000) { // Less than 5 minutes
        banner.classList.add('urgent');
    } else {
        banner.classList.remove('urgent');
    }
}

/**
 * Add event styles
 */
function addEventStyles(): void {
    if (document.getElementById('event-styles')) return;

    const style = document.createElement('style');
    style.id = 'event-styles';
    style.textContent = `
        .event-announcement {
            position: fixed;
            inset: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            background: radial-gradient(circle, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.95) 100%);
            z-index: 900;
            animation: fade-in 0.3s ease;
            transition: opacity 0.5s ease;
        }
        
        .event-announcement-content {
            text-align: center;
            animation: event-pop 0.5s ease;
        }
        
        @keyframes event-pop {
            0% { transform: scale(0); opacity: 0; }
            50% { transform: scale(1.1); }
            100% { transform: scale(1); opacity: 1; }
        }
        
        .event-announcement-icon {
            font-size: 5rem;
            margin-bottom: 16px;
            animation: event-pulse 1s ease-in-out infinite;
        }
        
        @keyframes event-pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.1); }
        }
        
        .event-announcement-title {
            font-size: 1.2rem;
            font-weight: 700;
            color: var(--amber);
            letter-spacing: 0.3em;
            margin-bottom: 8px;
        }
        
        .event-announcement-name {
            font-size: 2.5rem;
            font-weight: 700;
            color: white;
            margin-bottom: 12px;
            text-shadow: 0 0 30px rgba(251, 191, 36, 0.5);
        }
        
        .event-announcement-desc {
            font-size: 1.1rem;
            color: var(--text-secondary);
            margin-bottom: 16px;
            max-width: 400px;
        }
        
        .event-announcement-timer {
            font-size: 1rem;
            color: var(--coral);
            font-family: 'JetBrains Mono', monospace;
        }
        
        .event-banner {
            position: fixed;
            top: 10px;
            left: 50%;
            transform: translateX(-50%);
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 8px 16px;
            background: linear-gradient(135deg, rgba(251, 191, 36, 0.15), rgba(251, 113, 133, 0.15));
            border: 1px solid rgba(251, 191, 36, 0.3);
            border-radius: 20px;
            backdrop-filter: blur(12px);
            z-index: 200;
            cursor: pointer;
            animation: banner-glow 2s ease-in-out infinite;
        }
        
        @keyframes banner-glow {
            0%, 100% { box-shadow: 0 0 10px rgba(251, 191, 36, 0.2); }
            50% { box-shadow: 0 0 20px rgba(251, 191, 36, 0.4); }
        }
        
        .event-banner.urgent {
            animation: banner-urgent 0.5s ease-in-out infinite;
            border-color: rgba(251, 113, 133, 0.5);
        }
        
        @keyframes banner-urgent {
            0%, 100% { transform: translateX(-50%) scale(1); }
            50% { transform: translateX(-50%) scale(1.02); }
        }
        
        .event-banner-icon {
            font-size: 1.2rem;
        }
        
        .event-banner-name {
            font-weight: 600;
            color: white;
        }
        
        .event-banner-timer {
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.85rem;
            color: var(--amber);
        }
    `;
    document.head.appendChild(style);
}

/**
 * Create a test event (for development)
 */
export function createTestEvent(): void {
    const testEvent: LimitedEvent = {
        id: 'test_double_xp',
        name: 'Double XP Weekend',
        description: 'Earn 2x XP from all activities!',
        icon: '⚡',
        startTime: Date.now(),
        endTime: Date.now() + (2 * 60 * 60 * 1000), // 2 hours
        type: 'double_xp',
        bonus: 2
    };

    activeEvents.push(testEvent);
    showEventStartedNotification(testEvent);

    // Start timer update
    startEventTimerUpdate();
}

/**
 * Start periodic timer updates
 */
let timerInterval: ReturnType<typeof setInterval> | null = null;

export function startEventTimerUpdate(): void {
    if (timerInterval) return;

    timerInterval = setInterval(() => {
        updateEvents();
        updateEventBanner();
    }, 1000);
}

/**
 * Stop timer updates
 */
export function stopEventTimerUpdate(): void {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

/**
 * Schedule a cosmic bloom event (random XP/gift shower)
 */
export function scheduleCosmicBloom(delayMs: number = 0): void {
    const bloomEvent: LimitedEvent = {
        id: `bloom_${Date.now()}`,
        name: 'Cosmic Bloom',
        description: 'Gifts are raining from the cosmos!',
        icon: '🌸',
        startTime: Date.now() + delayMs,
        endTime: Date.now() + delayMs + (5 * 60 * 1000), // 5 minutes
        type: 'cosmic_bloom',
        bonus: 3 // 3x gift spawn rate
    };

    if (delayMs === 0) {
        activeEvents.push(bloomEvent);
        showEventStartedNotification(bloomEvent);
    } else {
        upcomingEvents.push(bloomEvent);
    }

    startEventTimerUpdate();
}

// Initialize event update loop
addEventStyles();
