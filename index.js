const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const messages = [];

// Health check
app.get('/', (req, res) => {
  res.send('✅ Expense Tracker API is running');
});

// Parse SMS
app.post('/api/parse-sms', (req, res) => {
  const { message, timestamp } = req.body;

  if (!message || !timestamp) {
    return res.status(400).json({ error: '❌ Missing message or timestamp' });
  }

  // Extract amount: e.g., "بمبلغ 1.0 دينار اردني"
  const amountMatch = message.match(/(?:بمبلغ|قيمة)\s+([\d.,]+)\s+دينار(?:\s+اردني)?/i);
  const amount = amountMatch ? parseFloat(amountMatch[1].replace(',', '')) : null;

  // Extract merchant: anything after "الى" up to "الرصيد"
  const merchantMatch = message.match(/الى\s+(.+?)\s+الرصيد/i);
  const merchant = merchantMatch ? merchantMatch[1].trim() : null;

  // Convert timestamp to ISO format (optional but safer for frontend)
  const isoTimestamp = new Date(timestamp).toISOString();

  const parsed = {
    originalMessage: message,
    timestamp: isoTimestamp,
    amount,
    merchant,
  };

  messages.push(parsed);

  console.log('✅ New expense recorded:', parsed);

  res.json({ success: true, data: parsed });
});

// Get all
app.get('/api/messages', (req, res) => {
  res.json(messages);
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
