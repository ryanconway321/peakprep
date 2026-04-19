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
    // Spaced repetition: schedule next review based on difficulty
    const daysMap = { 0: 1, 1: 3, 2: 7, 3: 1 }; // hard = see again tomorrow
    const days = daysMap[difficulty] ?? 1;
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
