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

router.get('/stats', requireAuth(), async (req, res, next) => {
  try {
    const { userId } = getAuth(req);
    const [sets, sessions] = await Promise.all([
      prisma.studySet.count({ where: { userId } }),
      prisma.studySession.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 10 }),
    ]);
    const totalCards = await prisma.card.count({ where: { studySet: { userId } } });
    res.json({ sets, totalCards, recentSessions: sessions });
  } catch (err) { next(err); }
});

module.exports = router;
