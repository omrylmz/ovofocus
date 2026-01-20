import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  STORAGE_KEYS,
  getCollection,
  addToCollection,
  clearCollection,
  getStats,
  updateStats,
  incrementSession,
  getSettings,
  updateSettings,
  getFavorites,
  setFavorites,
  toggleFavorite,
  getDailyProgress,
  incrementDailyProgress,
  getShieldInventory,
  addShield,
  useShield,
  getHappinessLevel,
  saveActiveSession,
  getActiveSession,
  clearActiveSession,
  restoreActiveSession,
  clearAllData,
  Stats,
  Settings,
  CollectedAnimal,
  PersistedSession,
  ShieldItem,
  SessionRestoreResult,
} from '../storage';

// Mock animal for testing
const mockAnimal = {
  id: 'test-animal',
  name: 'Test Animal',
  emoji: '🐤',
  rarity: 'common' as const,
  description: 'A test animal',
};

describe('Storage Utility', () => {
  beforeEach(async () => {
    // Clear all mock storage before each test
    await AsyncStorage.clear();
    jest.clearAllMocks();
  });

  describe('STORAGE_KEYS', () => {
    it('should have all required storage keys', () => {
      expect(STORAGE_KEYS.COLLECTION).toBeDefined();
      expect(STORAGE_KEYS.STATS).toBeDefined();
      expect(STORAGE_KEYS.SETTINGS).toBeDefined();
      expect(STORAGE_KEYS.FAVORITES).toBeDefined();
      expect(STORAGE_KEYS.DAILY_PROGRESS).toBeDefined();
      expect(STORAGE_KEYS.SHIELD_INVENTORY).toBeDefined();
      expect(STORAGE_KEYS.ANIMAL_INTERACTIONS).toBeDefined();
      expect(STORAGE_KEYS.ACTIVE_SESSION).toBeDefined();
    });
  });

  describe('Collection', () => {
    it('should return empty array when no collection exists', async () => {
      const collection = await getCollection();
      expect(collection).toEqual([]);
    });

    it('should add an animal to the collection', async () => {
      const sessionId = 'test-session-123';
      const collection = await addToCollection(mockAnimal, sessionId);

      expect(collection).toHaveLength(1);
      expect(collection[0].id).toBe(mockAnimal.id);
      expect(collection[0].name).toBe(mockAnimal.name);
      expect(collection[0].sessionId).toBe(sessionId);
      expect(collection[0].collectedAt).toBeDefined();
    });

    it('should persist collection to AsyncStorage', async () => {
      await addToCollection(mockAnimal, 'session-1');

      const storedData = await AsyncStorage.getItem(STORAGE_KEYS.COLLECTION);
      expect(storedData).toBeTruthy();

      const parsedData = JSON.parse(storedData!);
      expect(parsedData).toHaveLength(1);
    });

    it('should add multiple animals to collection', async () => {
      await addToCollection(mockAnimal, 'session-1');
      const collection = await addToCollection(
        { ...mockAnimal, id: 'test-animal-2', name: 'Test Animal 2' },
        'session-2'
      );

      expect(collection).toHaveLength(2);
    });

    it('should clear the collection', async () => {
      await addToCollection(mockAnimal, 'session-1');
      await clearCollection();

      const collection = await getCollection();
      expect(collection).toEqual([]);
    });
  });

  describe('Stats', () => {
    it('should return default stats when no stats exist', async () => {
      const stats = await getStats();

      expect(stats.totalSessions).toBe(0);
      expect(stats.completedSessions).toBe(0);
      expect(stats.failedSessions).toBe(0);
      expect(stats.totalFocusMinutes).toBe(0);
      expect(stats.currentStreak).toBe(0);
      expect(stats.bestStreak).toBe(0);
      expect(stats.lastSessionDate).toBeNull();
    });

    it('should update stats correctly', async () => {
      const updates: Partial<Stats> = {
        totalSessions: 5,
        completedSessions: 3,
      };

      const updatedStats = await updateStats(updates);

      expect(updatedStats.totalSessions).toBe(5);
      expect(updatedStats.completedSessions).toBe(3);
      // Other fields should remain at defaults
      expect(updatedStats.failedSessions).toBe(0);
    });

    it('should increment session correctly for completed session', async () => {
      const stats = await incrementSession(true, 25);

      expect(stats.totalSessions).toBe(1);
      expect(stats.completedSessions).toBe(1);
      expect(stats.failedSessions).toBe(0);
      expect(stats.totalFocusMinutes).toBe(25);
      expect(stats.currentStreak).toBe(1);
    });

    it('should increment session correctly for failed session', async () => {
      const stats = await incrementSession(false, 10);

      expect(stats.totalSessions).toBe(1);
      expect(stats.completedSessions).toBe(0);
      expect(stats.failedSessions).toBe(1);
      expect(stats.totalFocusMinutes).toBe(10);
      // Failed sessions should not affect streak
      expect(stats.currentStreak).toBe(0);
    });

    it('should track best streak', async () => {
      // Complete 3 sessions on "consecutive days" by mocking dates
      await incrementSession(true, 25);
      let stats = await incrementSession(true, 25);

      expect(stats.bestStreak).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Settings', () => {
    it('should return default settings when no settings exist', async () => {
      const settings = await getSettings();

      expect(settings.focusDuration).toBe(25);
      expect(settings.toleranceSeconds).toBe(20);
      expect(settings.soundEnabled).toBe(true);
      expect(settings.hapticsEnabled).toBe(true);
      expect(settings.notificationsEnabled).toBe(true);
      expect(settings.debugMode).toBe(false);
      expect(settings.maxPausesPerSession).toBe(3);
      expect(settings.dailyGoal).toBe(3);
    });

    it('should update settings correctly', async () => {
      const updates: Partial<Settings> = {
        focusDuration: 30,
        soundEnabled: false,
      };

      const updatedSettings = await updateSettings(updates);

      expect(updatedSettings.focusDuration).toBe(30);
      expect(updatedSettings.soundEnabled).toBe(false);
      // Other settings should remain at defaults
      expect(updatedSettings.hapticsEnabled).toBe(true);
    });

    it('should validate focusDuration bounds', async () => {
      // Test minimum bound
      let settings = await updateSettings({ focusDuration: 0 });
      expect(settings.focusDuration).toBe(1);

      // Test maximum bound
      settings = await updateSettings({ focusDuration: 200 });
      expect(settings.focusDuration).toBe(120);
    });

    it('should validate dailyGoal bounds', async () => {
      // Test minimum bound
      let settings = await updateSettings({ dailyGoal: 0 });
      expect(settings.dailyGoal).toBe(1);

      // Test maximum bound
      settings = await updateSettings({ dailyGoal: 50 });
      expect(settings.dailyGoal).toBe(20);
    });

    it('should validate toleranceSeconds bounds', async () => {
      // Test maximum bound
      const settings = await updateSettings({ toleranceSeconds: 500 });
      expect(settings.toleranceSeconds).toBe(300);
    });

    it('should validate ambientSoundVolume bounds', async () => {
      // Test minimum bound
      let settings = await updateSettings({ ambientSoundVolume: -10 });
      expect(settings.ambientSoundVolume).toBe(0);

      // Test maximum bound
      settings = await updateSettings({ ambientSoundVolume: 150 });
      expect(settings.ambientSoundVolume).toBe(100);
    });
  });

  describe('Favorites', () => {
    it('should return empty array when no favorites exist', async () => {
      const favorites = await getFavorites();
      expect(favorites).toEqual([]);
    });

    it('should set favorites', async () => {
      const favoriteIds = ['animal-1', 'animal-2'];
      await setFavorites(favoriteIds);

      const favorites = await getFavorites();
      expect(favorites).toEqual(favoriteIds);
    });

    it('should toggle favorite on', async () => {
      const favorites = await toggleFavorite('animal-1');

      expect(favorites).toContain('animal-1');
    });

    it('should toggle favorite off', async () => {
      await setFavorites(['animal-1', 'animal-2']);
      const favorites = await toggleFavorite('animal-1');

      expect(favorites).not.toContain('animal-1');
      expect(favorites).toContain('animal-2');
    });
  });

  describe('Daily Progress', () => {
    it('should return fresh progress for today', async () => {
      const progress = await getDailyProgress();

      expect(progress.completedSessions).toBe(0);
      expect(progress.goalAchieved).toBe(false);
      expect(progress.date).toBe(new Date().toISOString().split('T')[0]);
    });

    it('should increment daily progress', async () => {
      const dailyGoal = 3;
      const progress = await incrementDailyProgress(dailyGoal);

      expect(progress.completedSessions).toBe(1);
      expect(progress.goalAchieved).toBe(false);
    });

    it('should mark goal as achieved when reached', async () => {
      const dailyGoal = 2;
      await incrementDailyProgress(dailyGoal);
      const progress = await incrementDailyProgress(dailyGoal);

      expect(progress.completedSessions).toBe(2);
      expect(progress.goalAchieved).toBe(true);
    });
  });

  describe('Shield Inventory', () => {
    const mockShield: ShieldItem = {
      animalId: 'test-animal',
      animalName: 'Test Animal',
      rarity: 'common',
      durationSeconds: 10,
    };

    it('should return empty array when no shields exist', async () => {
      const inventory = await getShieldInventory();
      expect(inventory).toEqual([]);
    });

    it('should add a shield to inventory', async () => {
      const inventory = await addShield(mockShield);

      expect(inventory).toHaveLength(1);
      expect(inventory[0]).toEqual(mockShield);
    });

    it('should not add duplicate shields from same animal', async () => {
      await addShield(mockShield);
      const inventory = await addShield(mockShield);

      expect(inventory).toHaveLength(1);
    });

    it('should use and remove a shield', async () => {
      await addShield(mockShield);
      const usedShield = await useShield('test-animal');

      expect(usedShield).toEqual(mockShield);

      const inventory = await getShieldInventory();
      expect(inventory).toHaveLength(0);
    });

    it('should return null when using non-existent shield', async () => {
      const usedShield = await useShield('non-existent');
      expect(usedShield).toBeNull();
    });
  });

  describe('Active Session Persistence', () => {
    const mockSession: PersistedSession = {
      startTime: new Date().toISOString(),
      duration: 1500, // 25 minutes
      pauseCount: 0,
      isPaused: false,
      pausedAt: null,
      accumulatedPauseTime: 0,
      focusDuration: 25,
    };

    it('should save active session', async () => {
      await saveActiveSession(mockSession);

      const session = await getActiveSession();
      expect(session).toEqual(mockSession);
    });

    it('should return null when no active session exists', async () => {
      const session = await getActiveSession();
      expect(session).toBeNull();
    });

    it('should clear active session', async () => {
      await saveActiveSession(mockSession);
      await clearActiveSession();

      const session = await getActiveSession();
      expect(session).toBeNull();
    });
  });

  describe('restoreActiveSession', () => {
    let dateNowSpy: jest.SpyInstance;
    let mockNow: number;

    beforeEach(() => {
      // Fixed timestamp for testing: 2024-01-15T10:00:00Z
      mockNow = 1705312800000;
      dateNowSpy = jest.spyOn(Date, 'now').mockImplementation(() => mockNow);
    });

    afterEach(() => {
      dateNowSpy.mockRestore();
    });

    it("should return 'none' status when no session exists", async () => {
      const result = await restoreActiveSession();

      expect(result.status).toBe('none');
    });

    it("should return 'restored' status for valid session within time", async () => {
      // Session started 5 minutes ago (300 seconds), duration is 25 minutes (1500 seconds)
      const startTime = new Date(mockNow - 5 * 60 * 1000).toISOString();
      const session: PersistedSession = {
        startTime,
        duration: 1500, // 25 minutes in seconds
        pauseCount: 0,
        isPaused: false,
        pausedAt: null,
        accumulatedPauseTime: 0,
        focusDuration: 25,
      };

      await saveActiveSession(session);
      const result = await restoreActiveSession();

      expect(result.status).toBe('restored');
      if (result.status === 'restored') {
        expect(result.session).toEqual(session);
        // Remaining time should be ~1200 seconds (20 minutes)
        expect(result.remainingTime).toBe(1200);
      }
    });

    it("should return 'expired' status when session time has exceeded", async () => {
      // Session started 30 minutes ago, duration was 25 minutes
      const startTime = new Date(mockNow - 30 * 60 * 1000).toISOString();
      const session: PersistedSession = {
        startTime,
        duration: 1500, // 25 minutes in seconds
        pauseCount: 0,
        isPaused: false,
        pausedAt: null,
        accumulatedPauseTime: 0,
        focusDuration: 25,
      };

      await saveActiveSession(session);
      const result = await restoreActiveSession();

      expect(result.status).toBe('expired');
      if (result.status === 'expired') {
        expect(result.focusMinutes).toBe(25);
      }

      // Should have cleared the session
      const activeSession = await getActiveSession();
      expect(activeSession).toBeNull();
    });

    it("should return 'error' status for invalid session data - missing startTime", async () => {
      // Save invalid session data directly to AsyncStorage
      const invalidSession = {
        startTime: '',
        duration: 1500,
        pauseCount: 0,
        isPaused: false,
        pausedAt: null,
        accumulatedPauseTime: 0,
        focusDuration: 25,
      };

      await AsyncStorage.setItem(
        STORAGE_KEYS.ACTIVE_SESSION,
        JSON.stringify(invalidSession)
      );

      const result = await restoreActiveSession();

      expect(result.status).toBe('error');
      if (result.status === 'error') {
        expect(result.error).toBe('Invalid session data');
      }

      // Should have cleared the invalid session
      const activeSession = await getActiveSession();
      expect(activeSession).toBeNull();
    });

    it("should return 'error' status for invalid session data - invalid duration", async () => {
      const invalidSession = {
        startTime: new Date(mockNow - 5 * 60 * 1000).toISOString(),
        duration: -100, // Invalid negative duration
        pauseCount: 0,
        isPaused: false,
        pausedAt: null,
        accumulatedPauseTime: 0,
        focusDuration: 25,
      };

      await AsyncStorage.setItem(
        STORAGE_KEYS.ACTIVE_SESSION,
        JSON.stringify(invalidSession)
      );

      const result = await restoreActiveSession();

      expect(result.status).toBe('error');
      if (result.status === 'error') {
        expect(result.error).toBe('Invalid session data');
      }
    });

    it("should return 'error' status for invalid timestamp (future date)", async () => {
      // Session start time in the future
      const futureTime = new Date(mockNow + 60 * 60 * 1000).toISOString();
      const session: PersistedSession = {
        startTime: futureTime,
        duration: 1500,
        pauseCount: 0,
        isPaused: false,
        pausedAt: null,
        accumulatedPauseTime: 0,
        focusDuration: 25,
      };

      await saveActiveSession(session);
      const result = await restoreActiveSession();

      expect(result.status).toBe('error');
      if (result.status === 'error') {
        expect(result.error).toBe('Invalid session timestamp');
      }
    });

    it('should correctly calculate remaining time for paused session', async () => {
      // Session started 10 minutes ago, paused 5 minutes ago
      // Duration: 25 minutes, no accumulated pause time before this pause
      const startTime = new Date(mockNow - 10 * 60 * 1000).toISOString();
      const pausedAt = new Date(mockNow - 5 * 60 * 1000).toISOString();

      const session: PersistedSession = {
        startTime,
        duration: 1500, // 25 minutes in seconds
        pauseCount: 1,
        isPaused: true,
        pausedAt,
        accumulatedPauseTime: 0, // No pause time accumulated before this pause
        focusDuration: 25,
      };

      await saveActiveSession(session);
      const result = await restoreActiveSession();

      expect(result.status).toBe('restored');
      if (result.status === 'restored') {
        // For paused session: elapsed = (pausedAt - startTime) - accumulatedPauseTime
        // elapsed = (10 min - 5 min) - 0 = 5 minutes = 300 seconds
        // remaining = 1500 - 300 = 1200 seconds (20 minutes)
        expect(result.remainingTime).toBe(1200);
      }
    });

    it('should correctly account for accumulated pause time', async () => {
      // Session started 15 minutes ago, currently running (not paused)
      // But had 5 minutes of accumulated pause time from previous pauses
      const startTime = new Date(mockNow - 15 * 60 * 1000).toISOString();

      const session: PersistedSession = {
        startTime,
        duration: 1500, // 25 minutes in seconds
        pauseCount: 2,
        isPaused: false,
        pausedAt: null,
        accumulatedPauseTime: 5 * 60 * 1000, // 5 minutes of pause time in ms
        focusDuration: 25,
      };

      await saveActiveSession(session);
      const result = await restoreActiveSession();

      expect(result.status).toBe('restored');
      if (result.status === 'restored') {
        // For running session: elapsed = (now - startTime) - accumulatedPauseTime
        // elapsed = 15 min - 5 min = 10 minutes = 600 seconds
        // remaining = 1500 - 600 = 900 seconds (15 minutes)
        expect(result.remainingTime).toBe(900);
      }
    });

    it('should return expired when paused session would have exceeded duration', async () => {
      // Session started 30 minutes ago, paused 28 minutes ago
      // Duration: 25 minutes - session expired during pause
      const startTime = new Date(mockNow - 30 * 60 * 1000).toISOString();
      const pausedAt = new Date(mockNow - 28 * 60 * 1000).toISOString();

      const session: PersistedSession = {
        startTime,
        duration: 60, // 1 minute in seconds (very short for test)
        pauseCount: 1,
        isPaused: true,
        pausedAt,
        accumulatedPauseTime: 0,
        focusDuration: 1,
      };

      await saveActiveSession(session);
      const result = await restoreActiveSession();

      expect(result.status).toBe('expired');
      if (result.status === 'expired') {
        expect(result.focusMinutes).toBe(1);
      }
    });

    it("should handle invalid JSON in storage gracefully", async () => {
      // Store invalid JSON directly
      await AsyncStorage.setItem(
        STORAGE_KEYS.ACTIVE_SESSION,
        'not valid json {'
      );

      const result = await restoreActiveSession();

      // When getActiveSession() fails to parse JSON, it returns null
      // restoreActiveSession() then returns 'none' since no valid session exists
      // This is the expected graceful handling of corrupted data
      expect(result.status).toBe('none');
    });
  });

  describe('Happiness Level', () => {
    it('should return "sad" for low happiness', () => {
      expect(getHappinessLevel(0)).toBe('sad');
      expect(getHappinessLevel(30)).toBe('sad');
    });

    it('should return "neutral" for medium happiness', () => {
      expect(getHappinessLevel(31)).toBe('neutral');
      expect(getHappinessLevel(60)).toBe('neutral');
    });

    it('should return "happy" for high happiness', () => {
      expect(getHappinessLevel(61)).toBe('happy');
      expect(getHappinessLevel(80)).toBe('happy');
    });

    it('should return "ecstatic" for very high happiness', () => {
      expect(getHappinessLevel(81)).toBe('ecstatic');
      expect(getHappinessLevel(100)).toBe('ecstatic');
    });
  });

  describe('Clear All Data', () => {
    it('should clear all storage keys', async () => {
      // Add some data
      await addToCollection(mockAnimal, 'session-1');
      await updateSettings({ focusDuration: 30 });
      await setFavorites(['animal-1']);

      // Clear all
      await clearAllData();

      // Verify everything is cleared
      const collection = await getCollection();
      expect(collection).toEqual([]);

      const settings = await getSettings();
      expect(settings.focusDuration).toBe(25); // Default value

      const favorites = await getFavorites();
      expect(favorites).toEqual([]);
    });
  });
});
