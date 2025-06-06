const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.post('/api/parse-sms', (req, res) => {
  const { message, timestamp } = req.body;
  if (!message || !timestamp) {
    return res.status(400).json({ error: 'Missing message or timestamp' });
  }

  
  const amountMatch = message.match(/بقيمة\s([\d,.]+)/);
  const amount = amountMatch ? amountMatch[1] : null;

  const merchantMatch = message.match(/من\s(.+?)\s+الرصيد/);
  const merchant = merchantMatch ? merchantMatch[1].trim() : null;

  console.log('Received message:', message);
  console.log('Timestamp:', timestamp);
  console.log('Amount:', amount);
  console.log('Merchant:', merchant);

  res.json({
    success: true,
    data: {
      originalMessage: message,
      timestamp,
      amount,
      merchant,
    },
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
