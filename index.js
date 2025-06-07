const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const messages = [];

// Util: Convert '7 Jun 2025 at 1:19 PM' => ISO string
function parseCustomTimestamp(input) {
  // Remove 'at' and fix to a valid format
  const cleaned = input.replace('at', '').trim(); // '7 Jun 2025 1:19 PM'
  const date = new Date(cleaned);
  return isNaN(date.getTime()) ? null : date.toISOString();
}

app.get('/', (req, res) => {
  res.send('✅ Expense Tracker API is running');
});

app.post('/api/parse-sms', (req, res) => {
  const { message, timestamp } = req.body;

  if (!message || !timestamp) {
    return res.status(400).json({ error: '❌ Missing message or timestamp' });
  }

  const amountMatch = message.match(/(?:بمبلغ|قيمة)\s+([\d.,]+)\s+دينار(?:\s+اردني)?/i);
  const amount = amountMatch ? parseFloat(amountMatch[1].replace(',', '')) : null;

  const merchantMatch = message.match(/الى\s+(.+?)\s+الرصيد/i);
  const merchant = merchantMatch ? merchantMatch[1].trim() : null;

  const isoTimestamp = parseCustomTimestamp(timestamp);

  if (!isoTimestamp) {
    return res.status(400).json({ error: '❌ Invalid timestamp format' });
  }

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

app.get('/api/messages', (req, res) => {
  res.json(messages);
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
