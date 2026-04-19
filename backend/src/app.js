require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { clerkMiddleware } = require('@clerk/express');

const meRouter        = require('./routes/me');
const setsRouter      = require('./routes/sets');
const cardsRouter     = require('./routes/cards');
const generateRouter  = require('./routes/generate');
const sessionsRouter  = require('./routes/sessions');
const pushRouter      = require('./routes/push');
const { sendStudyReminders } = require('./routes/push');

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(clerkMiddleware());

app.get('/health', (_, res) => res.json({ ok: true }));
app.use('/api/me',       meRouter);
app.use('/api/sets',     setsRouter);
app.use('/api/cards',    cardsRouter);
app.use('/api/generate', generateRouter);
app.use('/api/sessions', sessionsRouter);
app.use('/api/push',     pushRouter);

// Cron: send study reminders every hour on the hour
const cron = require('node-cron');
cron.schedule('0 * * * *', () => sendStudyReminders().catch(console.error));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Server error' });
});

module.exports = app;
