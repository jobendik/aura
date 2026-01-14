"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BOT_THOUGHTS = void 0;
exports.createBot = createBot;
exports.updateBot = updateBot;
exports.shouldBotSing = shouldBotSing;
exports.shouldBotSpeak = shouldBotSpeak;
exports.getRandomBotThought = getRandomBotThought;
exports.resetBotActionTimer = resetBotActionTimer;
exports.resetBotThinkTimer = resetBotThinkTimer;
// Shared Bot/Guardian logic between client and server
const constants_1 = require("./constants");
/**
 * Bot thoughts - messages bots say occasionally
 */
exports.BOT_THOUGHTS = [
    "Do you hear the music?",
    "We drift together...",
    "The light is strong here",
    "I'm waiting for more",
    "Do you see the stars?",
    "Welcome, wanderer",
    "The cosmos breathes",
    "Not alone anymore",
    "Time flows differently here",
    "Every connection matters",
    "The void listens",
    "Stars remember us"
];
/**
 * Create a new bot with default values
 */
function createBot(x, y, realm = 'genesis') {
    return {
        id: 'bot-' + Math.random().toString(36).substr(2, 9),
        x,
        y,
        vx: 0,
        vy: 0,
        hue: 180 + Math.random() * 60, // Bluish tones
        name: 'Guardian',
        xp: 100 + Math.random() * 800,
        moveAngle: Math.random() * Math.PI * 2,
        timer: 0,
        actionTimer: 0,
        thinkTimer: 0,
        realm
    };
}
/**
 * Update bot position and timers
 */
function updateBot(bot, targetX, targetY) {
    bot.timer++;
    bot.actionTimer++;
    bot.thinkTimer++;
    // Change movement direction
    if (Math.random() < 0.02) {
        bot.moveAngle += (Math.random() - 0.5) * 2;
    }
    // Move toward target if provided (Social Gravity)
    if (targetX !== undefined && targetY !== undefined) {
        const distToTarget = Math.hypot(bot.x - targetX, bot.y - targetY);
        if (distToTarget < 400 && distToTarget > 100) {
            const angleToTarget = Math.atan2(targetY - bot.y, targetX - bot.x);
            bot.moveAngle = bot.moveAngle * 0.95 + angleToTarget * 0.05;
        }
    }
    // Stay near campfire (center)
    const distToCenter = Math.hypot(bot.x, bot.y);
    if (distToCenter > constants_1.SHARED_CONFIG.CAMPFIRE_RADIUS) {
        const angleToCenter = Math.atan2(-bot.y, -bot.x);
        bot.moveAngle = bot.moveAngle * 0.9 + angleToCenter * 0.1;
    }
    // Apply movement with friction
    bot.vx += Math.cos(bot.moveAngle) * 0.2;
    bot.vy += Math.sin(bot.moveAngle) * 0.2;
    bot.vx *= 0.94;
    bot.vy *= 0.94;
    bot.x += bot.vx;
    bot.y += bot.vy;
}
/**
 * Check if bot should sing
 */
function shouldBotSing(bot) {
    return bot.actionTimer > 300 && Math.random() < 0.005;
}
/**
 * Check if bot should speak a thought
 */
function shouldBotSpeak(bot) {
    return bot.thinkTimer > 500 && Math.random() < 0.002;
}
/**
 * Get a random bot thought
 */
function getRandomBotThought() {
    return exports.BOT_THOUGHTS[Math.floor(Math.random() * exports.BOT_THOUGHTS.length)];
}
/**
 * Reset bot action timer after performing action
 */
function resetBotActionTimer(bot) {
    bot.actionTimer = 0;
}
/**
 * Reset bot think timer after speaking
 */
function resetBotThinkTimer(bot) {
    bot.thinkTimer = 0;
}
