function calculateNextReview(currentMastery, userScore) {
    // currentMastery: 0 to 5
    // userScore: 1 (Forgot), 2 (Hard), 3 (Good), 4 (Easy)

    let nextMastery = currentMastery;

    if (userScore === 1) {
        nextMastery = 0; // Reset penalty
    } else if (userScore === 2) {
        nextMastery = Math.max(0, currentMastery - 1);
    } else if (userScore === 3) {
        nextMastery = Math.min(5, currentMastery + 1);
    } else if (userScore === 4) {
        nextMastery = Math.min(5, currentMastery + 2);
    }

    // Interval mapping based on mastery logic (in minutes)
    // 0: 5 min
    // 1: 60 min (1 hr)
    // 2: 720 min (12 hrs)
    // 3: 1440 min (1 day)
    // 4: 4320 min (3 days)
    // 5: 10080 min (7 days)
    
    let offsetMinutes = 5;
    switch (nextMastery) {
        case 0: offsetMinutes = 5; break;
        case 1: offsetMinutes = 60; break;
        case 2: offsetMinutes = 720; break;
        case 3: offsetMinutes = 1440; break;
        case 4: offsetMinutes = 4320; break;
        case 5: offsetMinutes = 10080; break;
    }

    const nextReview = new Date(Date.now() + offsetMinutes * 60000);

    return {
        masteryLevel: nextMastery,
        nextReviewTime: nextReview.toISOString()
    };
}

module.exports = { calculateNextReview };
