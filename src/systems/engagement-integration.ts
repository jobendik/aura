// Engagement Integration Module
// Wires up all addiction/engagement systems to the game

import { addictionManager } from './addiction';
import { sounds } from '../core/sounds';
import { mobileControls } from '../controllers/mobile-controls';
import { EventBus } from './EventBus';
import { CONFIG } from '../core/config';
import { initDailyGiftSystem } from './daily-gift';
import { createShareButton, checkReferralSource } from './viral-share';
import { createTestEvent, startEventTimerUpdate } from './limited-events';
import { pushNotifications } from './push-notifications';
import { returnTriggers } from './return-triggers';

// Initialize return triggers (runs immediately)
void returnTriggers;

/**
 * Initialize all engagement systems
 * Call this after the game starts
 */
export function initEngagementSystems(
    getPlayerPosition: () => { x: number; y: number },
    onlineCount: () => number
): void {
    console.log('🎰 Initializing engagement systems...');

    // Initialize push notifications
    pushNotifications.init();

    // Initialize streak display
    updateStreakDisplay();

    // Start spawning cosmic gifts and mystery encounters
    addictionManager.startGiftSpawning(getPlayerPosition);
    addictionManager.startMysterySpawning();

    // Initialize mobile controls
    mobileControls.init();

    // Listen for level ups to show celebration
    EventBus.on('network:xpGain', (data) => {
        if (data.leveledUp) {
            showLevelUpCelebration(data.newLevel);
        }
    });

    // Listen for streak events
    EventBus.on('addiction:streakIncreased', (data) => {
        updateStreakDisplay();
        showStreakToast(data.streak, data.bonus.title);
    });

    EventBus.on('addiction:streakLost', (data) => {
        updateStreakDisplay();
        showStreakLostToast(data.lostStreak);
    });

    EventBus.on('addiction:streakProtected', () => {
        showStreakProtectedToast();
    });

    // Listen for pending interactions
    EventBus.on('addiction:pendingAdded', () => {
        updatePendingIndicator();
    });

    // Mobile action events
    EventBus.on('mobile:action', (data) => {
        handleMobileAction(data.action);
    });

    EventBus.on('mobile:doubleTap', (data) => {
        if (data.action === 'pulse') {
            EventBus.emit('player:pulse');
        } else if (data.action === 'sing') {
            EventBus.emit('player:sing');
        }
    });

    // Update live counter periodically
    setInterval(() => {
        updateLiveCounter(onlineCount());
    }, 3000);

    // Initial live counter update
    updateLiveCounter(onlineCount());

    // Check if user came from a referral link
    const referrer = checkReferralSource();
    if (referrer) {
        console.log(`🎁 Referred by: ${referrer}`);
    }

    // Create share button (floating action button)
    createShareButton('player', 'You', getPlayerPosition);

    // Initialize daily gift system (shows popup after 3 seconds if available)
    initDailyGiftSystem();

    // Start a test event for demonstration (Double XP for 2 hours)
    // Remove this line in production or make it server-controlled
    setTimeout(() => {
        createTestEvent();
    }, 5000);

    startEventTimerUpdate();

    console.log('✨ Engagement systems initialized');
}

/**
 * Update the streak display in the UI
 */
function updateStreakDisplay(): void {
    const streak = addictionManager.getStreak();
    const streakDisplay = document.getElementById('streak-display');
    const streakCount = document.getElementById('streak-count');
    const streakLabel = document.getElementById('streak-label');

    if (!streakDisplay || !streakCount || !streakLabel) return;

    if (streak.currentStreak > 0) {
        streakDisplay.classList.remove('hidden');
        streakCount.textContent = streak.currentStreak.toString();
        streakLabel.textContent = streak.currentStreak === 1 ? 'day streak' : 'day streak';
    } else {
        streakDisplay.classList.add('hidden');
    }
}

/**
 * Update the live activity counter
 */
function updateLiveCounter(count: number): void {
    const liveCount = document.getElementById('live-count');
    if (liveCount) {
        liveCount.textContent = count.toString();
    }
}

/**
 * Update pending interactions indicator
 */
function updatePendingIndicator(): void {
    const pending = addictionManager.getPendingInteractions();
    const indicator = document.getElementById('pending-indicator');
    const countEl = document.getElementById('pending-count');

    if (!indicator || !countEl) return;

    if (pending.length > 0) {
        indicator.classList.add('show');
        countEl.textContent = pending.length.toString();
    } else {
        indicator.classList.remove('show');
    }
}

/**
 * Show level up celebration
 */
function showLevelUpCelebration(level: number): void {
    const celebration = document.getElementById('level-up-celebration');
    const levelEl = document.getElementById('level-up-level');
    const titleEl = document.getElementById('level-up-title-name');

    if (!celebration || !levelEl || !titleEl) return;

    // Get title for level
    const titles = CONFIG.FORMS;
    const title = titles[Math.min(level - 1, titles.length - 1)] || 'Transcendent';

    levelEl.textContent = level.toString();
    titleEl.textContent = title;
    celebration.classList.add('active');

    // Play level up sound
    sounds.play('level_up');

    // Hide after 3 seconds
    setTimeout(() => {
        celebration.classList.remove('active');
    }, 3000);
}

/**
 * Show streak increase toast
 */
function showStreakToast(streak: number, title: string): void {
    const toast = document.createElement('div');
    toast.className = 'achievement-popup';
    toast.innerHTML = `
        <div class="achievement-popup-icon">🔥</div>
        <div class="achievement-popup-content">
            <div class="achievement-popup-title">Streak Bonus!</div>
            <div class="achievement-popup-name">${streak} day streak - ${title}</div>
        </div>
    `;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 4000);
}

/**
 * Show streak lost toast
 */
function showStreakLostToast(lostStreak: number): void {
    const toast = document.createElement('div');
    toast.className = 'achievement-popup';
    toast.style.borderColor = 'rgba(248, 113, 113, 0.5)';
    toast.style.background = 'linear-gradient(135deg, rgba(248, 113, 113, 0.2), rgba(251, 113, 133, 0.1))';
    toast.innerHTML = `
        <div class="achievement-popup-icon">💔</div>
        <div class="achievement-popup-content">
            <div class="achievement-popup-title">Streak Lost</div>
            <div class="achievement-popup-name">Your ${lostStreak} day streak has ended</div>
        </div>
    `;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 4000);
}

/**
 * Show streak protected toast
 */
function showStreakProtectedToast(): void {
    const toast = document.createElement('div');
    toast.className = 'achievement-popup';
    toast.style.borderColor = 'rgba(74, 222, 128, 0.5)';
    toast.style.background = 'linear-gradient(135deg, rgba(74, 222, 128, 0.2), rgba(110, 231, 183, 0.1))';
    toast.innerHTML = `
        <div class="achievement-popup-icon">🛡️</div>
        <div class="achievement-popup-content">
            <div class="achievement-popup-title">Streak Protected!</div>
            <div class="achievement-popup-name">Your streak was saved (one-time use)</div>
        </div>
    `;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 4000);
}

/**
 * Handle mobile action button presses
 */
function handleMobileAction(action: string): void {
    switch (action) {
        case 'whisper':
            EventBus.emit('ui:showMessageBox', { placeholder: 'Whisper into the void...' });
            break;
        case 'sing':
            EventBus.emit('player:sing');
            break;
        case 'pulse':
            EventBus.emit('player:pulse');
            break;
        case 'emote':
            EventBus.emit('ui:showEmoteWheel', { x: window.innerWidth / 2, y: window.innerHeight - 200 });
            break;
    }
}

/**
 * Get active cosmic gifts for rendering
 */
export function getActiveGifts() {
    return addictionManager.getActiveGifts();
}

/**
 * Get active mystery encounters for rendering
 */
export function getMysteryEncounters() {
    return addictionManager.getMysteryEncounters();
}

/**
 * Attempt to collect a gift
 */
export function collectGift(giftId: string) {
    return addictionManager.collectGift(giftId);
}

/**
 * Get streak bonus multiplier
 */
export function getStreakMultiplier(): number {
    return addictionManager.getStreakBonus().multiplier;
}

/**
 * Add pending interaction (when someone tries to reach offline player)
 */
export function addPendingInteraction(fromId: string, fromName: string, type: 'wave' | 'gift' | 'whisper_attempt' | 'bond_request'): void {
    addictionManager.addPendingInteraction({
        fromId,
        fromName,
        type,
        timestamp: Date.now()
    });
}

/**
 * Cleanup on game end
 */
export function cleanupEngagementSystems(): void {
    addictionManager.destroy();
    mobileControls.destroy();
}
