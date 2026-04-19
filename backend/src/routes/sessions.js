const { Router } = require('express');
const { requireAuth, getAuth } = require('@clerk/express');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const router = Router();

router.post('/', requireAuth(), async (req, res, next) => {
  try {
    const { userId } = getAuth(req);
    const { studySetId, mode, score, total, duration } = req.body;
    const session = await prisma.studySession.create({
      data: { userId, studySetId, mode, score, total, duration },
    });
    res.json(session);
  } catch (err) { next(err); }
});

module.exports = router;
