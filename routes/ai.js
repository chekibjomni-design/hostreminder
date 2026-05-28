const express = require('express');
const router = express.Router();
const axios = require('axios');

router.post('/suggest', async (req, res) => {
// Existing suggestion endpoint
  try {
    const { guestMessage, guestName, context } = req.body;
    if (!guestMessage) return res.status(400).json({ error: 'guestMessage requis' });

    const prompt = `Tu es un assistant hôte Airbnb professionnel. Réponds au message du voyageur de manière courtoise et utile.

Voyageur: ${guestName || 'Un voyageur'}
Message: "${guestMessage}"
${context ? `Contexte: ${context}` : ''}

Génère 2 propositions de réponses courtes et efficaces (maximum 3 phrases chacune).`;

    let suggestions;
    if (process.env.GROQ_API_KEY) {
      const { data } = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
        model: 'llama-3.2-3b-preview',
        messages: [{ role: 'system', content: 'Tu es un assistant hôte Airbnb professionnel qui répond de manière concise et utile.' }, { role: 'user', content: prompt }],
        max_tokens: 300,
        temperature: 0.7
      }, {
        headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}`, 'Content-Type': 'application/json' }
      });
      suggestions = data.choices?.[0]?.message?.content || 'Aucune suggestion générée.';
    } else {
      suggestions = 'GROQ_API_KEY non configurée. Définissez-la dans .env pour activer les suggestions IA.';
    }

    res.json({ suggestions, model: 'llama-3.2-3b-preview (Groq)' });
  } catch (err) {
    req.logger.error(`AI suggest error: ${err.response?.data?.error?.message || err.message}`);
    res.status(500).json({ error: 'Erreur IA', details: err.response?.data?.error?.message || err.message });
  }
});

// Chat endpoint – conversation with AI support bot
router.post('/chat', async (req, res) => {
  try {
    const { messages, userMessage, context } = req.body;
    let chatMessages;
    if (Array.isArray(messages) && messages.length) {
      chatMessages = messages;
    } else if (userMessage) {
      chatMessages = [{ role: 'system', content: context || 'You are a helpful support assistant.' }, { role: 'user', content: userMessage }];
    } else {
      return res.status(400).json({ error: 'Missing messages or userMessage' });
    }

    if (!process.env.GROQ_API_KEY) {
      return res.status(500).json({ error: 'GROQ_API_KEY not configured' });
    }

    const { data } = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
      model: 'llama-3.2-3b-preview',
      messages: chatMessages,
      max_tokens: 500,
      temperature: 0.7
    }, {
      headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}`, 'Content-Type': 'application/json' }
    });

    const reply = data.choices?.[0]?.message?.content?.trim() || 'No reply generated.';
    res.json({ reply, model: 'llama-3.2-3b-preview (Groq)' });
  } catch (err) {
    req.logger.error(`AI chat error: ${err.response?.data?.error?.message || err.message}`);
    res.status(500).json({ error: 'Erreur IA', details: err.response?.data?.error?.message || err.message });
  }
});

module.exports = router;