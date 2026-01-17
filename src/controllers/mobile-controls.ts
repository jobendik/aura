// Mobile Controls System
// Touch-optimized controls for maximum mobile engagement

import { EventBus } from '../systems/EventBus';

// ===== TYPES =====

interface TouchState {
    id: number;
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
    startTime: number;
}

interface JoystickState {
    active: boolean;
    centerX: number;
    centerY: number;
    currentX: number;
    currentY: number;
    angle: number;
    magnitude: number;  // 0-1
}

interface MobileControlsConfig {
    joystickSize: number;
    joystickDeadzone: number;
    tapMoveEnabled: boolean;
    hapticEnabled: boolean;
    doubleTapAction: 'pulse' | 'sing' | 'emote';
}

// ===== CONSTANTS =====

const DEFAULT_CONFIG: MobileControlsConfig = {
    joystickSize: 120,
    joystickDeadzone: 0.15,
    tapMoveEnabled: true,
    hapticEnabled: true,
    doubleTapAction: 'pulse'
};

const DOUBLE_TAP_THRESHOLD = 300;  // ms
const LONG_PRESS_THRESHOLD = 500;  // ms
const SWIPE_THRESHOLD = 50;  // pixels

// ===== MOBILE CONTROLS MANAGER =====

class MobileControlsManager {
    private config: MobileControlsConfig;
    private joystick: JoystickState;
    private touches: Map<number, TouchState> = new Map();
    private joystickElement: HTMLElement | null = null;
    private joystickKnob: HTMLElement | null = null;
    private lastTapTime: number = 0;
    private lastTapX: number = 0;
    private lastTapY: number = 0;
    private longPressTimer: number | null = null;
    private isInitialized: boolean = false;
    private moveTarget: { x: number; y: number } | null = null;

    constructor(config: Partial<MobileControlsConfig> = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.joystick = {
            active: false,
            centerX: 0,
            centerY: 0,
            currentX: 0,
            currentY: 0,
            angle: 0,
            magnitude: 0
        };
    }

    init(): void {
        if (this.isInitialized) return;
        if (!this.isMobile()) return;

        this.createJoystickUI();
        this.bindTouchEvents();
        this.isInitialized = true;

        console.log('📱 Mobile controls initialized');
    }

    private isMobile(): boolean {
        return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    }

    private createJoystickUI(): void {
        // Create joystick container
        this.joystickElement = document.createElement('div');
        this.joystickElement.id = 'mobile-joystick';
        this.joystickElement.innerHTML = `
            <div class="joystick-base">
                <div class="joystick-knob"></div>
            </div>
        `;
        document.body.appendChild(this.joystickElement);

        this.joystickKnob = this.joystickElement.querySelector('.joystick-knob');

        // Add styles
        const style = document.createElement('style');
        style.textContent = `
            #mobile-joystick {
                position: fixed;
                bottom: 100px;
                left: 30px;
                z-index: 1000;
                pointer-events: auto;
                display: none;
            }
            
            @media (max-width: 768px), (pointer: coarse) {
                #mobile-joystick {
                    display: block;
                }
            }
            
            .joystick-base {
                width: ${this.config.joystickSize}px;
                height: ${this.config.joystickSize}px;
                border-radius: 50%;
                background: rgba(255, 255, 255, 0.08);
                border: 2px solid rgba(255, 255, 255, 0.15);
                backdrop-filter: blur(10px);
                display: flex;
                align-items: center;
                justify-content: center;
                touch-action: none;
            }
            
            .joystick-knob {
                width: ${this.config.joystickSize * 0.4}px;
                height: ${this.config.joystickSize * 0.4}px;
                border-radius: 50%;
                background: linear-gradient(135deg, rgba(125, 211, 252, 0.6), rgba(125, 211, 252, 0.3));
                border: 2px solid rgba(125, 211, 252, 0.5);
                box-shadow: 0 0 20px rgba(125, 211, 252, 0.3);
                transition: transform 0.05s ease-out;
            }
            
            .joystick-knob.active {
                transform: scale(1.1);
                box-shadow: 0 0 30px rgba(125, 211, 252, 0.5);
            }
            
            /* Mobile action buttons */
            #mobile-actions {
                position: fixed;
                bottom: 100px;
                right: 20px;
                display: none;
                flex-direction: column;
                gap: 12px;
                z-index: 1000;
            }
            
            @media (max-width: 768px), (pointer: coarse) {
                #mobile-actions {
                    display: flex;
                }
            }
            
            .mobile-action-btn {
                width: 56px;
                height: 56px;
                border-radius: 50%;
                border: 2px solid rgba(255, 255, 255, 0.2);
                background: rgba(20, 25, 35, 0.85);
                backdrop-filter: blur(12px);
                font-size: 24px;
                display: grid;
                place-items: center;
                touch-action: manipulation;
                -webkit-tap-highlight-color: transparent;
                transition: all 0.15s ease;
            }
            
            .mobile-action-btn:active {
                transform: scale(0.9);
                background: rgba(125, 211, 252, 0.2);
                border-color: rgba(125, 211, 252, 0.5);
            }
            
            .mobile-action-btn.primary {
                width: 64px;
                height: 64px;
                font-size: 28px;
                background: rgba(125, 211, 252, 0.15);
                border-color: rgba(125, 211, 252, 0.4);
            }
        `;
        document.head.appendChild(style);

        // Create mobile action buttons
        const actionsContainer = document.createElement('div');
        actionsContainer.id = 'mobile-actions';
        actionsContainer.innerHTML = `
            <button class="mobile-action-btn" data-action="whisper">💬</button>
            <button class="mobile-action-btn primary" data-action="sing">🎵</button>
            <button class="mobile-action-btn" data-action="pulse">✨</button>
            <button class="mobile-action-btn" data-action="emote">😊</button>
        `;
        document.body.appendChild(actionsContainer);

        // Bind action button events
        actionsContainer.querySelectorAll('.mobile-action-btn').forEach(btn => {
            btn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                const action = (e.currentTarget as HTMLElement).dataset.action;
                if (action) {
                    this.triggerHaptic('light');
                    EventBus.emit('mobile:action', { action });
                }
            });
        });
    }

    private bindTouchEvents(): void {
        const joystickBase = this.joystickElement?.querySelector('.joystick-base') as HTMLElement | null;
        if (!joystickBase) return;

        // Joystick controls - use HTMLElement for proper touch event support
        joystickBase.addEventListener('touchstart', (e) => this.handleJoystickStart(e as TouchEvent), { passive: false });
        joystickBase.addEventListener('touchmove', (e) => this.handleJoystickMove(e as TouchEvent), { passive: false });
        joystickBase.addEventListener('touchend', () => this.handleJoystickEnd());
        joystickBase.addEventListener('touchcancel', () => this.handleJoystickEnd());

        // Canvas tap-to-move and gestures
        const canvas = document.getElementById('cosmos');
        if (canvas) {
            canvas.addEventListener('touchstart', this.handleCanvasTouch.bind(this), { passive: false });
            canvas.addEventListener('touchmove', this.handleCanvasTouchMove.bind(this), { passive: false });
            canvas.addEventListener('touchend', this.handleCanvasTouchEnd.bind(this));
        }
    }

    private handleJoystickStart(e: TouchEvent): void {
        e.preventDefault();
        const touch = e.touches[0];
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();

        this.joystick.active = true;
        this.joystick.centerX = rect.left + rect.width / 2;
        this.joystick.centerY = rect.top + rect.height / 2;
        this.joystick.currentX = touch.clientX;
        this.joystick.currentY = touch.clientY;

        this.joystickKnob?.classList.add('active');
        this.triggerHaptic('light');
        this.updateJoystickPosition();
    }

    private handleJoystickMove(e: TouchEvent): void {
        if (!this.joystick.active) return;
        e.preventDefault();

        const touch = e.touches[0];
        this.joystick.currentX = touch.clientX;
        this.joystick.currentY = touch.clientY;
        this.updateJoystickPosition();
    }

    private handleJoystickEnd(): void {
        this.joystick.active = false;
        this.joystick.magnitude = 0;
        this.joystick.angle = 0;

        this.joystickKnob?.classList.remove('active');
        if (this.joystickKnob) {
            this.joystickKnob.style.transform = 'translate(0, 0)';
        }

        EventBus.emit('mobile:joystick', { dx: 0, dy: 0, magnitude: 0 });
    }

    private updateJoystickPosition(): void {
        const maxDistance = this.config.joystickSize / 2 - 10;

        let dx = this.joystick.currentX - this.joystick.centerX;
        let dy = this.joystick.currentY - this.joystick.centerY;

        const distance = Math.sqrt(dx * dx + dy * dy);
        const clampedDistance = Math.min(distance, maxDistance);

        if (distance > 0) {
            dx = (dx / distance) * clampedDistance;
            dy = (dy / distance) * clampedDistance;
        }

        this.joystick.magnitude = clampedDistance / maxDistance;
        this.joystick.angle = Math.atan2(dy, dx);

        if (this.joystickKnob) {
            this.joystickKnob.style.transform = `translate(${dx}px, ${dy}px)`;
        }

        // Apply deadzone
        if (this.joystick.magnitude < this.config.joystickDeadzone) {
            EventBus.emit('mobile:joystick', { dx: 0, dy: 0, magnitude: 0 });
        } else {
            const normalizedMag = (this.joystick.magnitude - this.config.joystickDeadzone) /
                (1 - this.config.joystickDeadzone);
            EventBus.emit('mobile:joystick', {
                dx: Math.cos(this.joystick.angle) * normalizedMag,
                dy: Math.sin(this.joystick.angle) * normalizedMag,
                magnitude: normalizedMag
            });
        }
    }

    private handleCanvasTouch(e: TouchEvent): void {
        const touch = e.touches[0];
        const now = Date.now();

        this.touches.set(touch.identifier, {
            id: touch.identifier,
            startX: touch.clientX,
            startY: touch.clientY,
            currentX: touch.clientX,
            currentY: touch.clientY,
            startTime: now
        });

        // Check for double tap
        const tapDistance = Math.sqrt(
            Math.pow(touch.clientX - this.lastTapX, 2) +
            Math.pow(touch.clientY - this.lastTapY, 2)
        );

        if (now - this.lastTapTime < DOUBLE_TAP_THRESHOLD && tapDistance < 50) {
            this.triggerHaptic('medium');
            EventBus.emit('mobile:doubleTap', {
                x: touch.clientX,
                y: touch.clientY,
                action: this.config.doubleTapAction
            });
            return;
        }

        // Start long press timer
        this.longPressTimer = window.setTimeout(() => {
            this.triggerHaptic('heavy');
            EventBus.emit('mobile:longPress', {
                x: touch.clientX,
                y: touch.clientY
            });
        }, LONG_PRESS_THRESHOLD);
    }

    private handleCanvasTouchMove(e: TouchEvent): void {
        for (const touch of Array.from(e.changedTouches)) {
            const state = this.touches.get(touch.identifier);
            if (state) {
                state.currentX = touch.clientX;
                state.currentY = touch.clientY;

                // Cancel long press if moved too much
                const moveDistance = Math.sqrt(
                    Math.pow(state.currentX - state.startX, 2) +
                    Math.pow(state.currentY - state.startY, 2)
                );

                if (moveDistance > 20 && this.longPressTimer) {
                    clearTimeout(this.longPressTimer);
                    this.longPressTimer = null;
                }
            }
        }
    }

    private handleCanvasTouchEnd(e: TouchEvent): void {
        for (const touch of Array.from(e.changedTouches)) {
            const state = this.touches.get(touch.identifier);
            if (state) {
                const dx = state.currentX - state.startX;
                const dy = state.currentY - state.startY;
                const distance = Math.sqrt(dx * dx + dy * dy);
                const duration = Date.now() - state.startTime;

                // Clear long press timer
                if (this.longPressTimer) {
                    clearTimeout(this.longPressTimer);
                    this.longPressTimer = null;
                }

                // Check for swipe
                if (distance > SWIPE_THRESHOLD && duration < 300) {
                    const angle = Math.atan2(dy, dx);
                    let direction: 'left' | 'right' | 'up' | 'down';

                    if (angle > -Math.PI / 4 && angle <= Math.PI / 4) direction = 'right';
                    else if (angle > Math.PI / 4 && angle <= 3 * Math.PI / 4) direction = 'down';
                    else if (angle > -3 * Math.PI / 4 && angle <= -Math.PI / 4) direction = 'up';
                    else direction = 'left';

                    this.triggerHaptic('light');
                    EventBus.emit('mobile:swipe', { direction, velocity: distance / duration });
                }
                // Check for tap (tap-to-move)
                else if (distance < 20 && duration < 300 && this.config.tapMoveEnabled) {
                    this.triggerHaptic('light');
                    EventBus.emit('mobile:tap', {
                        x: state.startX,
                        y: state.startY
                    });

                    // Record for double-tap detection
                    this.lastTapTime = Date.now();
                    this.lastTapX = state.startX;
                    this.lastTapY = state.startY;
                }

                this.touches.delete(touch.identifier);
            }
        }
    }

    private triggerHaptic(style: 'light' | 'medium' | 'heavy'): void {
        if (!this.config.hapticEnabled) return;

        if ('vibrate' in navigator) {
            const durations = { light: 10, medium: 25, heavy: 50 };
            navigator.vibrate(durations[style]);
        }
    }

    // Public API
    getJoystickState(): JoystickState {
        return { ...this.joystick };
    }

    getMoveTarget(): { x: number; y: number } | null {
        return this.moveTarget;
    }

    clearMoveTarget(): void {
        this.moveTarget = null;
    }

    setConfig(config: Partial<MobileControlsConfig>): void {
        this.config = { ...this.config, ...config };
    }

    destroy(): void {
        this.joystickElement?.remove();
        document.getElementById('mobile-actions')?.remove();
        if (this.longPressTimer) {
            clearTimeout(this.longPressTimer);
        }
    }
}

// Export singleton
export const mobileControls = new MobileControlsManager();
