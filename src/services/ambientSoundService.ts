/**
 * Ambient Sound Service for Ovo Focus
 *
 * This service manages ambient background sounds for focus sessions.
 * Sounds are loaded from bundled audio assets and played in a loop
 * during active focus sessions.
 *
 * Sound Types:
 * - rain: Gentle rain sounds
 * - forest: Forest ambience with birds
 * - ocean: Ocean waves
 * - white_noise: White noise for concentration
 * - cafe: Cafe ambience with gentle chatter
 */

import { Audio, AVPlaybackStatus } from 'expo-av';

export type AmbientSoundType = 'rain' | 'forest' | 'ocean' | 'white_noise' | 'cafe';

export interface AmbientSoundInfo {
    id: AmbientSoundType;
    name: string;
    icon: string;
}

// Available ambient sounds with metadata
export const AMBIENT_SOUNDS: AmbientSoundInfo[] = [
    { id: 'rain', name: 'Rain', icon: '🌧️' },
    { id: 'forest', name: 'Forest', icon: '🌲' },
    { id: 'ocean', name: 'Ocean', icon: '🌊' },
    { id: 'white_noise', name: 'White Noise', icon: '📻' },
    { id: 'cafe', name: 'Cafe', icon: '☕' },
];

// Sound generation parameters for each ambient type
// These create procedurally generated ambient sounds
interface AmbientSoundConfig {
    // Base frequency components for the ambient sound
    frequencies: {
        freq: number;
        amplitude: number;
        modulation?: number; // Frequency modulation rate
    }[];
    // Noise component (0-1)
    noiseLevel: number;
    // Low-pass filter cutoff (Hz)
    filterCutoff: number;
    // Duration of the loop in seconds
    loopDuration: number;
}

const AMBIENT_CONFIGS: Record<AmbientSoundType, AmbientSoundConfig> = {
    rain: {
        frequencies: [
            { freq: 200, amplitude: 0.1, modulation: 0.5 },
            { freq: 400, amplitude: 0.08, modulation: 0.3 },
            { freq: 800, amplitude: 0.05, modulation: 0.2 },
        ],
        noiseLevel: 0.7,
        filterCutoff: 2000,
        loopDuration: 10,
    },
    forest: {
        frequencies: [
            { freq: 150, amplitude: 0.15, modulation: 0.1 },
            { freq: 300, amplitude: 0.1, modulation: 0.2 },
            { freq: 1200, amplitude: 0.05, modulation: 1.5 }, // Bird-like chirps
            { freq: 2400, amplitude: 0.03, modulation: 2.0 },
        ],
        noiseLevel: 0.3,
        filterCutoff: 4000,
        loopDuration: 15,
    },
    ocean: {
        frequencies: [
            { freq: 60, amplitude: 0.3, modulation: 0.05 },
            { freq: 120, amplitude: 0.2, modulation: 0.08 },
            { freq: 240, amplitude: 0.1, modulation: 0.1 },
        ],
        noiseLevel: 0.5,
        filterCutoff: 1500,
        loopDuration: 12,
    },
    white_noise: {
        frequencies: [],
        noiseLevel: 0.9,
        filterCutoff: 8000,
        loopDuration: 5,
    },
    cafe: {
        frequencies: [
            { freq: 100, amplitude: 0.1, modulation: 0.3 },
            { freq: 200, amplitude: 0.08, modulation: 0.5 },
            { freq: 500, amplitude: 0.05, modulation: 0.8 },
            { freq: 1000, amplitude: 0.03, modulation: 1.0 },
        ],
        noiseLevel: 0.4,
        filterCutoff: 3000,
        loopDuration: 8,
    },
};

/**
 * Generate a WAV buffer for ambient sound
 */
function generateAmbientWavBuffer(config: AmbientSoundConfig, volume: number): ArrayBuffer {
    const sampleRate = 44100;
    const numSamples = Math.ceil(sampleRate * config.loopDuration);
    const numChannels = 1;
    const bitsPerSample = 16;
    const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
    const blockAlign = numChannels * (bitsPerSample / 8);
    const dataSize = numSamples * blockAlign;

    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);

    // Write WAV header
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true);
    writeString(view, 36, 'data');
    view.setUint32(40, dataSize, true);

    // Generate samples
    const samples = new Float32Array(numSamples);

    // Simple pseudo-random number generator for consistent noise
    let seed = 12345;
    const random = () => {
        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
        return (seed / 0x7fffffff) * 2 - 1;
    };

    // Generate noise component
    if (config.noiseLevel > 0) {
        for (let i = 0; i < numSamples; i++) {
            samples[i] = random() * config.noiseLevel;
        }

        // Apply simple low-pass filter (moving average)
        const filterSamples = Math.max(1, Math.floor(sampleRate / config.filterCutoff));
        for (let i = filterSamples; i < numSamples; i++) {
            let sum = 0;
            for (let j = 0; j < filterSamples; j++) {
                sum += samples[i - j];
            }
            samples[i] = sum / filterSamples;
        }
    }

    // Add frequency components with modulation
    for (const freqConfig of config.frequencies) {
        for (let i = 0; i < numSamples; i++) {
            const t = i / sampleRate;
            const modulation = freqConfig.modulation || 0;
            const modulatedFreq = freqConfig.freq * (1 + Math.sin(2 * Math.PI * modulation * t) * 0.1);
            const sample = Math.sin(2 * Math.PI * modulatedFreq * t) * freqConfig.amplitude;
            samples[i] += sample;
        }
    }

    // Apply fade in/out for seamless looping
    const fadeLength = Math.floor(sampleRate * 0.5); // 0.5 second fade
    for (let i = 0; i < fadeLength; i++) {
        const fade = i / fadeLength;
        samples[i] *= fade;
        samples[numSamples - 1 - i] *= fade;
    }

    // Normalize and apply volume
    let maxAmp = 0;
    for (let i = 0; i < numSamples; i++) {
        maxAmp = Math.max(maxAmp, Math.abs(samples[i]));
    }

    const normFactor = maxAmp > 0 ? 1 / maxAmp : 1;

    for (let i = 0; i < numSamples; i++) {
        const normalizedSample = samples[i] * normFactor * volume * 0.5; // 0.5 to prevent clipping
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

function arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

class AmbientSoundService {
    private currentSound: Audio.Sound | null = null;
    private currentSoundType: AmbientSoundType | null = null;
    private isPlaying: boolean = false;
    private volume: number = 0.5; // 0-1 scale
    private isInitialized: boolean = false;
    private isInitializing: boolean = false;
    private generatedSounds: Map<AmbientSoundType, string> = new Map();
    private failedSounds: Set<AmbientSoundType> = new Set();

    /**
     * Initialize the ambient sound service
     */
    async initialize(): Promise<void> {
        if (this.isInitialized || this.isInitializing) return;
        this.isInitializing = true;

        try {
            await Audio.setAudioModeAsync({
                playsInSilentModeIOS: true,
                staysActiveInBackground: true,
                shouldDuckAndroid: false,
            });
            this.isInitialized = true;
        } catch (error) {
            console.warn('[AmbientSoundService] Failed to initialize:', error);
        } finally {
            this.isInitializing = false;
        }
    }

    /**
     * Generate ambient sound data URI
     */
    private async generateSound(type: AmbientSoundType): Promise<string | null> {
        if (this.failedSounds.has(type)) return null;

        const cached = this.generatedSounds.get(type);
        if (cached) return cached;

        try {
            const config = AMBIENT_CONFIGS[type];
            const wavBuffer = generateAmbientWavBuffer(config, this.volume);
            const base64 = arrayBufferToBase64(wavBuffer);
            const dataUri = `data:audio/wav;base64,${base64}`;
            this.generatedSounds.set(type, dataUri);
            return dataUri;
        } catch (error) {
            console.warn(`[AmbientSoundService] Failed to generate sound: ${type}`, error);
            this.failedSounds.add(type);
            return null;
        }
    }

    /**
     * Set the volume for ambient sounds
     * @param volume - Volume level from 0 to 100
     */
    async setVolume(volume: number): Promise<void> {
        this.volume = Math.max(0, Math.min(100, volume)) / 100;

        // Update currently playing sound if any
        // Note: No need to clear generatedSounds cache since:
        // - Current sound volume is updated via setVolumeAsync()
        // - New sounds will use this.volume automatically when generated
        if (this.currentSound && this.isPlaying) {
            try {
                await this.currentSound.setVolumeAsync(this.volume);
            } catch (error) {
                console.warn('[AmbientSoundService] Failed to set volume:', error);
            }
        }
    }

    /**
     * Get the current volume (0-100)
     */
    getVolume(): number {
        return Math.round(this.volume * 100);
    }

    /**
     * Play an ambient sound
     * @param type - The type of ambient sound to play
     */
    async play(type: AmbientSoundType): Promise<void> {
        if (!this.isInitialized) {
            await this.initialize();
        }

        // If already playing this sound, do nothing
        if (this.isPlaying && this.currentSoundType === type) {
            return;
        }

        // Stop any currently playing sound
        await this.stop();

        try {
            const dataUri = await this.generateSound(type);
            if (!dataUri) {
                console.warn(`[AmbientSoundService] No sound data for: ${type}`);
                return;
            }

            const { sound } = await Audio.Sound.createAsync(
                { uri: dataUri },
                {
                    volume: this.volume,
                    isLooping: true,
                    shouldPlay: true,
                }
            );

            this.currentSound = sound;
            this.currentSoundType = type;
            this.isPlaying = true;

            // Handle playback status updates
            sound.setOnPlaybackStatusUpdate((status: AVPlaybackStatus) => {
                if (!status.isLoaded) {
                    this.isPlaying = false;
                }
            });

            console.log(`[AmbientSoundService] Playing: ${type}`);
        } catch (error) {
            console.warn(`[AmbientSoundService] Failed to play sound: ${type}`, error);
            this.failedSounds.add(type);
        }
    }

    /**
     * Pause the currently playing ambient sound
     */
    async pause(): Promise<void> {
        if (this.currentSound && this.isPlaying) {
            try {
                await this.currentSound.pauseAsync();
                this.isPlaying = false;
                console.log('[AmbientSoundService] Paused');
            } catch (error) {
                console.warn('[AmbientSoundService] Failed to pause:', error);
            }
        }
    }

    /**
     * Resume the paused ambient sound
     */
    async resume(): Promise<void> {
        if (this.currentSound && !this.isPlaying) {
            try {
                await this.currentSound.playAsync();
                this.isPlaying = true;
                console.log('[AmbientSoundService] Resumed');
            } catch (error) {
                console.warn('[AmbientSoundService] Failed to resume:', error);
            }
        }
    }

    /**
     * Stop and unload the current ambient sound
     */
    async stop(): Promise<void> {
        if (this.currentSound) {
            try {
                await this.currentSound.stopAsync();
                await this.currentSound.unloadAsync();
                console.log(`[AmbientSoundService] Stopped: ${this.currentSoundType}`);
            } catch (error) {
                console.warn('[AmbientSoundService] Failed to stop:', error);
            }
            this.currentSound = null;
            this.currentSoundType = null;
            this.isPlaying = false;
        }
    }

    /**
     * Check if ambient sound is currently playing
     */
    getIsPlaying(): boolean {
        return this.isPlaying;
    }

    /**
     * Get the currently playing sound type
     */
    getCurrentSoundType(): AmbientSoundType | null {
        return this.currentSoundType;
    }

    /**
     * Get available ambient sounds
     */
    getAvailableSounds(): AmbientSoundInfo[] {
        return AMBIENT_SOUNDS.filter(sound => !this.failedSounds.has(sound.id));
    }

    /**
     * Clean up resources
     */
    async cleanup(): Promise<void> {
        await this.stop();
        this.generatedSounds.clear();
        this.failedSounds.clear();
        this.isInitialized = false;
    }
}

// Export singleton instance
export const ambientSoundService = new AmbientSoundService();
