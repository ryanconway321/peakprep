const { Router } = require('express');
const { requireAuth } = require('@clerk/express');
const Anthropic = require('@anthropic-ai/sdk');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const router = Router();
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// POST /api/generate/cards — generate flashcards from pasted notes
router.post('/cards', requireAuth(), async (req, res, next) => {
  try {
    const { notes, studySetId, count = 10 } = req.body;
    if (!notes) return res.status(400).json({ error: 'notes required' });

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      messages: [{
        role: 'user',
        content: `You are a study assistant. Generate ${count} high-quality flashcards from these notes. Focus on the most important concepts, definitions, and facts.

Notes:
${notes}

Respond ONLY with a JSON array, no other text:
[
  { "front": "question or term", "back": "answer or definition" },
  ...
]`,
      }],
    });

    const text = response.content[0].text;
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) return res.status(500).json({ error: 'Could not parse response' });
    const cards = JSON.parse(match[0]);

    // Save to DB if studySetId provided
    if (studySetId) {
      await prisma.card.createMany({
        data: cards.map(c => ({ studySetId, front: c.front, back: c.back })),
      });
    }

    res.json({ cards });
  } catch (err) { next(err); }
});

// POST /api/generate/quiz — generate quiz questions from notes or cards
router.post('/quiz', requireAuth(), async (req, res, next) => {
  try {
    const { notes, cards, count = 8 } = req.body;
    const source = notes || cards?.map(c => `Q: ${c.front}\nA: ${c.back}`).join('\n\n');
    if (!source) return res.status(400).json({ error: 'notes or cards required' });

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      messages: [{
        role: 'user',
        content: `Generate ${count} multiple choice quiz questions from this study material. Mix easy, medium and hard questions.

Material:
${source}

Respond ONLY with a JSON array:
[
  {
    "question": "...",
    "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
    "answer": "A",
    "explanation": "brief explanation of why this is correct"
  }
]`,
      }],
    });

    const text = response.content[0].text;
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) return res.status(500).json({ error: 'Could not parse response' });
    const questions = JSON.parse(match[0]);
    res.json({ questions });
  } catch (err) { next(err); }
});

// POST /api/generate/plan — generate a multi-day study plan
router.post('/plan', requireAuth(), async (req, res, next) => {
  try {
    const { testDate, sets } = req.body;
    // sets: [{ id, title, cardCount, hardCount }]
    if (!testDate || !sets?.length) return res.status(400).json({ error: 'testDate and sets required' });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const exam = new Date(testDate);
    exam.setHours(0, 0, 0, 0);
    const daysUntil = Math.max(1, Math.round((exam - today) / 86400000));

    const setList = sets.map(s =>
      `- "${s.title}": ${s.cardCount} cards total, ${s.hardCount} rated Hard (needs more review)`
    ).join('\n');

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      messages: [{
        role: 'user',
        content: `You are a study coach. Create a realistic ${daysUntil}-day study plan for a student with a test on ${testDate}.

Study sets:
${setList}

Today is day 1. The test is on day ${daysUntil + 1} (they should not study on the test day itself, unless it's tomorrow — in that case day 1 is the only study day).

Rules:
- Spread the material evenly but prioritize Hard cards early
- Include flashcards (review), quiz (practice), and test mode (final check) across the days
- Keep each day to 20-40 minutes max
- Day before the test: light review only, no new material
- Be specific about which set and which mode each day

Respond ONLY with a JSON array of days:
[
  {
    "day": 1,
    "date": "Mon Apr 21",
    "label": "Deep Review",
    "tasks": [
      { "setId": "use_actual_set_title_here", "setTitle": "...", "mode": "flashcards", "focus": "All cards, prioritize Hard ones", "minutes": 15 },
      { "setId": "use_actual_set_title_here", "setTitle": "...", "mode": "quiz", "focus": "Test your knowledge", "minutes": 10 }
    ],
    "totalMinutes": 25,
    "tip": "one motivational or strategic tip for today"
  }
]

Use the exact set titles from the list above. For setId use the set title as a placeholder (the frontend will match by title).`,
      }],
    });

    const text = response.content[0].text;
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) return res.status(500).json({ error: 'Could not parse plan' });

    const plan = JSON.parse(match[0]);

    // Inject real set IDs by matching titles
    const setMap = {};
    for (const s of sets) setMap[s.title.toLowerCase()] = s.id;
    for (const day of plan) {
      for (const task of day.tasks) {
        const matched = sets.find(s => s.title.toLowerCase() === task.setTitle?.toLowerCase());
        if (matched) task.setId = matched.id;
      }
    }

    res.json({ plan, daysUntil });
  } catch (err) { next(err); }
});

module.exports = router;