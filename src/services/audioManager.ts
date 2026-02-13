/**
 * Audio Manager for Ovo Focus
 *
 * This audio system uses programmatically generated sounds for UI feedback.
 * Sounds are synthesized at runtime using the Web Audio API patterns via expo-av.
 *
 * Sound Types:
 * - button_press: Short click/tap feedback
 * - session_start: Ascending chime for starting focus
 * - session_complete: Celebration fanfare for completion
 * - egg_crack: Cracking sound for hatching
 * - egg_tap: Soft tap sound for egg interactions
 * - egg_double_tap: Sparkle sound for double tap
 * - egg_long_press: Deep resonant sound for long press
 * - streak_increase: Achievement sound for streaks
 * - shield_equip: Power-up activation sound
 * - quick_return: Shimmer sound for quick return
 * - warning: Alert tone for warnings
 * - celebration: Big celebration for rare hatches
 * - pet: Soft interaction sound
 * - feed: Munching/eating sound
 * - session_fail: Sad/fail sound
 */

import { Audio, AVPlaybackStatus } from 'expo-av';

export type SoundType =
    | 'button_press'
    | 'session_start'
    | 'session_complete'
    | 'egg_crack'
    | 'egg_tap'
    | 'egg_double_tap'
    | 'egg_long_press'
    | 'streak_increase'
    | 'shield_equip'
    | 'quick_return'
    | 'warning'
    | 'celebration'
    | 'pet'
    | 'feed'
    | 'play'
    | 'train'
    | 'groom'
    | 'talk'
    | 'session_fail';

interface SoundConfig {
    volume: number;
    // Sound generation parameters
    frequency?: number;      // Base frequency in Hz
    duration?: number;       // Duration in seconds
    type?: 'sine' | 'square' | 'triangle' | 'sawtooth';
    envelope?: {
        attack: number;      // Attack time in seconds
        decay: number;       // Decay time in seconds
        sustain: number;     // Sustain level (0-1)
        release: number;     // Release time in seconds
    };
    // For multi-tone sounds
    tones?: {
        frequency: number;
        startTime: number;
        duration: number;
        volume?: number;
    }[];
}

// Sound configurations with generation parameters
const SOUND_CONFIG: Record<SoundType, SoundConfig> = {
    button_press: {
        volume: 0.3,
        frequency: 800,
        duration: 0.08,
        type: 'sine',
        envelope: { attack: 0.005, decay: 0.05, sustain: 0.3, release: 0.025 },
    },
    session_start: {
        volume: 0.5,
        tones: [
            { frequency: 523, startTime: 0, duration: 0.15, volume: 0.6 },      // C5
            { frequency: 659, startTime: 0.12, duration: 0.15, volume: 0.7 },   // E5
            { frequency: 784, startTime: 0.24, duration: 0.25, volume: 0.8 },   // G5
        ],
    },
    session_complete: {
        volume: 0.7,
        tones: [
            { frequency: 523, startTime: 0, duration: 0.12, volume: 0.5 },      // C5
            { frequency: 659, startTime: 0.08, duration: 0.12, volume: 0.6 },   // E5
            { frequency: 784, startTime: 0.16, duration: 0.12, volume: 0.7 },   // G5
            { frequency: 1047, startTime: 0.24, duration: 0.35, volume: 0.8 },  // C6
        ],
    },
    egg_crack: {
        volume: 0.6,
        tones: [
            { frequency: 200, startTime: 0, duration: 0.05, volume: 0.8 },
            { frequency: 150, startTime: 0.03, duration: 0.08, volume: 0.6 },
            { frequency: 100, startTime: 0.08, duration: 0.1, volume: 0.4 },
        ],
    },
    egg_tap: {
        volume: 0.25,
        frequency: 600,
        duration: 0.06,
        type: 'sine',
        envelope: { attack: 0.005, decay: 0.03, sustain: 0.2, release: 0.025 },
    },
    egg_double_tap: {
        volume: 0.35,
        tones: [
            { frequency: 880, startTime: 0, duration: 0.08, volume: 0.5 },      // A5
            { frequency: 1175, startTime: 0.06, duration: 0.1, volume: 0.6 },   // D6
            { frequency: 1397, startTime: 0.12, duration: 0.15, volume: 0.4 },  // F6
        ],
    },
    egg_long_press: {
        volume: 0.4,
        tones: [
            { frequency: 220, startTime: 0, duration: 0.2, volume: 0.6 },       // A3 - deep tone
            { frequency: 330, startTime: 0.05, duration: 0.2, volume: 0.4 },    // E4 - harmony
            { frequency: 440, startTime: 0.1, duration: 0.25, volume: 0.3 },    // A4 - overtone
        ],
    },
    streak_increase: {
        volume: 0.6,
        tones: [
            { frequency: 587, startTime: 0, duration: 0.1, volume: 0.5 },       // D5
            { frequency: 784, startTime: 0.08, duration: 0.1, volume: 0.6 },    // G5
            { frequency: 988, startTime: 0.16, duration: 0.2, volume: 0.7 },    // B5
        ],
    },
    shield_equip: {
        volume: 0.5,
        tones: [
            { frequency: 392, startTime: 0, duration: 0.15, volume: 0.6 },      // G4
            { frequency: 523, startTime: 0.1, duration: 0.2, volume: 0.7 },     // C5
        ],
    },
    quick_return: {
        volume: 0.4,
        tones: [
            { frequency: 1047, startTime: 0, duration: 0.1, volume: 0.3 },      // C6
            { frequency: 1319, startTime: 0.05, duration: 0.12, volume: 0.4 },  // E6
            { frequency: 1568, startTime: 0.1, duration: 0.15, volume: 0.3 },   // G6
        ],
    },
    warning: {
        volume: 0.5,
        tones: [
            { frequency: 440, startTime: 0, duration: 0.15, volume: 0.7 },      // A4
            { frequency: 349, startTime: 0.12, duration: 0.15, volume: 0.7 },   // F4
        ],
    },
    celebration: {
        volume: 0.7,
        tones: [
            { frequency: 523, startTime: 0, duration: 0.1, volume: 0.5 },       // C5
            { frequency: 659, startTime: 0.06, duration: 0.1, volume: 0.5 },    // E5
            { frequency: 784, startTime: 0.12, duration: 0.1, volume: 0.6 },    // G5
            { frequency: 1047, startTime: 0.18, duration: 0.15, volume: 0.7 },  // C6
            { frequency: 1319, startTime: 0.28, duration: 0.2, volume: 0.6 },   // E6
            { frequency: 1568, startTime: 0.38, duration: 0.3, volume: 0.5 },   // G6
        ],
    },
    pet: {
        volume: 0.4,
        frequency: 500,
        duration: 0.1,
        type: 'sine',
        envelope: { attack: 0.01, decay: 0.05, sustain: 0.3, release: 0.04 },
    },
    feed: {
        volume: 0.4,
        tones: [
            { frequency: 300, startTime: 0, duration: 0.08, volume: 0.5 },
            { frequency: 350, startTime: 0.06, duration: 0.08, volume: 0.5 },
            { frequency: 300, startTime: 0.12, duration: 0.08, volume: 0.4 },
        ],
    },
    play: {
        volume: 0.5,
        tones: [
            { frequency: 659, startTime: 0, duration: 0.1, volume: 0.6 },       // E5
            { frequency: 784, startTime: 0.08, duration: 0.1, volume: 0.7 },    // G5
            { frequency: 988, startTime: 0.16, duration: 0.12, volume: 0.6 },   // B5
            { frequency: 784, startTime: 0.26, duration: 0.1, volume: 0.5 },    // G5
        ],
    },
    train: {
        volume: 0.45,
        tones: [
            { frequency: 392, startTime: 0, duration: 0.15, volume: 0.5 },      // G4
            { frequency: 440, startTime: 0.12, duration: 0.15, volume: 0.6 },   // A4
            { frequency: 523, startTime: 0.24, duration: 0.2, volume: 0.7 },    // C5
        ],
    },
    groom: {
        volume: 0.35,
        tones: [
            { frequency: 880, startTime: 0, duration: 0.06, volume: 0.4 },      // A5
            { frequency: 1047, startTime: 0.04, duration: 0.08, volume: 0.5 },  // C6
            { frequency: 1319, startTime: 0.1, duration: 0.1, volume: 0.4 },    // E6
        ],
    },
    talk: {
        volume: 0.4,
        tones: [
            { frequency: 440, startTime: 0, duration: 0.08, volume: 0.4 },      // A4
            { frequency: 523, startTime: 0.06, duration: 0.08, volume: 0.5 },   // C5
            { frequency: 440, startTime: 0.12, duration: 0.06, volume: 0.4 },   // A4
        ],
    },
    session_fail: {
        volume: 0.5,
        tones: [
            { frequency: 392, startTime: 0, duration: 0.2, volume: 0.6 },       // G4
            { frequency: 330, startTime: 0.15, duration: 0.2, volume: 0.5 },    // E4
            { frequency: 262, startTime: 0.3, duration: 0.3, volume: 0.4 },     // C4
        ],
    },
};

/**
 * Generates a WAV file buffer from audio parameters
 * Creates simple synthesized sounds for UI feedback
 */
function generateWavBuffer(config: SoundConfig): ArrayBuffer {
    const sampleRate = 44100;
    const masterVolume = config.volume;

    // Calculate total duration
    let totalDuration = config.duration || 0.5;
    if (config.tones) {
        totalDuration = Math.max(
            ...config.tones.map(t => t.startTime + t.duration)
        );
    }

    const numSamples = Math.ceil(sampleRate * totalDuration);
    const numChannels = 1;
    const bitsPerSample = 16;
    const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
    const blockAlign = numChannels * (bitsPerSample / 8);
    const dataSize = numSamples * blockAlign;

    // WAV file size = 44 byte header + data
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);

    // Write WAV header
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true); // Subchunk1Size
    view.setUint16(20, 1, true);  // AudioFormat (PCM)
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true);
    writeString(view, 36, 'data');
    view.setUint32(40, dataSize, true);

    // Generate audio samples
    const samples = new Float32Array(numSamples);

    if (config.tones) {
        // Multi-tone sound
        for (const tone of config.tones) {
            const startSample = Math.floor(tone.startTime * sampleRate);
            const toneSamples = Math.floor(tone.duration * sampleRate);
            const toneVolume = tone.volume || 1.0;

            for (let i = 0; i < toneSamples; i++) {
                const sampleIndex = startSample + i;
                if (sampleIndex >= numSamples) break;

                const t = i / sampleRate;
                const envelope = getEnvelope(t, tone.duration);
                const sample = Math.sin(2 * Math.PI * tone.frequency * t) * envelope * toneVolume;
                samples[sampleIndex] += sample;
            }
        }
    } else {
        // Single tone with envelope
        const frequency = config.frequency || 440;
        const duration = config.duration || 0.5;
        const env = config.envelope || { attack: 0.01, decay: 0.1, sustain: 0.5, release: 0.1 };

        for (let i = 0; i < numSamples; i++) {
            const t = i / sampleRate;
            const envelope = getADSREnvelope(t, duration, env);

            let sample: number;
            switch (config.type) {
                case 'square':
                    sample = Math.sign(Math.sin(2 * Math.PI * frequency * t)) * 0.5;
                    break;
                case 'triangle':
                    sample = (2 / Math.PI) * Math.asin(Math.sin(2 * Math.PI * frequency * t));
                    break;
                case 'sawtooth':
                    sample = 2 * ((frequency * t) % 1) - 1;
                    break;
                case 'sine':
                default:
                    sample = Math.sin(2 * Math.PI * frequency * t);
                    break;
            }

            samples[i] = sample * envelope;
        }
    }

    // Normalize and write samples
    let maxAmp = 0;
    for (let i = 0; i < numSamples; i++) {
        maxAmp = Math.max(maxAmp, Math.abs(samples[i]));
    }

    const normFactor = maxAmp > 0 ? 1 / maxAmp : 1;

    for (let i = 0; i < numSamples; i++) {
        const normalizedSample = samples[i] * normFactor * masterVolume;
        const clampedSample = Math.max(-1, Math.min(1, normalizedSample));
        const intSample = Math.floor(clampedSample * 32767);
        view.setInt16(44 + i * 2, intSample, true);
    }

    return buffer;
}

function writeString(view: DataView, offset: number, str: string): void {
    for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i));
    }
}

function getEnvelope(t: number, duration: number): number {
    const attack = 0.01;
    const release = 0.05;

    if (t < attack) {
        return t / attack;
    } else if (t > duration - release) {
        return (duration - t) / release;
    }
    return 1;
}

function getADSREnvelope(
    t: number,
    duration: number,
    env: { attack: number; decay: number; sustain: number; release: number }
): number {
    const { attack, decay, sustain, release } = env;
    const sustainTime = duration - attack - decay - release;

    if (t < attack) {
        return t / attack;
    } else if (t < attack + decay) {
        return 1 - ((t - attack) / decay) * (1 - sustain);
    } else if (t < attack + decay + sustainTime) {
        return sustain;
    } else if (t < duration) {
        return sustain * (1 - (t - attack - decay - sustainTime) / release);
    }
    return 0;
}

/**
 * Converts ArrayBuffer to base64 data URI for expo-av
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

class AudioManager {
    private soundCache: Map<SoundType, Audio.Sound> = new Map();
    private generatedSounds: Map<SoundType, string> = new Map(); // base64 data URIs
    private failedSounds: Set<SoundType> = new Set();
    private isEnabled: boolean = true;
    private isInitialized: boolean = false;

    /**
     * Initialize the audio manager
     * Should be called once on app startup
     */
    async initialize(): Promise<void> {
        if (this.isInitialized) return;

        try {
            await Audio.setAudioModeAsync({
                playsInSilentModeIOS: false,
                staysActiveInBackground: false,
                shouldDuckAndroid: true,
            });

            // Pre-generate all sounds
            this.generateAllSounds();

            this.isInitialized = true;
        } catch (error) {
            console.warn('Failed to initialize audio manager:', error);
        }
    }

    /**
     * Generate all sound effects as base64 data URIs
     */
    private generateAllSounds(): void {
        for (const soundType of Object.keys(SOUND_CONFIG) as SoundType[]) {
            try {
                const config = SOUND_CONFIG[soundType];
                const wavBuffer = generateWavBuffer(config);
                const base64 = arrayBufferToBase64(wavBuffer);
                const dataUri = `data:audio/wav;base64,${base64}`;
                this.generatedSounds.set(soundType, dataUri);
            } catch (error) {
                console.warn(`Failed to generate sound: ${soundType}`, error);
                this.failedSounds.add(soundType);
            }
        }
    }

    /**
     * Enable or disable sound playback
     */
    setEnabled(enabled: boolean): void {
        this.isEnabled = enabled;
    }

    /**
     * Check if sounds are enabled
     */
    getEnabled(): boolean {
        return this.isEnabled;
    }

    /**
     * Play a sound by type.
     * Uses programmatically generated sounds.
     */
    async playSound(type: SoundType): Promise<void> {
        if (!this.isEnabled) return;
        if (this.failedSounds.has(type)) return;

        // Auto-initialize if needed
        if (!this.isInitialized) {
            await this.initialize();
        }

        try {
            const config = SOUND_CONFIG[type];
            if (!config) {
                console.warn(`Unknown sound type: ${type}`);
                return; // Signal failure — no config found for this sound type
            }

            // Check for cached sound
            let sound = this.soundCache.get(type);

            if (sound) {
                try {
                    const status = await sound.getStatusAsync();
                    if (status.isLoaded) {
                        await sound.setPositionAsync(0);
                        await sound.playAsync();
                        return;
                    }
                } catch {
                    // Sound no longer valid, remove from cache
                    this.soundCache.delete(type);
                }
            }

            // Get or generate the sound data
            let dataUri = this.generatedSounds.get(type);
            if (!dataUri) {
                const wavBuffer = generateWavBuffer(config);
                const base64 = arrayBufferToBase64(wavBuffer);
                dataUri = `data:audio/wav;base64,${base64}`;
                this.generatedSounds.set(type, dataUri);
            }

            // Create and play new sound
            const { sound: newSound } = await Audio.Sound.createAsync(
                { uri: dataUri },
                { volume: config.volume, shouldPlay: true }
            );

            this.soundCache.set(type, newSound);

            // Limit cache size to prevent unbounded memory growth
            const MAX_CACHE_SIZE = 10;
            if (this.soundCache.size > MAX_CACHE_SIZE) {
                const firstKey = this.soundCache.keys().next().value;
                if (firstKey) {
                    const oldSound = this.soundCache.get(firstKey);
                    if (oldSound) {
                        await oldSound.unloadAsync().catch(() => {});
                        this.soundCache.delete(firstKey);
                    }
                }
            }

            // Note: We intentionally don't set up a playback status update callback
            // to avoid memory leaks. The sound is cached and reused, so cleanup
            // happens in the cleanup() method instead.
        } catch (error) {
            this.failedSounds.add(type);
            console.warn(`Failed to play sound: ${type}`, error);
        }
    }

    /**
     * Preload frequently used sounds for faster playback
     */
    async preloadSounds(types: SoundType[]): Promise<void> {
        if (!this.isInitialized) {
            await this.initialize();
        }

        for (const type of types) {
            try {
                if (this.soundCache.has(type) || this.failedSounds.has(type)) continue;

                const config = SOUND_CONFIG[type];
                if (!config) continue;

                let dataUri = this.generatedSounds.get(type);
                if (!dataUri) {
                    const wavBuffer = generateWavBuffer(config);
                    const base64 = arrayBufferToBase64(wavBuffer);
                    dataUri = `data:audio/wav;base64,${base64}`;
                    this.generatedSounds.set(type, dataUri);
                }

                const { sound } = await Audio.Sound.createAsync(
                    { uri: dataUri },
                    { volume: config.volume }
                );
                this.soundCache.set(type, sound);
            } catch (error) {
                this.failedSounds.add(type);
                console.warn(`Failed to preload sound: ${type}`, error);
            }
        }
    }

    /**
     * Clean up all cached sounds
     */
    async cleanup(): Promise<void> {
        for (const [type, sound] of this.soundCache.entries()) {
            try {
                await sound.unloadAsync();
            } catch (error) {
                console.warn(`Failed to unload sound: ${type}`, error);
            }
        }
        this.soundCache.clear();
        this.failedSounds.clear();
        this.generatedSounds.clear();
        this.isInitialized = false;
    }

    /**
     * Unload a specific sound from cache
     */
    async unloadSound(type: SoundType): Promise<void> {
        const sound = this.soundCache.get(type);
        if (sound) {
            try {
                await sound.unloadAsync();
            } catch (error) {
                console.warn(`Failed to unload sound: ${type}`, error);
            }
            this.soundCache.delete(type);
        }
    }

    /**
     * Check if a specific sound type is available
     */
    isSoundAvailable(type: SoundType): boolean {
        return !!SOUND_CONFIG[type] && !this.failedSounds.has(type);
    }

    /**
     * Get list of available sound types
     */
    getAvailableSounds(): SoundType[] {
        return Object.keys(SOUND_CONFIG).filter(
            type => !this.failedSounds.has(type as SoundType)
        ) as SoundType[];
    }

    /**
     * Check if the audio system is functional
     */
    isAudioSystemFunctional(): boolean {
        return this.isInitialized && Object.keys(SOUND_CONFIG).length > 0;
    }

    /**
     * Get all defined sound types
     */
    getAllDefinedSoundTypes(): SoundType[] {
        return Object.keys(SOUND_CONFIG) as SoundType[];
    }
}

// Export singleton instance
export const audioManager = new AudioManager();
