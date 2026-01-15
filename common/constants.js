"use strict";
// Shared constants between client and server
Object.defineProperty(exports, "__esModule", { value: true });
exports.SHARED_CONFIG = exports.LEVEL_XP = exports.FORMS = exports.REALMS = void 0;
exports.getLevel = getLevel;
exports.getForm = getForm;
exports.REALMS = {
    genesis: { name: 'Genesis', icon: '🌌', unlock: 1 },
    nebula: { name: 'Nebula Gardens', icon: '🌸', unlock: 1 },
    void: { name: 'The Void', icon: '🌑', unlock: 1 },
    starforge: { name: 'Starforge', icon: '🔥', unlock: 5 },
    sanctuary: { name: 'Sanctuary', icon: '🏛️', unlock: 10 }
};
exports.FORMS = ['Spark', 'Ember', 'Flame', 'Prism', 'Nova', 'Celestial', 'Eternal', 'Infinite'];
exports.LEVEL_XP = [0, 100, 300, 700, 1500, 3000, 6000, 12000, 25000];
// Shared configuration values
exports.SHARED_CONFIG = {
    // Network
    PLAYER_TIMEOUT: 10000,
    PLAYER_SYNC_INTERVAL: 2000,
    POSITION_SYNC_INTERVAL: 3000,
    // Bot/Guardian System
    MIN_POPULATION: 5,
    BOT_SPAWN_CHANCE: 0.01,
    BOT_REMOVE_CHANCE: 0.005,
    // Limits
    MAX_ECHOES_PER_REALM: 1000,
    MAX_WHISPER_LENGTH: 500,
    MAX_ECHO_LENGTH: 200,
    MAX_PLAYER_NAME: 30,
    // Gameplay
    SPAWN_RADIUS: 800,
    CAMPFIRE_RADIUS: 1200,
    VIEW_BASE: 520,
    // XP gains
    XP_STAR_LIT: 3,
    XP_ECHO_PLANTED: 5,
    XP_WHISPER_SENT: 1,
    XP_BOND_TICK: 1
};
/**
 * Get player level from XP
 */
function getLevel(xp) {
    for (let i = exports.LEVEL_XP.length - 1; i >= 0; i--) {
        if (xp >= exports.LEVEL_XP[i])
            return i + 1;
    }
    return 1;
}
/**
 * Get player form/title based on level
 */
function getForm(level) {
    return exports.FORMS[Math.min(level - 1, exports.FORMS.length - 1)];
}
