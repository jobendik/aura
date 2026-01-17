// Proximity Effects System
// Heartbeat effect when close to others, "almost there" progress bars, bond decay warnings

import { EventBus } from './EventBus';
import { sounds } from '../core/sounds';

// ===== HEARTBEAT PROXIMITY =====

interface HeartbeatState {
    active: boolean;
    intensity: number;  // 0-1
    lastUpdate: number;
}

const heartbeatState: HeartbeatState = {
    active: false,
    intensity: 0,
    lastUpdate: 0
};

/**
 * Update heartbeat based on proximity to nearest player
 */
export function updateHeartbeat(nearestDistance: number, voiceRange: number): void {
    const now = Date.now();

    // Only update every 100ms
    if (now - heartbeatState.lastUpdate < 100) return;
    heartbeatState.lastUpdate = now;

    if (nearestDistance < voiceRange) {
        // Calculate intensity based on distance (closer = stronger)
        const intensity = Math.max(0, 1 - (nearestDistance / voiceRange));
        heartbeatState.intensity = intensity;

        if (!heartbeatState.active && intensity > 0.3) {
            heartbeatState.active = true;
            sounds.startHeartbeat();
        }

        sounds.setHeartbeatIntensity(intensity);
    } else {
        if (heartbeatState.active) {
            heartbeatState.active = false;
            sounds.stopHeartbeat();
        }
        heartbeatState.intensity = 0;
    }
}

/**
 * Get current heartbeat intensity for visual effects
 */
export function getHeartbeatIntensity(): number {
    return heartbeatState.intensity;
}

// ===== "ALMOST THERE" PROGRESS BARS =====

interface ProgressGoal {
    id: string;
    label: string;
    current: number;
    target: number;
    icon: string;
    expiresAt?: number;  // For time-limited goals
}

const activeGoals: ProgressGoal[] = [];

/**
 * Add or update a progress goal
 */
export function updateProgressGoal(goal: ProgressGoal): void {
    const existing = activeGoals.findIndex(g => g.id === goal.id);
    if (existing >= 0) {
        activeGoals[existing] = goal;
    } else {
        activeGoals.push(goal);
    }

    renderProgressBars();

    // Check if nearly complete (trigger dopamine hook)
    const progress = goal.current / goal.target;
    if (progress >= 0.8 && progress < 1) {
        showAlmostThereNotification(goal);
    }
}

/**
 * Remove a progress goal
 */
export function removeProgressGoal(id: string): void {
    const idx = activeGoals.findIndex(g => g.id === id);
    if (idx >= 0) {
        activeGoals.splice(idx, 1);
        renderProgressBars();
    }
}

/**
 * Complete a goal (with celebration)
 */
export function completeGoal(id: string): void {
    const goal = activeGoals.find(g => g.id === id);
    if (goal) {
        EventBus.emit('ui:toast', { message: `✅ ${goal.label} complete!`, type: 'success' });
        sounds.play('achievement');
        removeProgressGoal(id);
    }
}

/**
 * Show "almost there" notification
 */
function showAlmostThereNotification(goal: ProgressGoal): void {
    const remaining = goal.target - goal.current;
    const percent = Math.round((goal.current / goal.target) * 100);

    // Only show once per goal
    const shownKey = `almost_shown_${goal.id}`;
    if (sessionStorage.getItem(shownKey)) return;
    sessionStorage.setItem(shownKey, 'true');

    EventBus.emit('ui:toast', {
        message: `🔥 Almost there! ${remaining} more for ${goal.label} (${percent}%)`,
        type: 'info'
    });
}

/**
 * Render progress bars UI
 */
function renderProgressBars(): void {
    let container = document.getElementById('progress-goals');

    if (activeGoals.length === 0) {
        container?.remove();
        return;
    }

    if (!container) {
        container = document.createElement('div');
        container.id = 'progress-goals';
        container.className = 'progress-goals';
        document.body.appendChild(container);

        // Add styles
        if (!document.getElementById('progress-goals-style')) {
            const style = document.createElement('style');
            style.id = 'progress-goals-style';
            style.textContent = `
                .progress-goals {
                    position: fixed;
                    bottom: 20px;
                    left: 20px;
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                    z-index: 90;
                    pointer-events: none;
                }
                
                @media (max-width: 768px) {
                    .progress-goals {
                        left: 50%;
                        transform: translateX(-50%);
                        bottom: calc(320px + env(safe-area-inset-bottom));
                    }
                }
                
                .progress-goal {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 8px 14px;
                    background: rgba(20, 25, 35, 0.85);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 12px;
                    backdrop-filter: blur(12px);
                    min-width: 200px;
                }
                
                .progress-goal-icon {
                    font-size: 1.2rem;
                }
                
                .progress-goal-info {
                    flex: 1;
                }
                
                .progress-goal-label {
                    font-size: 0.75rem;
                    color: rgba(255, 255, 255, 0.7);
                    margin-bottom: 4px;
                }
                
                .progress-goal-bar {
                    height: 6px;
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 3px;
                    overflow: hidden;
                }
                
                .progress-goal-fill {
                    height: 100%;
                    background: linear-gradient(90deg, var(--accent), var(--lavender));
                    border-radius: 3px;
                    transition: width 0.3s ease;
                }
                
                .progress-goal.almost .progress-goal-fill {
                    background: linear-gradient(90deg, var(--amber), var(--coral));
                    animation: pulse-glow 1s ease-in-out infinite;
                }
                
                @keyframes pulse-glow {
                    0%, 100% { box-shadow: 0 0 5px rgba(251, 191, 36, 0.3); }
                    50% { box-shadow: 0 0 15px rgba(251, 191, 36, 0.6); }
                }
                
                .progress-goal-count {
                    font-size: 0.7rem;
                    color: var(--accent);
                    font-family: 'JetBrains Mono', monospace;
                }
            `;
            document.head.appendChild(style);
        }
    }

    container.innerHTML = activeGoals.map(goal => {
        const percent = Math.min(100, (goal.current / goal.target) * 100);
        const isAlmost = percent >= 80 && percent < 100;
        return `
            <div class="progress-goal ${isAlmost ? 'almost' : ''}">
                <div class="progress-goal-icon">${goal.icon}</div>
                <div class="progress-goal-info">
                    <div class="progress-goal-label">${goal.label}</div>
                    <div class="progress-goal-bar">
                        <div class="progress-goal-fill" style="width: ${percent}%"></div>
                    </div>
                </div>
                <div class="progress-goal-count">${goal.current}/${goal.target}</div>
            </div>
        `;
    }).join('');
}

// ===== BOND DECAY WARNINGS =====

interface BondWarning {
    friendId: string;
    friendName: string;
    currentStrength: number;
    decayRate: number;
}

/**
 * Check for decaying bonds and warn user
 */
export function checkBondDecay(bonds: Map<string, number>, friendNames: Map<string, string>): BondWarning[] {
    const warnings: BondWarning[] = [];

    bonds.forEach((strength, friendId) => {
        // Warn if bond is decaying below 50%
        if (strength < 50 && strength > 20) {
            const name = friendNames.get(friendId) || 'friend';
            warnings.push({
                friendId,
                friendName: name,
                currentStrength: strength,
                decayRate: 1  // % per hour (configurable)
            });
        }
    });

    return warnings;
}

/**
 * Show bond decay warning
 */
export function showBondDecayWarning(warning: BondWarning): void {
    EventBus.emit('ui:toast', {
        message: `💔 Your bond with ${warning.friendName} is fading... Visit them soon!`,
        type: 'warning'
    });
}

// ===== LEADERBOARD =====

interface LeaderboardEntry {
    playerId: string;
    playerName: string;
    score: number;
    rank: number;
}

let currentLeaderboard: LeaderboardEntry[] = [];

/**
 * Update leaderboard data
 */
export function updateLeaderboard(entries: LeaderboardEntry[]): void {
    currentLeaderboard = entries;
    renderLeaderboard();
}

/**
 * Render leaderboard UI
 */
function renderLeaderboard(): void {
    let panel = document.getElementById('leaderboard-panel');

    if (currentLeaderboard.length === 0) {
        panel?.remove();
        return;
    }

    if (!panel) {
        // Leaderboard is shown in a panel, not always visible
        // This just prepares the data for when the panel is opened
        return;
    }

    const list = panel.querySelector('.leaderboard-list');
    if (!list) return;

    list.innerHTML = currentLeaderboard.slice(0, 10).map((entry, i) => {
        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`;
        return `
            <div class="leaderboard-entry ${i < 3 ? 'top-3' : ''}">
                <span class="leaderboard-rank">${medal}</span>
                <span class="leaderboard-name">${entry.playerName}</span>
                <span class="leaderboard-score">${entry.score}</span>
            </div>
        `;
    }).join('');
}

/**
 * Get current leaderboard
 */
export function getLeaderboard(): LeaderboardEntry[] {
    return currentLeaderboard;
}
