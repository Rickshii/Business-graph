"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const aiService_1 = require("../services/aiService");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
router.post('/chat', authMiddleware_1.authMiddleware, async (req, res) => {
    const { prompt } = req.body;
    if (!prompt) {
        return res.status(400).json({ error: 'Prompt is required' });
    }
    try {
        const response = await aiService_1.aiService.queryKnowledgeGraph(prompt);
        res.json(response);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.default = router;
