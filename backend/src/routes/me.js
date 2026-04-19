const { Router } = require('express');
const { requireAuth, getAuth } = require('@clerk/express');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const router = Router();

router.post('/sync', requireAuth(), async (req, res, next) => {
  try {
    const { userId } = getAuth(req);
    const { email, name } = req.body;
    const user = await prisma.user.upsert({
      where: { id: userId },
      update: { email, name },
      create: { id: userId, email, name },
    });
    res.json(user);
  } catch (err) { next(err); }
});

router.get('/dashboard', requireAuth(), async (req, res, next) => {
  try {
    const { userId } = getAuth(req);
    // Ensure user exists
    await prisma.user.upsert({
      where: { id: userId },
      update: {},
      create: { id: userId, email: '', name: '' },
    });
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today.getTime() + 86400000);

    // All sets with cards
    const sets = await prisma.studySet.findMany({
      where: { userId },
      include: {
        cards: true,
        _count: { select: { cards: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    // Due cards (nextReview <= now)
    const dueCards = [];
    for (const set of sets) {
      const due = set.cards.filter(c => new Date(c.nextReview) <= now);
      if (due.length > 0) {
        dueCards.push({ setId: set.id, setTitle: set.title, subject: set.subject, count: due.length });
      }
    }

    // Streak: count consecutive days with a study session
    const sessions = await prisma.studySession.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });

    let streak = 0;
    if (sessions.length > 0) {
      const uniqueDays = [...new Set(sessions.map(s => s.createdAt.toISOString().slice(0, 10)))];
      const todayStr = today.toISOString().slice(0, 10);
      const yesterdayStr = new Date(today.getTime() - 86400000).toISOString().slice(0, 10);
      
      // Only count streak if studied today or yesterday
      if (uniqueDays[0] === todayStr || uniqueDays[0] === yesterdayStr) {
        let checkDate = uniqueDays[0] === todayStr ? today : new Date(today.getTime() - 86400000);
        for (const day of uniqueDays) {
          const checkStr = checkDate.toISOString().slice(0, 10);
          if (day === checkStr) { streak++; checkDate = new Date(checkDate.getTime() - 86400000); }
          else break;
        }
      }
    }

    // Total cards due today
    const totalDue = dueCards.reduce((sum, d) => sum + d.count, 0);

    // Retention rate (last 50 sessions)
    const recentSessions = await prisma.studySession.findMany({
      where: { userId, score: { not: null }, total: { gt: 0 } },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    const retention = recentSessions.length > 0
      ? Math.round(recentSessions.reduce((sum, s) => sum + (s.score / s.total), 0) / recentSessions.length * 100)
      : null;

    res.json({
      sets: sets.map(s => ({ ...s, cards: undefined })),
      dueCards,
      totalDue,
      streak,
      retention,
      totalCards: sets.reduce((sum, s) => sum + s._count.cards, 0),
    });
  } catch (err) { next(err); }
});

module.exports = router;
