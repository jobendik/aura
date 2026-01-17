// Addictive Sound Design System
// Satisfying audio feedback for maximum engagement

import { EventBus } from '../systems/EventBus';

// ===== TYPES =====

type SoundName =
    | 'xp_gain'
    | 'level_up'
    | 'gift_spawn'
    | 'gift_collect_common'
    | 'gift_collect_rare'
    | 'gift_collect_epic'
    | 'gift_collect_legendary'
    | 'streak_increase'
    | 'streak_lost'
    | 'mystery_spawn'
    | 'mystery_encounter'
    | 'bond_formed'
    | 'whisper_receive'
    | 'whisper_send'
    | 'heartbeat'
    | 'notification'
    | 'achievement'
    | 'click'
    | 'hover';

interface SoundConfig {
    frequency?: number;
    duration: number;
    type: OscillatorType;
    volume: number;
    attack?: number;
    decay?: number;
    notes?: number[];  // For multi-note sounds
    delay?: number;
}

// ===== SOUND DEFINITIONS =====

const SOUNDS: Record<SoundName, SoundConfig> = {
    xp_gain: {
        frequency: 880,
        duration: 0.15,
        type: 'sine',
        volume: 0.3,
        attack: 0.01,
        decay: 0.1
    },
    level_up: {
        notes: [523.25, 659.25, 783.99, 1046.5],  // C5, E5, G5, C6
        duration: 0.6,
        type: 'sine',
        volume: 0.4,
        attack: 0.02,
        delay: 0.12
    },
    gift_spawn: {
        notes: [440, 554.37],  // A4, C#5
        duration: 0.25,
        type: 'triangle',
        volume: 0.25,
        delay: 0.08
    },
    gift_collect_common: {
        frequency: 587.33,
        duration: 0.12,
        type: 'sine',
        volume: 0.25
    },
    gift_collect_rare: {
        notes: [587.33, 739.99],  // D5, F#5
        duration: 0.2,
        type: 'sine',
        volume: 0.3,
        delay: 0.06
    },
    gift_collect_epic: {
        notes: [587.33, 739.99, 880],  // D5, F#5, A5
        duration: 0.3,
        type: 'sine',
        volume: 0.35,
        delay: 0.08
    },
    gift_collect_legendary: {
        notes: [523.25, 659.25, 783.99, 1046.5, 1318.51],  // C-E-G-C-E arpeggio
        duration: 0.8,
        type: 'sine',
        volume: 0.5,
        delay: 0.1
    },
    streak_increase: {
        notes: [392, 523.25, 659.25],  // G4, C5, E5
        duration: 0.4,
        type: 'sine',
        volume: 0.35,
        delay: 0.1
    },
    streak_lost: {
        notes: [349.23, 293.66, 220],  // F4, D4, A3 (descending sad)
        duration: 0.5,
        type: 'sine',
        volume: 0.25,
        delay: 0.15
    },
    mystery_spawn: {
        notes: [220, 277.18, 329.63, 440],  // Mysterious ascending
        duration: 0.8,
        type: 'triangle',
        volume: 0.2,
        delay: 0.15
    },
    mystery_encounter: {
        notes: [261.63, 329.63, 392, 523.25],
        duration: 0.5,
        type: 'sine',
        volume: 0.4,
        delay: 0.1
    },
    bond_formed: {
        notes: [392, 493.88, 587.33],  // G4, B4, D5
        duration: 0.35,
        type: 'sine',
        volume: 0.3,
        delay: 0.08
    },
    whisper_receive: {
        notes: [659.25, 783.99],  // E5, G5
        duration: 0.15,
        type: 'sine',
        volume: 0.2,
        delay: 0.05
    },
    whisper_send: {
        frequency: 523.25,
        duration: 0.08,
        type: 'sine',
        volume: 0.15
    },
    heartbeat: {
        notes: [80, 60],  // Deep bass pulses
        duration: 0.3,
        type: 'sine',
        volume: 0.15,
        delay: 0.15
    },
    notification: {
        notes: [783.99, 987.77],  // G5, B5
        duration: 0.2,
        type: 'sine',
        volume: 0.35,
        delay: 0.06
    },
    achievement: {
        notes: [523.25, 659.25, 783.99, 1046.5, 1318.51, 1567.98],  // Full fanfare
        duration: 1.0,
        type: 'sine',
        volume: 0.45,
        delay: 0.12
    },
    click: {
        frequency: 1200,
        duration: 0.03,
        type: 'square',
        volume: 0.1
    },
    hover: {
        frequency: 800,
        duration: 0.02,
        type: 'sine',
        volume: 0.05
    }
};

// ===== SOUND MANAGER =====

class SoundManager {
    private audioContext: AudioContext | null = null;
    private masterGain: GainNode | null = null;
    private enabled: boolean = true;
    private volume: number = 0.7;
    private heartbeatInterval: number | null = null;
    private heartbeatIntensity: number = 0;

    constructor() {
        this.initOnInteraction();
    }

    private initOnInteraction(): void {
        const init = () => {
            if (!this.audioContext) {
                this.audioContext = new AudioContext();
                this.masterGain = this.audioContext.createGain();
                this.masterGain.connect(this.audioContext.destination);
                this.masterGain.gain.value = this.volume;
            }
            if (this.audioContext.state === 'suspended') {
                this.audioContext.resume();
            }
        };

        document.addEventListener('click', init, { once: true });
        document.addEventListener('touchstart', init, { once: true });
        document.addEventListener('keydown', init, { once: true });
    }

    play(name: SoundName): void {
        if (!this.enabled || !this.audioContext || !this.masterGain) return;

        const config = SOUNDS[name];
        if (!config) return;

        try {
            if (config.notes) {
                this.playArpeggio(config);
            } else if (config.frequency) {
                this.playTone(config.frequency, config);
            }
        } catch (e) {
            console.warn('Sound play failed:', e);
        }
    }

    private playTone(freq: number, config: SoundConfig): void {
        if (!this.audioContext || !this.masterGain) return;

        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.type = config.type;
        osc.frequency.value = freq;

        const now = this.audioContext.currentTime;
        const attack = config.attack || 0.01;
        const decay = config.decay || config.duration * 0.8;

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(config.volume, now + attack);
        gain.gain.exponentialRampToValueAtTime(0.01, now + attack + decay);

        osc.start(now);
        osc.stop(now + config.duration);
    }

    private playArpeggio(config: SoundConfig): void {
        if (!config.notes) return;

        const delay = config.delay || 0.1;
        config.notes.forEach((freq, i) => {
            setTimeout(() => {
                this.playTone(freq, {
                    ...config,
                    duration: config.duration / config.notes!.length + 0.1
                });
            }, i * delay * 1000);
        });
    }

    // Heartbeat effect - intensifies when close to others
    startHeartbeat(): void {
        if (this.heartbeatInterval) return;

        this.heartbeatInterval = window.setInterval(() => {
            if (this.heartbeatIntensity > 0) {
                const config = { ...SOUNDS.heartbeat };
                config.volume = 0.08 + this.heartbeatIntensity * 0.15;
                this.playArpeggio(config);
            }
        }, 800);  // ~75 BPM
    }

    stopHeartbeat(): void {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }

    setHeartbeatIntensity(intensity: number): void {
        this.heartbeatIntensity = Math.max(0, Math.min(1, intensity));
    }

    setEnabled(enabled: boolean): void {
        this.enabled = enabled;
    }

    setVolume(vol: number): void {
        this.volume = Math.max(0, Math.min(1, vol));
        if (this.masterGain) {
            this.masterGain.gain.value = this.volume;
        }
    }

    isEnabled(): boolean {
        return this.enabled;
    }

    getVolume(): number {
        return this.volume;
    }
}

// Export singleton
export const sounds = new SoundManager();

// ===== AUTO-PLAY ON EVENTS =====

// XP gains
EventBus.on('network:xpGain', () => sounds.play('xp_gain'));

// Level ups
EventBus.on('player:levelUp', () => sounds.play('level_up'));

// Addiction events
EventBus.on('addiction:giftSpawned', () => sounds.play('gift_spawn'));
EventBus.on('addiction:giftCollected', (data: any) => {
    const rarity = data.gift?.rarity || 'common';
    sounds.play(`gift_collect_${rarity}` as SoundName);
});
EventBus.on('addiction:streakIncreased', () => sounds.play('streak_increase'));
EventBus.on('addiction:streakLost', () => sounds.play('streak_lost'));
EventBus.on('addiction:mysterySpawned', () => sounds.play('mystery_spawn'));

// Social
EventBus.on('network:whisper', () => sounds.play('whisper_receive'));
EventBus.on('network:connectionMade', () => sounds.play('bond_formed'));

// Achievements
EventBus.on('achievement:unlocked', () => sounds.play('achievement'));

// Notifications
EventBus.on('addiction:pendingAdded', () => sounds.play('notification'));
