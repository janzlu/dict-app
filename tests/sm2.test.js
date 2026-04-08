const { calculateNextReview } = require('../utils/sm2');

describe('SM-2 Spaced Repetition Logic', () => {
    beforeAll(() => {
        // Mock Date.now to a fixed time for predictable testing
        jest.useFakeTimers().setSystemTime(new Date('2026-04-07T12:00:00Z').getTime());
    });

    afterAll(() => {
        jest.useRealTimers();
    });

    test('User Score 1 (Forgot) resets mastery to 0', () => {
        const result = calculateNextReview(3, 1);
        expect(result.masteryLevel).toBe(0);
        
        // Offset 0 = 5 minutes
        const expectedTime = new Date(Date.now() + 5 * 60000).toISOString();
        expect(result.nextReviewTime).toBe(expectedTime);
    });

    test('User Score 2 (Hard) drops mastery by 1 (minimum 0)', () => {
        const res1 = calculateNextReview(3, 2);
        expect(res1.masteryLevel).toBe(2);

        const res2 = calculateNextReview(0, 2);
        expect(res2.masteryLevel).toBe(0); // Floor test
    });

    test('User Score 3 (Good) increases mastery by 1 (maximum 5)', () => {
        const res1 = calculateNextReview(3, 3);
        expect(res1.masteryLevel).toBe(4);

        const res2 = calculateNextReview(5, 3);
        expect(res2.masteryLevel).toBe(5); // Ceiling test
    });

    test('User Score 4 (Easy) increases mastery by 2 (maximum 5)', () => {
        const res1 = calculateNextReview(2, 4);
        expect(res1.masteryLevel).toBe(4);
        
        const res2 = calculateNextReview(4, 4);
        expect(res2.masteryLevel).toBe(5); // Ceiling test
    });
    
    test('Check correct time offset progression', () => {
        // Mastery 3 should give 1 day (1440 min)
        const res = calculateNextReview(2, 3);
        expect(res.masteryLevel).toBe(3);
        
        const expected1Day = new Date(Date.now() + 1440 * 60000).toISOString();
        expect(res.nextReviewTime).toBe(expected1Day);
    });
});
