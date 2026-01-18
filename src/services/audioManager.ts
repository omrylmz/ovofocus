/**
 * Audio Manager for Ovo Focus
 *
 * CURRENT STATUS: Audio system is not functional - sound files are not loaded.
 *
 * TO ENABLE AUDIO:
 * 1. Create the assets/sounds/ directory if it doesn't exist
 * 2. Add the following MP3 files (recommended: short, ~0.5-2 seconds each):
 *    - button.mp3      : UI button click/tap sound
 *    - start.mp3       : Session start chime
 *    - complete.mp3    : Session completion fanfare
 *    - crack.mp3       : Egg cracking/hatching sound
 *    - streak.mp3      : Streak increase celebration
 *    - shield.mp3      : Shield/power-up equip sound
 *    - shimmer.mp3     : Quick return/magical shimmer
 *    - warning.mp3     : Warning/alert tone
 *    - fanfare.mp3     : Big celebration (legendary hatch)
 *    - pet.mp3         : Pet interaction sound
 *    - munch.mp3       : Feeding/eating sound
 *
 * 3. Uncomment the require() lines in loadSoundFiles() function below
 *
 * RECOMMENDED SOURCES (CC0/royalty-free):
 *    - https://pixabay.com/sound-effects/
 *    - https://freesound.org/ (filter by CC0 license)
 *    - https://mixkit.co/free-sound-effects/
 *
 * The audio manager handles missing files gracefully - if a sound file
 * is not available, playSound() will silently return without error.
 */

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

/**
 * Sound file registry - maps sound types to their loaded audio assets.
 * Currently empty because no sound files are installed.
 * When sound files are added, they will be registered here via loadSoundFiles().
 */
const SOUND_FILES: Partial<Record<SoundType, any>> = {};

/**
 * Loads sound file assets into the SOUND_FILES registry.
 *
 * TODO: To enable audio functionality:
 * 1. Add MP3 files to assets/sounds/ directory
 * 2. Uncomment the require() lines below for each sound file you add
 * 3. The audio manager will automatically pick them up
 *
 * Note: require() statements must be uncommented individually as each
 * sound file is added. Uncommenting a require() for a non-existent file
 * will cause a build error.
 */
function loadSoundFiles(): void {
    // TODO: Uncomment each line after adding the corresponding MP3 file to assets/sounds/
    //
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

// Initialize sound files on module load
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
     * Play a sound by type.
     *
     * Handles missing sound files gracefully:
     * - If the sound file is not registered in SOUND_FILES, returns silently
     * - If the sound previously failed to load, skips without retry
     * - If audio is disabled via setEnabled(false), returns silently
     *
     * This allows the app to call playSound() for any event without
     * worrying about whether sound files are actually installed.
     */
    async playSound(type: SoundType): Promise<void> {
        if (!this.isEnabled) return;

        // Gracefully handle missing sound files - just return without error
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
     * Check if a specific sound type has a file loaded and hasn't failed.
     * Returns false if no sound files are installed (current state).
     */
    isSoundAvailable(type: SoundType): boolean {
        return !!SOUND_FILES[type] && !this.failedSounds.has(type);
    }

    /**
     * Get list of sound types that have files loaded.
     * Returns empty array if no sound files are installed (current state).
     */
    getAvailableSounds(): SoundType[] {
        return Object.keys(SOUND_FILES) as SoundType[];
    }

    /**
     * Check if the audio system is functional (has any sound files loaded).
     * Currently returns false because no sound files are installed.
     *
     * See the file header documentation for instructions on adding sound files.
     */
    isAudioSystemFunctional(): boolean {
        return Object.keys(SOUND_FILES).length > 0;
    }

    /**
     * Get all defined sound types (whether files are loaded or not).
     * Useful for debugging/logging what sounds the app expects.
     */
    getAllDefinedSoundTypes(): SoundType[] {
        return Object.keys(SOUND_CONFIG) as SoundType[];
    }
}

// Export singleton instance
export const audioManager = new AudioManager();
