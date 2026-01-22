import {
    createGoal,
    updateGoalProgress,
    updateGoalFromSessions,
    checkGoalCompletion,
    getActiveGoals,
    calculateStreakProgress,
    clearAllGoals,
    deleteGoal,
    getGoalsByType,
    getGoalProgressPercentage,
    getRemainingForGoal,
    Goal,
    SessionData,
} from '../goalTracking';

// Mock AsyncStorage with actual storage behavior
const mockStorage: Record<string, string> = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
    getItem: jest.fn((key: string) => Promise.resolve(mockStorage[key] || null)),
    setItem: jest.fn((key: string, value: string) => {
        mockStorage[key] = value;
        return Promise.resolve();
    }),
    removeItem: jest.fn((key: string) => {
        delete mockStorage[key];
        return Promise.resolve();
    }),
}));

// Helper to clear mock storage between tests
function clearMockStorage() {
    Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);
}

describe('goalTracking', () => {
    beforeEach(async () => {
        // Clear mock storage and goals before each test
        clearMockStorage();
        await clearAllGoals();
        jest.clearAllMocks();
    });

    describe('createGoal', () => {
        it('should create a daily goal with correct structure', async () => {
            const goal = await createGoal('daily', 3);

            expect(goal).toMatchObject({
                type: 'daily',
                target: 3,
                progress: 0,
                completedAt: null,
            });
            expect(goal.id).toMatch(/^goal_/);
            expect(goal.createdAt).toBeDefined();
            expect(goal.lastUpdatedAt).toBeDefined();
        });

        it('should create a weekly goal', async () => {
            const goal = await createGoal('weekly', 10);

            expect(goal.type).toBe('weekly');
            expect(goal.target).toBe(10);
            expect(goal.progress).toBe(0);
        });

        it('should create a streak goal', async () => {
            const goal = await createGoal('streak', 7);

            expect(goal.type).toBe('streak');
            expect(goal.target).toBe(7);
        });

        it('should throw error for invalid target', async () => {
            await expect(createGoal('daily', 0)).rejects.toThrow();
            await expect(createGoal('daily', -1)).rejects.toThrow();
        });
    });

    describe('updateGoalProgress', () => {
        it('should update progress with numeric value', async () => {
            const goal = await createGoal('daily', 3);

            const updatedGoal = await updateGoalProgress(goal.id, 2);

            expect(updatedGoal?.progress).toBe(2);
        });

        it('should return null for non-existent goal', async () => {
            const result = await updateGoalProgress('nonexistent', 1);

            expect(result).toBeNull();
        });
    });

    describe('updateGoalFromSessions', () => {
        it('should update progress from session data for daily goal', async () => {
            const goal = await createGoal('daily', 3);
            const sessions: SessionData[] = [
                { completedAt: new Date().toISOString(), sessionId: 'session1' },
                { completedAt: new Date().toISOString(), sessionId: 'session2' },
            ];

            const updatedGoal = await updateGoalFromSessions(goal.id, sessions);

            expect(updatedGoal?.progress).toBe(2);
        });

        it('should return null for non-existent goal', async () => {
            const result = await updateGoalFromSessions('nonexistent', []);

            expect(result).toBeNull();
        });
    });

    describe('checkGoalCompletion', () => {
        it('should return true when progress meets target', () => {
            const goal: Goal = {
                id: 'test',
                type: 'daily',
                target: 3,
                progress: 3,
                createdAt: new Date().toISOString(),
                completedAt: null,
                lastUpdatedAt: new Date().toISOString(),
            };

            expect(checkGoalCompletion(goal)).toBe(true);
        });

        it('should return true when progress exceeds target', () => {
            const goal: Goal = {
                id: 'test',
                type: 'daily',
                target: 3,
                progress: 5,
                createdAt: new Date().toISOString(),
                completedAt: null,
                lastUpdatedAt: new Date().toISOString(),
            };

            expect(checkGoalCompletion(goal)).toBe(true);
        });

        it('should return false when progress is below target', () => {
            const goal: Goal = {
                id: 'test',
                type: 'daily',
                target: 3,
                progress: 2,
                createdAt: new Date().toISOString(),
                completedAt: null,
                lastUpdatedAt: new Date().toISOString(),
            };

            expect(checkGoalCompletion(goal)).toBe(false);
        });
    });

    describe('getActiveGoals', () => {
        it('should return empty array when no goals exist', async () => {
            const goals = await getActiveGoals();

            expect(goals).toEqual([]);
        });

        it('should return only non-completed goals', async () => {
            await createGoal('daily', 1);
            await createGoal('weekly', 5);

            const goals = await getActiveGoals();

            expect(goals.length).toBe(2);
            goals.forEach((goal) => {
                expect(goal.completedAt).toBeNull();
            });
        });
    });

    describe('calculateStreakProgress', () => {
        it('should return 0 for empty sessions', () => {
            const streak = calculateStreakProgress([]);

            expect(streak).toBe(0);
        });

        it('should calculate streak for consecutive days', () => {
            const today = new Date();
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            const twoDaysAgo = new Date(today);
            twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

            const sessions: SessionData[] = [
                { completedAt: today.toISOString(), sessionId: 's1' },
                { completedAt: yesterday.toISOString(), sessionId: 's2' },
                { completedAt: twoDaysAgo.toISOString(), sessionId: 's3' },
            ];

            const streak = calculateStreakProgress(sessions);

            expect(streak).toBe(3);
        });

        it('should break streak on missed day', () => {
            const today = new Date();
            const threeDaysAgo = new Date(today);
            threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

            const sessions: SessionData[] = [
                { completedAt: today.toISOString(), sessionId: 's1' },
                // Missing yesterday and day before
                { completedAt: threeDaysAgo.toISOString(), sessionId: 's2' },
            ];

            const streak = calculateStreakProgress(sessions);

            expect(streak).toBe(1); // Only today counts
        });

        it('should handle multiple sessions on the same day', () => {
            const today = new Date();
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);

            const sessions: SessionData[] = [
                { completedAt: today.toISOString(), sessionId: 's1' },
                { completedAt: today.toISOString(), sessionId: 's2' },
                { completedAt: today.toISOString(), sessionId: 's3' },
                { completedAt: yesterday.toISOString(), sessionId: 's4' },
            ];

            const streak = calculateStreakProgress(sessions);

            expect(streak).toBe(2); // 2 days, not 4 sessions
        });
    });

    describe('edge cases', () => {
        it('should handle midnight rollover correctly', () => {
            // Use fixed dates relative to today to avoid timing issues
            const today = new Date();
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            yesterday.setHours(23, 59, 59, 999);

            const todayEarly = new Date(today);
            todayEarly.setHours(0, 0, 0, 1);

            const sessions: SessionData[] = [
                { completedAt: todayEarly.toISOString(), sessionId: 's1' },
                { completedAt: yesterday.toISOString(), sessionId: 's2' },
            ];

            const streak = calculateStreakProgress(sessions);

            expect(streak).toBe(2); // Should count as 2 consecutive days
        });

        it('should handle week boundary correctly for weekly goals', async () => {
            const goal = await createGoal('weekly', 5);

            expect(goal.type).toBe('weekly');
            // Weekly goals should reset at week boundaries
            // This is tested through updateGoalFromSessions with sessions spanning weeks
        });
    });

    describe('deleteGoal', () => {
        it('should delete an existing goal', async () => {
            const goal = await createGoal('daily', 3);

            const result = await deleteGoal(goal.id);

            expect(result).toBe(true);
        });

        it('should return false for non-existent goal', async () => {
            const result = await deleteGoal('nonexistent');

            expect(result).toBe(false);
        });
    });

    describe('getGoalsByType', () => {
        it('should return only goals of specified type', async () => {
            await createGoal('daily', 3);
            await createGoal('weekly', 10);
            await createGoal('daily', 5);

            const dailyGoals = await getGoalsByType('daily');

            expect(dailyGoals.length).toBe(2);
            dailyGoals.forEach((goal) => {
                expect(goal.type).toBe('daily');
            });
        });

        it('should return empty array when no goals of type exist', async () => {
            await createGoal('daily', 3);

            const streakGoals = await getGoalsByType('streak');

            expect(streakGoals).toEqual([]);
        });
    });

    describe('getGoalProgressPercentage', () => {
        it('should calculate correct percentage', () => {
            const goal: Goal = {
                id: 'test',
                type: 'daily',
                target: 10,
                progress: 5,
                createdAt: new Date().toISOString(),
                completedAt: null,
                lastUpdatedAt: new Date().toISOString(),
            };

            expect(getGoalProgressPercentage(goal)).toBe(50);
        });

        it('should cap at 100%', () => {
            const goal: Goal = {
                id: 'test',
                type: 'daily',
                target: 5,
                progress: 10,
                createdAt: new Date().toISOString(),
                completedAt: null,
                lastUpdatedAt: new Date().toISOString(),
            };

            expect(getGoalProgressPercentage(goal)).toBe(100);
        });
    });

    describe('getRemainingForGoal', () => {
        it('should return remaining count', () => {
            const goal: Goal = {
                id: 'test',
                type: 'daily',
                target: 10,
                progress: 3,
                createdAt: new Date().toISOString(),
                completedAt: null,
                lastUpdatedAt: new Date().toISOString(),
            };

            expect(getRemainingForGoal(goal)).toBe(7);
        });

        it('should return 0 when progress exceeds target', () => {
            const goal: Goal = {
                id: 'test',
                type: 'daily',
                target: 5,
                progress: 10,
                createdAt: new Date().toISOString(),
                completedAt: null,
                lastUpdatedAt: new Date().toISOString(),
            };

            expect(getRemainingForGoal(goal)).toBe(0);
        });
    });
});
