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
    const { testDate, testDescription, sets } = req.body;
    // sets: [{ id, title, cardCount, hardCount }]
    if (!testDate || !sets?.length) return res.status(400).json({ error: 'testDate and sets required' });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const exam = new Date(testDate);
    exam.setHours(0, 0, 0, 0);
    const daysUntil = Math.max(1, Math.ceil((exam - today) / 86400000));

    const setList = sets.map(s =>
      `- "${s.title}": ${s.cardCount} cards total, ${s.hardCount} rated Hard (needs more review)`
    ).join('\n');

    const testContext = testDescription ? `\nTest topic: ${testDescription}` : '';

    // Cap at 7 days to keep response short and avoid token cutoff
    const planDays = Math.min(daysUntil, 7);

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      messages: [{
        role: 'user',
        content: `You are a study coach. Create a ${planDays}-day study plan for a student.${testContext}

Study sets:
${setList}

Return ONLY a valid JSON array with exactly ${planDays} day objects. No markdown, no explanation, just the JSON array.

Format:
[{"day":1,"date":"Mon Apr 21","label":"Deep Review","tasks":[{"setTitle":"EXACT_SET_TITLE","mode":"flashcards","focus":"Review all cards","minutes":15},{"setTitle":"EXACT_SET_TITLE","mode":"quiz","focus":"Test yourself","minutes":10}],"totalMinutes":25,"tip":"short tip here"}]

Rules:
- Use ONLY these mode values: flashcards, quiz, test
- Use the EXACT set titles from the list above
- Keep each day under 40 minutes total
- Last day: light review only`,
      }],
    });

    const text = response.content[0].text;
    console.log('Plan AI response:', text.slice(0, 500));
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) return res.status(500).json({ error: 'Could not parse plan', raw: text.slice(0, 200) });

    let plan;
    try {
      plan = JSON.parse(match[0]);
    } catch (e) {
      return res.status(500).json({ error: 'Invalid JSON in plan response', raw: match[0].slice(0, 200) });
    }

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