const { Router } = require('express');
const { requireAuth, getAuth } = require('@clerk/express');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const router = Router();

router.get('/', requireAuth(), async (req, res, next) => {
  try {
    const { userId } = getAuth(req);
    const sets = await prisma.studySet.findMany({
      where: { userId },
      include: { _count: { select: { cards: true } } },
      orderBy: { updatedAt: 'desc' },
    });
    res.json(sets);
  } catch (err) { next(err); }
});

router.post('/', requireAuth(), async (req, res, next) => {
  try {
    const { userId } = getAuth(req);
    const { title, description, subject } = req.body;
    const set = await prisma.studySet.create({
      data: { userId, title, description, subject },
    });
    res.json(set);
  } catch (err) { next(err); }
});

router.get('/:id', requireAuth(), async (req, res, next) => {
  try {
    const { userId } = getAuth(req);
    const set = await prisma.studySet.findFirst({
      where: { id: req.params.id, userId },
      include: { cards: { orderBy: { nextReview: 'asc' } } },
    });
    if (!set) return res.status(404).json({ error: 'Not found' });
    res.json(set);
  } catch (err) { next(err); }
});

router.patch('/:id', requireAuth(), async (req, res, next) => {
  try {
    const { userId } = getAuth(req);
    const { title, description, subject } = req.body;
    const set = await prisma.studySet.updateMany({
      where: { id: req.params.id, userId },
      data: { title, description, subject },
    });
    res.json(set);
  } catch (err) { next(err); }
});

router.delete('/:id', requireAuth(), async (req, res, next) => {
  try {
    const { userId } = getAuth(req);
    await prisma.studySet.deleteMany({ where: { id: req.params.id, userId } });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

module.exports = router;
