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

module.exports = router;
