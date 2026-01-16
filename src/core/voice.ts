// WebRTC Voice Chat System
import type { Settings } from '../types';

// Signal sender function type - can be set externally to use WebSocket
export type SignalSender = (targetId: string, signalType: string, data: any) => void;

export class VoiceChat {
    enabled: boolean = false;
    localStream: MediaStream | null = null;
    audioContext: AudioContext | null = null;
    analyser: AnalyserNode | null = null;
    peers: Map<string, RTCPeerConnection> = new Map();
    gains: Map<string, GainNode> = new Map();
    audioElements: Map<string, HTMLAudioElement> = new Map(); // Track audio elements for cleanup
    isSpeaking: boolean = false;
    isPTTActive: boolean = false;
    vadThreshold: number = 0.02;
    userId: string = '';
    signalSender: SignalSender | null = null;
    
    constructor(private settings: Settings) {}

    setUserId(id: string): void {
        this.userId = id;
    }

    setSignalSender(sender: SignalSender): void {
        this.signalSender = sender;
    }

    async init(): Promise<boolean> {
        try {
            this.localStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });

            this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            const source = this.audioContext.createMediaStreamSource(this.localStream);
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 256;
            source.connect(this.analyser);

            // Enable/disable audio based on PTT setting
            this.localStream.getAudioTracks().forEach(track => {
                track.enabled = !(this.settings as any).ptt;
            });

            this.enabled = true;
            this.startVAD();
            return true;
        } catch (e) {
            console.error('Voice init failed:', e);
            return false;
        }
    }

    startVAD(): void {
        if (!this.analyser) return;

        const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
        const check = () => {
            if (!this.enabled || !this.analyser) return;

            this.analyser.getByteFrequencyData(dataArray);
            const avg = dataArray.reduce((a, b) => a + b) / dataArray.length / 255;
            const threshold = this.vadThreshold * (1 + (1 - ((this.settings as any).sensitivity || 0.5)));

            const wasSpeaking = this.isSpeaking;

            if ((this.settings as any).ptt) {
                this.isSpeaking = this.isPTTActive && avg > threshold * 0.5;
            } else if ((this.settings as any).vad !== false) {
                this.isSpeaking = avg > threshold;
            }

            if (this.isSpeaking !== wasSpeaking) {
                this.onSpeakingChange?.(this.isSpeaking);
            }

            this.onVolumeUpdate?.(avg);
            requestAnimationFrame(check);
        };
        check();
    }

    setPTT(active: boolean): void {
        this.isPTTActive = active;
        if (this.localStream) {
            this.localStream.getAudioTracks().forEach(track => {
                track.enabled = active;
            });
        }
    }

    async connectToPeer(peerId: string): Promise<RTCPeerConnection | null> {
        if (!this.enabled || this.peers.has(peerId)) return null;

        const pc = new RTCPeerConnection({
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        });

        if (this.localStream) {
            this.localStream.getTracks().forEach(track => pc.addTrack(track, this.localStream!));
        }

        pc.ontrack = (event) => {
            // Clean up existing audio element if any
            const existingAudio = this.audioElements.get(peerId);
            if (existingAudio) {
                existingAudio.srcObject = null;
                existingAudio.remove();
            }
            
            const audio = document.createElement('audio');
            audio.srcObject = event.streams[0];
            audio.autoplay = true;
            this.audioElements.set(peerId, audio); // Track for cleanup

            if (this.audioContext) {
                const source = this.audioContext.createMediaStreamSource(event.streams[0]);
                const gain = this.audioContext.createGain();
                gain.gain.value = 1;
                source.connect(gain);
                gain.connect(this.audioContext.destination);
                this.gains.set(peerId, gain);
            }
        };

        pc.onicecandidate = (event) => {
            if (event.candidate && this.signalSender) {
                this.signalSender(peerId, 'ice', { candidate: event.candidate.toJSON() });
            }
        };

        this.peers.set(peerId, pc);

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        if (this.signalSender) {
            this.signalSender(peerId, 'offer', { sdp: offer.sdp });
        }

        return pc;
    }

    async handleSignal(signal: { from: string; signalType: string; data: any }): Promise<void> {
        if (!this.enabled) return;

        const { from, signalType, data } = signal;

        if (signalType === 'offer') {
            let pc = this.peers.get(from);
            if (!pc) {
                pc = new RTCPeerConnection({
                    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
                });

                if (this.localStream) {
                    this.localStream.getTracks().forEach(track => pc!.addTrack(track, this.localStream!));
                }

                pc.ontrack = (event) => {
                    // Clean up existing audio element if any
                    const existingAudio = this.audioElements.get(from);
                    if (existingAudio) {
                        existingAudio.srcObject = null;
                        existingAudio.remove();
                    }
                    
                    const audio = document.createElement('audio');
                    audio.srcObject = event.streams[0];
                    audio.autoplay = true;
                    this.audioElements.set(from, audio); // Track for cleanup

                    if (this.audioContext) {
                        const source = this.audioContext.createMediaStreamSource(event.streams[0]);
                        const gain = this.audioContext.createGain();
                        source.connect(gain);
                        gain.connect(this.audioContext.destination);
                        this.gains.set(from, gain);
                    }
                };

                pc.onicecandidate = (event) => {
                    if (event.candidate && this.signalSender) {
                        this.signalSender(from, 'ice', { candidate: event.candidate.toJSON() });
                    }
                };

                this.peers.set(from, pc);
            }

            await pc.setRemoteDescription({ type: 'offer', sdp: data.sdp });
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            if (this.signalSender) {
                this.signalSender(from, 'answer', { sdp: answer.sdp });
            }
        } else if (signalType === 'answer') {
            const pc = this.peers.get(from);
            if (pc && pc.signalingState !== 'stable') {
                await pc.setRemoteDescription({ type: 'answer', sdp: data.sdp });
            }
        } else if (signalType === 'ice' && data.candidate) {
            const pc = this.peers.get(from);
            if (pc) {
                try {
                    await pc.addIceCandidate(data.candidate);
                } catch (e) {
                    console.warn('ICE candidate error:', e);
                }
            }
        }
    }

    updateSpatialAudio(peerId: string, distance: number, maxDistance: number): void {
        const gain = this.gains.get(peerId);
        if (!gain || !this.audioContext) return;

        let volume = Math.max(0, 1 - Math.pow(distance / maxDistance, 0.8));
        volume *= this.settings.volume || 0.7;

        gain.gain.setTargetAtTime(volume, this.audioContext.currentTime, 0.1);
    }

    disconnectPeer(peerId: string): void {
        const pc = this.peers.get(peerId);
        if (pc) {
            pc.close();
            this.peers.delete(peerId);
        }
        this.gains.delete(peerId);
        
        // Clean up audio element to prevent memory leak
        const audio = this.audioElements.get(peerId);
        if (audio) {
            audio.srcObject = null;
            audio.remove();
            this.audioElements.delete(peerId);
        }
    }

    /**
     * Update voice connections based on nearby players
     * Call this periodically with the list of nearby player IDs
     */
    updateNearbyPeers(nearbyPlayerIds: Set<string>, voiceRange: number = 500): void {
        if (!this.enabled) return;

        // Connect to new nearby players
        for (const peerId of nearbyPlayerIds) {
            if (peerId === this.userId) continue;
            if (!this.peers.has(peerId)) {
                console.log(`🎙️ Initiating voice connection to ${peerId}`);
                this.connectToPeer(peerId);
            }
        }

        // Disconnect from players no longer nearby
        for (const peerId of this.peers.keys()) {
            if (!nearbyPlayerIds.has(peerId)) {
                console.log(`🔇 Disconnecting voice from ${peerId}`);
                this.disconnectPeer(peerId);
            }
        }
    }

    /**
     * Get set of connected peer IDs
     */
    getConnectedPeers(): Set<string> {
        return new Set(this.peers.keys());
    }

    disable(): void {
        this.enabled = false;
        this.isSpeaking = false;

        if (this.localStream) {
            this.localStream.getTracks().forEach(t => t.stop());
            this.localStream = null;
        }

        this.peers.forEach(pc => pc.close());
        this.peers.clear();
        this.gains.clear();
        
        // Clean up all audio elements to prevent memory leaks
        this.audioElements.forEach(audio => {
            audio.srcObject = null;
            audio.remove();
        });
        this.audioElements.clear();
    }

    // Event callbacks
    onSpeakingChange?: (speaking: boolean) => void;
    onVolumeUpdate?: (level: number) => void;
}
