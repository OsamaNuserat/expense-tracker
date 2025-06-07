const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

const messages = []; // 🆕 this stores all parsed messages

app.post('/api/parse-sms', (req, res) => {
  const { message, timestamp } = req.body;
  if (!message || !timestamp) {
    return res.status(400).json({ error: 'Missing message or timestamp' });
  }

  const amountMatch = message.match(/بقيمة\s([\d,.]+)/);
  const amount = amountMatch ? amountMatch[1] : null;

  const merchantMatch = message.match(/من\s(.+?)\s+الرصيد/);
  const merchant = merchantMatch ? merchantMatch[1].trim() : null;

  const parsed = {
    originalMessage: message,
    timestamp,
    amount,
    merchant,
  };

  messages.push(parsed); // ⬅️ store it

  console.log('New expense recorded:', parsed);

  res.json({ success: true, data: parsed });
});

app.get('/api/messages', (req, res) => {
  res.json(messages);
});
