# SMS Parser Backend

This is a simple Node.js Express server that receives SMS message data sent from an iOS Shortcut automation, parses key details from the message (like amount and merchant), and returns the parsed information.

---

## Features

- Receives POST requests containing SMS message text and timestamp
- Parses the amount spent and merchant name from Arabic JIB bank messages
- Returns parsed data as JSON
- Easy to deploy on any Node.js compatible server

---

## Sample JIB Message Format

```
تفويض حركة على حسابكم 2407787 - 006 بقيمة 10.2 دينار اردني من GULF /ALHARAMAIN         AMMAN        JO الرصيد المتوفر 14.288 دينار اردني
```

---

## Installation

1. Clone the repository or copy the code.

2. Install dependencies:

```bash
npm install express
```

3. Run the server:

```bash
node server.js
```

The server will run on `http://localhost:3000` by default.

---

## API Endpoint

### POST `/api/parse-sms`

**Request Body:**

```json
{
  "message": "تفويض حركة على حسابكم بقيمة 10.2 دينار اردني من GULF /ALHARAMAIN         AMMAN        JO الرصيد المتوفر 14.288 دينار اردني",
  "timestamp": "2025-06-07T10:00:00Z"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "originalMessage": "...",
    "timestamp": "...",
    "amount": "10.2",
    "merchant": "GULF /ALHARAMAIN         AMMAN        JO"
  }
}
```

---

## Usage with iOS Shortcut

- Configure your Shortcut to POST the SMS message and timestamp as JSON to this server’s `/api/parse-sms` endpoint.
- The server will parse the SMS content and respond with extracted details.
- Use this data to track your expenses automatically.

---

## Deployment

You can deploy this server on any Node.js hosting platform, such as:

- Heroku
- Vercel (with some minor tweaks)
- DigitalOcean
- Your own VPS

---

## License

MIT License

---

If you want help customizing or deploying this app, just ask!
