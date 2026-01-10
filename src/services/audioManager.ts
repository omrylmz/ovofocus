import { Audio, AVPlaybackStatus } from 'expo-av';

export type SoundType =
    | 'button_press'
    | 'session_start'
    | 'session_complete'
    | 'egg_crack'
    | 'streak_increase'
    | 'shield_equip'
    | 'quick_return'
    | 'warning'
    | 'celebration'
    | 'pet'
    | 'feed';

interface SoundConfig {
    volume: number;
}

// Sound configurations with volume levels
// To add sounds: place MP3 files in assets/sounds/ with matching names
// Recommended sources: pixabay.com/sound-effects, freesound.org (CC0 license)
const SOUND_CONFIG: Record<SoundType, SoundConfig> = {
    button_press: { volume: 0.3 },
    session_start: { volume: 0.5 },
    session_complete: { volume: 0.7 },
    egg_crack: { volume: 0.6 },
    streak_increase: { volume: 0.6 },
    shield_equip: { volume: 0.5 },
    quick_return: { volume: 0.4 },
    warning: { volume: 0.5 },
    celebration: { volume: 0.7 },
    pet: { volume: 0.4 },
    feed: { volume: 0.4 },
};

// Sound files - loaded dynamically to handle missing files gracefully
// Uses a single placeholder file for all sounds until real sounds are added
let SOUND_FILES: Partial<Record<SoundType, any>> = {};

// Try to load sound files - this will be populated at runtime
function loadSoundFiles() {
    // NOTE: To enable sounds, add MP3 files to assets/sounds/ with these names:
    // button.mp3, start.mp3, complete.mp3, crack.mp3, streak.mp3,
    // shield.mp3, shimmer.mp3, warning.mp3, fanfare.mp3, pet.mp3, munch.mp3
    //
    // Then uncomment the corresponding lines below:

    // SOUND_FILES.button_press = require('../../assets/sounds/button.mp3');
    // SOUND_FILES.session_start = require('../../assets/sounds/start.mp3');
    // SOUND_FILES.session_complete = require('../../assets/sounds/complete.mp3');
    // SOUND_FILES.egg_crack = require('../../assets/sounds/crack.mp3');
    // SOUND_FILES.streak_increase = require('../../assets/sounds/streak.mp3');
    // SOUND_FILES.shield_equip = require('../../assets/sounds/shield.mp3');
    // SOUND_FILES.quick_return = require('../../assets/sounds/shimmer.mp3');
    // SOUND_FILES.warning = require('../../assets/sounds/warning.mp3');
    // SOUND_FILES.celebration = require('../../assets/sounds/fanfare.mp3');
    // SOUND_FILES.pet = require('../../assets/sounds/pet.mp3');
    // SOUND_FILES.feed = require('../../assets/sounds/munch.mp3');
}

// Initialize sound files
loadSoundFiles();

class AudioManager {
    private soundCache: Map<SoundType, Audio.Sound> = new Map();
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
            this.isInitialized = true;
        } catch (error) {
            console.warn('Failed to initialize audio manager:', error);
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
     * Play a sound by type
     * Silently fails if sound file is not available
     */
    async playSound(type: SoundType): Promise<void> {
        if (!this.isEnabled) return;

        // Skip sounds that don't have files or have previously failed
        const file = SOUND_FILES[type];
        if (!file || this.failedSounds.has(type)) return;

        try {
            const config = SOUND_CONFIG[type];
            if (!config) {
                console.warn(`Unknown sound type: ${type}`);
                return;
            }

            // Check if sound is already cached
            let sound = this.soundCache.get(type);

            if (sound) {
                // Reuse cached sound - reset position and play
                const status = await sound.getStatusAsync();
                if (status.isLoaded) {
                    await sound.setPositionAsync(0);
                    await sound.playAsync();
                    return;
                }
                // Sound is no longer loaded, remove from cache
                this.soundCache.delete(type);
            }

            // Create and cache new sound
            const { sound: newSound } = await Audio.Sound.createAsync(
                file,
                { volume: config.volume, shouldPlay: true }
            );

            this.soundCache.set(type, newSound);

            // Set up automatic cleanup when playback finishes
            newSound.setOnPlaybackStatusUpdate((status: AVPlaybackStatus) => {
                if (status.isLoaded && status.didJustFinish) {
                    // Sound finished playing - keep in cache for reuse
                }
            });
        } catch (error) {
            // Mark sound as failed to prevent repeated attempts
            this.failedSounds.add(type);
            console.warn(`Failed to play sound: ${type}`, error);
        }
    }

    /**
     * Preload frequently used sounds
     */
    async preloadSounds(types: SoundType[]): Promise<void> {
        for (const type of types) {
            try {
                const file = SOUND_FILES[type];
                if (!file || this.soundCache.has(type) || this.failedSounds.has(type)) continue;

                const config = SOUND_CONFIG[type];
                if (!config) continue;

                const { sound } = await Audio.Sound.createAsync(
                    file,
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
     * Should be called when app is closing
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
     * Check if a sound type is available
     */
    isSoundAvailable(type: SoundType): boolean {
        return !!SOUND_FILES[type] && !this.failedSounds.has(type);
    }

    /**
     * Get list of available sounds
     */
    getAvailableSounds(): SoundType[] {
        return Object.keys(SOUND_FILES) as SoundType[];
    }
}

// Export singleton instance
export const audioManager = new AudioManager();
