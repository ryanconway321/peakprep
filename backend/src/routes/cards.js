const { Router } = require('express');
const { requireAuth, getAuth } = require('@clerk/express');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const router = Router();

router.post('/', requireAuth(), async (req, res, next) => {
  try {
    const { studySetId, front, back } = req.body;
    const card = await prisma.card.create({ data: { studySetId, front, back } });
    res.json(card);
  } catch (err) { next(err); }
});

router.patch('/:id', requireAuth(), async (req, res, next) => {
  try {
    const { front, back, difficulty } = req.body;
    // SM-2 inspired spaced repetition
    // difficulty: 1=easy, 2=medium, 3=hard
    const current = await prisma.card.findUnique({ where: { id: req.params.id } });
    const prevDiff = current?.difficulty || 0;

    let days;
    if (difficulty === 3) {
      // Hard: review again tomorrow
      days = 1;
    } else if (difficulty === 2) {
      // Medium: 3 days, but if was already medium/easy, space it out more
      days = prevDiff <= 2 ? 4 : 2;
    } else {
      // Easy: exponential spacing — 7, 14, 30 days based on history
      const easyMap = { 0: 7, 1: 14, 2: 30, 3: 3 }; // if coming from hard, don't jump too far
      days = easyMap[prevDiff] ?? 7;
    }

    const nextReview = new Date(Date.now() + days * 86400000);
    const card = await prisma.card.update({
      where: { id: req.params.id },
      data: { front, back, difficulty, nextReview },
    });
    res.json(card);
  } catch (err) { next(err); }
});

router.delete('/:id', requireAuth(), async (req, res, next) => {
  try {
    await prisma.card.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

module.exports = router;
