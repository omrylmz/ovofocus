import {
  calculateCompletionRate,
  calculateMostProductiveDay,
  calculateMostProductiveTime,
  calculateTodayStats,
  calculateWeekStats,
  calculateWeeklyData,
  calculateMonthlyTrend,
  calculateStatsSummary,
  formatDuration,
  getTimePeriodIcon,
  getDayIcon,
  getLocalizedDayName,
} from '../statsCalculations';
import { Stats, CollectedAnimal } from '../storage';

// Helper to create a mock collected animal
const createMockAnimal = (
  id: string,
  collectedAt: Date | string
): CollectedAnimal => ({
  id,
  name: `Animal ${id}`,
  emoji: '🐰',
  rarity: 'common',
  description: 'A test animal',
  collectedAt: typeof collectedAt === 'string' ? collectedAt : collectedAt.toISOString(),
  sessionId: `session-${id}`,
});

// Helper to create default stats
const createMockStats = (overrides: Partial<Stats> = {}): Stats => ({
  totalSessions: 0,
  completedSessions: 0,
  failedSessions: 0,
  totalFocusMinutes: 0,
  currentStreak: 0,
  bestStreak: 0,
  lastSessionDate: null,
  ...overrides,
});

describe('Stats Calculations', () => {
  describe('calculateCompletionRate', () => {
    it('should return 0 rate when no sessions', () => {
      const stats = createMockStats();
      const result = calculateCompletionRate(stats);

      expect(result.completed).toBe(0);
      expect(result.failed).toBe(0);
      expect(result.rate).toBe(0);
    });

    it('should calculate correct rate for completed sessions', () => {
      const stats = createMockStats({
        completedSessions: 8,
        failedSessions: 2,
      });
      const result = calculateCompletionRate(stats);

      expect(result.completed).toBe(8);
      expect(result.failed).toBe(2);
      expect(result.rate).toBe(80);
    });

    it('should return 100% when all sessions completed', () => {
      const stats = createMockStats({
        completedSessions: 10,
        failedSessions: 0,
      });
      const result = calculateCompletionRate(stats);

      expect(result.rate).toBe(100);
    });

    it('should return 0% when all sessions failed', () => {
      const stats = createMockStats({
        completedSessions: 0,
        failedSessions: 5,
      });
      const result = calculateCompletionRate(stats);

      expect(result.rate).toBe(0);
    });

    it('should round rate to nearest integer', () => {
      const stats = createMockStats({
        completedSessions: 1,
        failedSessions: 2,
      });
      const result = calculateCompletionRate(stats);

      // 1/3 = 33.33...%
      expect(result.rate).toBe(33);
    });
  });

  describe('calculateMostProductiveDay', () => {
    it('should return null for empty collection', () => {
      const result = calculateMostProductiveDay([], 'en');
      expect(result).toBeNull();
    });

    it('should return the day with most sessions', () => {
      const monday = new Date('2024-01-15'); // Monday
      const tuesday = new Date('2024-01-16'); // Tuesday

      const collection: CollectedAnimal[] = [
        createMockAnimal('1', monday),
        createMockAnimal('2', monday),
        createMockAnimal('3', monday),
        createMockAnimal('4', tuesday),
      ];

      const result = calculateMostProductiveDay(collection, 'en');

      expect(result).not.toBeNull();
      expect(result!.day).toBe('Monday');
      expect(result!.sessions).toBe(3);
    });

    it('should return Turkish day name when language is tr', () => {
      const monday = new Date('2024-01-15'); // Monday

      const collection: CollectedAnimal[] = [
        createMockAnimal('1', monday),
      ];

      const result = calculateMostProductiveDay(collection, 'tr');

      expect(result).not.toBeNull();
      expect(result!.day).toBe('Pazartesi');
    });
  });

  describe('calculateMostProductiveTime', () => {
    it('should return null for empty collection', () => {
      const result = calculateMostProductiveTime([], 'en');
      expect(result).toBeNull();
    });

    it('should return morning for sessions between 5-11', () => {
      const morning = new Date('2024-01-15T08:00:00');

      const collection: CollectedAnimal[] = [
        createMockAnimal('1', morning),
        createMockAnimal('2', morning),
      ];

      const result = calculateMostProductiveTime(collection, 'en');

      expect(result).not.toBeNull();
      expect(result!.label).toBe('Morning');
      expect(result!.sessions).toBe(2);
    });

    it('should return afternoon for sessions between 12-16', () => {
      const afternoon = new Date('2024-01-15T14:00:00');

      const collection: CollectedAnimal[] = [
        createMockAnimal('1', afternoon),
      ];

      const result = calculateMostProductiveTime(collection, 'en');

      expect(result).not.toBeNull();
      expect(result!.label).toBe('Afternoon');
    });

    it('should return Turkish labels when language is tr', () => {
      const morning = new Date('2024-01-15T08:00:00');

      const collection: CollectedAnimal[] = [
        createMockAnimal('1', morning),
      ];

      const result = calculateMostProductiveTime(collection, 'tr');

      expect(result).not.toBeNull();
      expect(result!.label).toBe('Sabah');
    });
  });

  describe('calculateTodayStats', () => {
    it('should return 0 for empty collection', () => {
      const result = calculateTodayStats([]);

      expect(result.sessions).toBe(0);
      expect(result.minutes).toBe(0);
    });

    it('should count only today sessions', () => {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      const collection: CollectedAnimal[] = [
        createMockAnimal('1', today),
        createMockAnimal('2', today),
        createMockAnimal('3', yesterday),
      ];

      const result = calculateTodayStats(collection);

      expect(result.sessions).toBe(2);
      // Default avg duration is 25
      expect(result.minutes).toBe(50);
    });

    it('should use custom average duration', () => {
      const today = new Date();

      const collection: CollectedAnimal[] = [
        createMockAnimal('1', today),
      ];

      const result = calculateTodayStats(collection, 30);

      expect(result.sessions).toBe(1);
      expect(result.minutes).toBe(30);
    });
  });

  describe('calculateWeekStats', () => {
    it('should return 0 for empty collection', () => {
      const result = calculateWeekStats([]);

      expect(result.sessions).toBe(0);
      expect(result.minutes).toBe(0);
    });

    it('should count sessions from this week', () => {
      const today = new Date();
      const lastWeek = new Date(today);
      lastWeek.setDate(lastWeek.getDate() - 10);

      const collection: CollectedAnimal[] = [
        createMockAnimal('1', today),
        createMockAnimal('2', today),
        createMockAnimal('3', lastWeek),
      ];

      const result = calculateWeekStats(collection);

      expect(result.sessions).toBe(2);
    });
  });

  describe('calculateWeeklyData', () => {
    it('should return 7 days of data', () => {
      const result = calculateWeeklyData([], 'en');

      expect(result).toHaveLength(7);
    });

    it('should include day names', () => {
      const result = calculateWeeklyData([], 'en');

      // Each entry should have a day name
      result.forEach((day) => {
        expect(day.day).toMatch(/^(Sun|Mon|Tue|Wed|Thu|Fri|Sat)$/);
      });
    });

    it('should use Turkish day names when language is tr', () => {
      const result = calculateWeeklyData([], 'tr');

      // Each entry should have a Turkish day name
      result.forEach((day) => {
        expect(day.day).toMatch(/^(Paz|Pzt|Sal|Car|Per|Cum|Cmt)$/);
      });
    });
  });

  describe('calculateMonthlyTrend', () => {
    it('should return 4 weeks of data', () => {
      const result = calculateMonthlyTrend([], 'en');

      expect(result).toHaveLength(4);
    });

    it('should label weeks correctly', () => {
      const result = calculateMonthlyTrend([], 'en');

      expect(result[0].weekLabel).toBe('Week 1');
      expect(result[3].weekLabel).toBe('Week 4');
    });

    it('should use Turkish labels when language is tr', () => {
      const result = calculateMonthlyTrend([], 'tr');

      expect(result[0].weekLabel).toBe('Hafta 1');
    });
  });

  describe('calculateStatsSummary', () => {
    it('should return complete stats summary', () => {
      const stats = createMockStats({
        completedSessions: 10,
        failedSessions: 2,
        totalFocusMinutes: 250,
        currentStreak: 5,
        bestStreak: 10,
      });

      const result = calculateStatsSummary(stats, [], 'en');

      expect(result.totalFocusTimeAllTime).toBe(250);
      expect(result.sessionCountAllTime).toBe(10);
      expect(result.currentStreak).toBe(5);
      expect(result.bestStreak).toBe(10);
      expect(result.completionRate.rate).toBe(83); // 10/12 rounded
      expect(result.averageSessionDuration).toBe(25); // 250/10
    });

    it('should default to 25 min avg when no completed sessions', () => {
      const stats = createMockStats();

      const result = calculateStatsSummary(stats, [], 'en');

      expect(result.averageSessionDuration).toBe(25);
    });
  });

  describe('formatDuration', () => {
    it('should format minutes less than 60', () => {
      expect(formatDuration(30, 'en')).toBe('30m');
      expect(formatDuration(30, 'tr')).toBe('30 dk');
    });

    it('should format exact hours', () => {
      expect(formatDuration(60, 'en')).toBe('1h');
      expect(formatDuration(120, 'en')).toBe('2h');
      expect(formatDuration(60, 'tr')).toBe('1 sa');
    });

    it('should format hours and minutes', () => {
      expect(formatDuration(90, 'en')).toBe('1h 30m');
      expect(formatDuration(90, 'tr')).toBe('1 sa 30 dk');
    });
  });

  describe('getTimePeriodIcon', () => {
    it('should return correct icons for English labels', () => {
      expect(getTimePeriodIcon('Morning')).toBe('🌅');
      expect(getTimePeriodIcon('Afternoon')).toBe('☀️');
      expect(getTimePeriodIcon('Evening')).toBe('🌆');
      expect(getTimePeriodIcon('Night')).toBe('🌙');
    });

    it('should return correct icons for Turkish labels', () => {
      expect(getTimePeriodIcon('Sabah')).toBe('🌅');
      expect(getTimePeriodIcon('Ogle')).toBe('☀️');
      expect(getTimePeriodIcon('Aksam')).toBe('🌆');
      expect(getTimePeriodIcon('Gece')).toBe('🌙');
    });

    it('should return default icon for unknown labels', () => {
      expect(getTimePeriodIcon('Unknown')).toBe('⏰');
    });
  });

  describe('getDayIcon', () => {
    it('should return an icon for each day index', () => {
      for (let i = 0; i < 7; i++) {
        const icon = getDayIcon(i);
        expect(icon).toBeTruthy();
        expect(typeof icon).toBe('string');
      }
    });

    it('should return default icon for invalid index', () => {
      expect(getDayIcon(10)).toBe('📅');
    });
  });

  describe('getLocalizedDayName', () => {
    it('should return English day names', () => {
      const monday = new Date('2024-01-15');
      expect(getLocalizedDayName(monday, 'en', false)).toBe('Monday');
      expect(getLocalizedDayName(monday, 'en', true)).toBe('Mon');
    });

    it('should return Turkish day names', () => {
      const monday = new Date('2024-01-15');
      expect(getLocalizedDayName(monday, 'tr', false)).toBe('Pazartesi');
      expect(getLocalizedDayName(monday, 'tr', true)).toBe('Pzt');
    });
  });
});
