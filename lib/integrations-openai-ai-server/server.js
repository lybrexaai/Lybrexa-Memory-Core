import express from 'express';
import { openai } from './src/index.js'; // Import your logic

const app = express();
app.use(express.json());

// Create a proxy endpoint
app.post('/v1/chat/completions', async (req, res) => {
  try {
    const response = await openai.chat.completions.create(req.body);
    res.json(response);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Proxy running on port ${port}`));
