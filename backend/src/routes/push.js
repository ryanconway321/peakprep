const { Router } = require('express');
const { requireAuth, getAuth } = require('@clerk/express');
const webpush = require('web-push');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const router = Router();

webpush.setVapidDetails(
  'mailto:support@peakprep.app',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY,
);

// GET /api/push/vapid-public-key
router.get('/vapid-public-key', (req, res) => {
  res.json({ key: process.env.VAPID_PUBLIC_KEY });
});

// POST /api/push/subscribe
router.post('/subscribe', requireAuth(), async (req, res, next) => {
  try {
    const { userId } = getAuth(req);
    const { subscription, reminderHour = 19 } = req.body;

    await prisma.pushSubscription.upsert({
      where: { endpoint: subscription.endpoint },
      update: { p256dh: subscription.keys.p256dh, auth: subscription.keys.auth, reminderHour },
      create: {
        userId,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        reminderHour,
      },
    });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// DELETE /api/push/unsubscribe
router.delete('/unsubscribe', requireAuth(), async (req, res, next) => {
  try {
    const { endpoint } = req.body;
    await prisma.pushSubscription.deleteMany({ where: { endpoint } });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// PUT /api/push/reminder-hour
router.put('/reminder-hour', requireAuth(), async (req, res, next) => {
  try {
    const { userId } = getAuth(req);
    const { reminderHour, endpoint } = req.body;
    await prisma.pushSubscription.updateMany({
      where: { userId, endpoint },
      data: { reminderHour },
    });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// Helper used by cron
async function sendStudyReminders() {
  const nowHour = new Date().getUTCHours();
  const subs = await prisma.pushSubscription.findMany({
    where: { reminderHour: nowHour },
    include: { user: { include: { studySets: { include: { cards: true } } } } },
  });

  let sent = 0, failed = 0;
  for (const sub of subs) {
    const dueCount = sub.user.studySets.reduce((n, set) =>
      n + set.cards.filter(c => new Date(c.nextReview) <= new Date()).length, 0);

    const body = dueCount > 0
      ? `You have ${dueCount} card${dueCount > 1 ? 's' : ''} due for review. Don't break your streak!`
      : 'Keep your streak alive — review your cards today!';

    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify({ title: '📚 Study reminder', body, icon: '/icon-192.png', url: '/' }),
      );
      sent++;
    } catch (e) {
      if (e.statusCode === 410) {
        await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
      }
      failed++;
    }
  }
  console.log(`[push] study reminders: ${sent} sent, ${failed} failed`);
}

module.exports = router;
module.exports.sendStudyReminders = sendStudyReminders;
