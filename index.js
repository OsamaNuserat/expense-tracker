const express = require('express');
const cors = require('cors'); // ⬅️ import this

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors()); // ⬅️ enable CORS
app.use(express.json());

const messages = [];

// Health check route for Render
app.get('/', (req, res) => {
  res.send('✅ Expense Tracker API is running');
});

// Receive and parse SMS message
app.post('/api/parse-sms', (req, res) => {
  const { message, timestamp } = req.body;

  if (!message || !timestamp) {
    return res.status(400).json({ error: '❌ Missing message or timestamp' });
  }

  const amountMatch = message.match(/(?:بمبلغ|قيمة)\s+([\d.,]+)\s+(?:دينار(?:\s+اردني)?)/i);
const amount = amountMatch ? parseFloat(amountMatch[1].replace(',', '')) : null;

  const merchantMatch = message.match(/من\s(.+?)\s+الرصيد/);
  const merchant = merchantMatch ? merchantMatch[1].trim() : null;

  const isoTimestamp = new Date(timestamp).toISOString();

  const parsed = {
    originalMessage: message,
    timestamp : isoTimestamp,
    amount,
    merchant,
  };

  messages.push(parsed);

  console.log('✅ New expense recorded:', parsed);

  res.json({ success: true, data: parsed });
});

// Get all stored messages
app.get('/api/messages', (req, res) => {
  res.json(messages);
});

// Start the server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
