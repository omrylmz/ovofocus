import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  STREAK_FREEZE_CONSTANTS,
  getStreakFreezeData,
  getAvailableFreezes,
  wasFreezeUsedToday,
  consumeStreakFreeze,
  checkAndAwardFreeze,
  canUseFreeze,
  clearStreakFreezeData,
  addFreezeDirectly,
} from '../streakFreeze';

describe('Streak Freeze Utility', () => {
  beforeEach(async () => {
    // Clear all mock storage before each test
    await AsyncStorage.clear();
    jest.clearAllMocks();
  });

  describe('STREAK_FREEZE_CONSTANTS', () => {
    it('should have correct constant values', () => {
      expect(STREAK_FREEZE_CONSTANTS.MAX_FREEZES).toBe(3);
      expect(STREAK_FREEZE_CONSTANTS.STREAK_MILESTONE_DAYS).toBe(7);
    });
  });

  describe('getStreakFreezeData', () => {
    it('should return default data when no data exists', async () => {
      const data = await getStreakFreezeData();

      expect(data.freezeCount).toBe(0);
      expect(data.lastFreezeUsedDate).toBeNull();
      expect(data.lastMilestoneStreak).toBe(0);
    });

    it('should return stored data when it exists', async () => {
      const storedData = {
        freezeCount: 2,
        lastFreezeUsedDate: '2024-01-15',
        lastMilestoneStreak: 7,
      };
      await AsyncStorage.setItem('@ovofocus/streak_freeze', JSON.stringify(storedData));

      const data = await getStreakFreezeData();

      expect(data.freezeCount).toBe(2);
      expect(data.lastFreezeUsedDate).toBe('2024-01-15');
      expect(data.lastMilestoneStreak).toBe(7);
    });
  });

  describe('getAvailableFreezes', () => {
    it('should return 0 when no freezes available', async () => {
      const freezes = await getAvailableFreezes();
      expect(freezes).toBe(0);
    });

    it('should return correct freeze count', async () => {
      await AsyncStorage.setItem('@ovofocus/streak_freeze', JSON.stringify({
        freezeCount: 2,
        lastFreezeUsedDate: null,
        lastMilestoneStreak: 0,
      }));

      const freezes = await getAvailableFreezes();
      expect(freezes).toBe(2);
    });
  });

  describe('wasFreezeUsedToday', () => {
    it('should return false when no freeze used', async () => {
      const result = await wasFreezeUsedToday();
      expect(result).toBe(false);
    });

    it('should return true when freeze used today', async () => {
      const today = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; })();
      await AsyncStorage.setItem('@ovofocus/streak_freeze', JSON.stringify({
        freezeCount: 1,
        lastFreezeUsedDate: today,
        lastMilestoneStreak: 0,
      }));

      const result = await wasFreezeUsedToday();
      expect(result).toBe(true);
    });

    it('should return false when freeze used on different day', async () => {
      await AsyncStorage.setItem('@ovofocus/streak_freeze', JSON.stringify({
        freezeCount: 1,
        lastFreezeUsedDate: '2024-01-01',
        lastMilestoneStreak: 0,
      }));

      const result = await wasFreezeUsedToday();
      expect(result).toBe(false);
    });
  });

  describe('consumeStreakFreeze', () => {
    it('should return false when no freezes available', async () => {
      const result = await consumeStreakFreeze();
      expect(result).toBe(false);
    });

    it('should return false when freeze already used today', async () => {
      const today = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; })();
      await AsyncStorage.setItem('@ovofocus/streak_freeze', JSON.stringify({
        freezeCount: 2,
        lastFreezeUsedDate: today,
        lastMilestoneStreak: 0,
      }));

      const result = await consumeStreakFreeze();
      expect(result).toBe(false);
    });

    it('should use freeze successfully', async () => {
      await AsyncStorage.setItem('@ovofocus/streak_freeze', JSON.stringify({
        freezeCount: 2,
        lastFreezeUsedDate: null,
        lastMilestoneStreak: 0,
      }));

      const result = await consumeStreakFreeze();
      expect(result).toBe(true);

      const data = await getStreakFreezeData();
      expect(data.freezeCount).toBe(1);
      expect(data.lastFreezeUsedDate).toBe((() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; })());
    });
  });

  describe('checkAndAwardFreeze', () => {
    it('should not award freeze when at max', async () => {
      await AsyncStorage.setItem('@ovofocus/streak_freeze', JSON.stringify({
        freezeCount: STREAK_FREEZE_CONSTANTS.MAX_FREEZES,
        lastFreezeUsedDate: null,
        lastMilestoneStreak: 0,
      }));

      const awarded = await checkAndAwardFreeze(7);
      expect(awarded).toBe(0);
    });

    it('should award freeze at milestone', async () => {
      // Start with 0 freezes and lastMilestoneStreak at 0
      await AsyncStorage.setItem('@ovofocus/streak_freeze', JSON.stringify({
        freezeCount: 0,
        lastFreezeUsedDate: null,
        lastMilestoneStreak: 0,
      }));

      // Reach 7-day streak (first milestone)
      const awarded = await checkAndAwardFreeze(7);
      expect(awarded).toBe(1);

      const data = await getStreakFreezeData();
      expect(data.freezeCount).toBe(1);
      expect(data.lastMilestoneStreak).toBe(7);
    });

    it('should not award freeze before milestone', async () => {
      const awarded = await checkAndAwardFreeze(5);
      expect(awarded).toBe(0);
    });

    it('should award freeze at next milestone', async () => {
      await AsyncStorage.setItem('@ovofocus/streak_freeze', JSON.stringify({
        freezeCount: 1,
        lastFreezeUsedDate: null,
        lastMilestoneStreak: 7,
      }));

      // Reach 14-day streak (second milestone)
      const awarded = await checkAndAwardFreeze(14);
      expect(awarded).toBe(1);

      const data = await getStreakFreezeData();
      expect(data.freezeCount).toBe(2);
      expect(data.lastMilestoneStreak).toBe(14);
    });
  });

  describe('canUseFreeze', () => {
    it('should return false when session completed today', async () => {
      await AsyncStorage.setItem('@ovofocus/streak_freeze', JSON.stringify({
        freezeCount: 1,
        lastFreezeUsedDate: null,
        lastMilestoneStreak: 0,
      }));

      const result = await canUseFreeze(true);
      expect(result).toBe(false);
    });

    it('should return false when no freezes available', async () => {
      const result = await canUseFreeze(false);
      expect(result).toBe(false);
    });

    it('should return false when freeze already used today', async () => {
      const today = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; })();
      await AsyncStorage.setItem('@ovofocus/streak_freeze', JSON.stringify({
        freezeCount: 1,
        lastFreezeUsedDate: today,
        lastMilestoneStreak: 0,
      }));

      const result = await canUseFreeze(false);
      expect(result).toBe(false);
    });

    it('should return true when conditions are met', async () => {
      await AsyncStorage.setItem('@ovofocus/streak_freeze', JSON.stringify({
        freezeCount: 1,
        lastFreezeUsedDate: '2024-01-01', // Not today
        lastMilestoneStreak: 0,
      }));

      const result = await canUseFreeze(false);
      expect(result).toBe(true);
    });
  });

  describe('clearStreakFreezeData', () => {
    it('should clear all streak freeze data', async () => {
      await AsyncStorage.setItem('@ovofocus/streak_freeze', JSON.stringify({
        freezeCount: 2,
        lastFreezeUsedDate: '2024-01-15',
        lastMilestoneStreak: 7,
      }));

      await clearStreakFreezeData();

      const data = await getStreakFreezeData();
      expect(data.freezeCount).toBe(0);
      expect(data.lastFreezeUsedDate).toBeNull();
      expect(data.lastMilestoneStreak).toBe(0);
    });
  });

  describe('addFreezeDirectly', () => {
    it('should add a freeze', async () => {
      const data = await addFreezeDirectly();

      expect(data.freezeCount).toBe(1);
    });

    it('should not exceed max freezes', async () => {
      await AsyncStorage.setItem('@ovofocus/streak_freeze', JSON.stringify({
        freezeCount: STREAK_FREEZE_CONSTANTS.MAX_FREEZES,
        lastFreezeUsedDate: null,
        lastMilestoneStreak: 0,
      }));

      const data = await addFreezeDirectly();

      expect(data.freezeCount).toBe(STREAK_FREEZE_CONSTANTS.MAX_FREEZES);
    });

    it('should increment freeze count correctly', async () => {
      await AsyncStorage.setItem('@ovofocus/streak_freeze', JSON.stringify({
        freezeCount: 1,
        lastFreezeUsedDate: null,
        lastMilestoneStreak: 0,
      }));

      const data = await addFreezeDirectly();

      expect(data.freezeCount).toBe(2);
    });
  });
});
