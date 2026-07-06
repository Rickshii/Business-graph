import { Router } from 'express';
import { aiService } from '../services/aiService';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

router.post('/chat', authMiddleware, async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  try {
    const response = await aiService.queryKnowledgeGraph(prompt);
    res.json(response);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
