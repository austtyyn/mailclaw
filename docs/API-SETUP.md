# How to Set Up the API (Simple Guide)

Think of the API like a delivery service. Your app (like OpenClaw) needs to ask MailClaw: *"Which mailbox should I use to send this email?"* and *"Did the email get delivered?"* The API is how they talk. But first, your app needs a **key** — like a house key — to prove it’s allowed in.

---

## Step 1: Sign In

1. Open MailClaw in your browser (for example: `http://localhost:3000`).
2. Sign in with your account.
3. Make sure you’re on the main dashboard.

---

## Step 2: Create an API Key

1. In the menu or sidebar, click **Settings**.
2. Click **API Keys**.
3. You’ll see a box where you can type a name. Type something like **"My App"** or **"OpenClaw"**.
4. Click **Create Key**.
5. **Important:** A long secret key will appear. **Copy it and save it somewhere safe right away.**  
   - You will only see it once. If you lose it, you’ll need to create a new key.
   - Treat it like a password — don’t share it.

---

## Step 3: Use the Key in Your App

Every time your app talks to the MailClaw API, it has to show this key.

**How:** Add it to the **header** of each request.

In most programming languages, it looks like this:

```
Authorization: Bearer YOUR_API_KEY_HERE
```

Replace `YOUR_API_KEY_HERE` with the key you copied in Step 2.

---

## What Can Your App Ask For?

| What you want to do | How to ask | Method |
|---------------------|------------|--------|
| Check if my key works | `POST /api/agent/auth/validate` | Just send the key in the header |
| Get the best mailbox to send from | `GET /api/agent/best-sender` | Send the key in the header |
| Check if a mailbox is allowed to send | `POST /api/agent/send-permission` with `{ "mailbox_id": "..." }` | Send the key + mailbox id |
| Tell MailClaw an email was sent/delivered/bounced | `POST /api/agent/log-event` with `{ "event_type": "...", "mailbox_id": "...", ... }` | Send the key + event info |
| Get domain health info | `GET /api/agent/domain-health` | Send the key in the header |

---

## Example: Check if Your Key Works

**Request:**
- URL: `https://your-mailclaw-site.com/api/agent/auth/validate`
- Method: `POST`
- Header: `Authorization: Bearer YOUR_API_KEY_HERE`
- Body: (nothing needed)

**Good response:**  
`{ "valid": true, "workspace_id": "..." }`

**Bad response (wrong key):**  
`{ "error": "Invalid API key" }`

---

## Example: Get the Best Mailbox to Send From

**Request:**
- URL: `https://your-mailclaw-site.com/api/agent/best-sender`
- Method: `GET`
- Header: `Authorization: Bearer YOUR_API_KEY_HERE`

**Response:**  
`{ "mailbox": { "id": "...", "email": "me@example.com", ... } }`  
or  
`{ "mailbox": null, "reason": "No eligible sender" }` if nothing is ready.

---

## Example: Log That an Email Was Sent

**Request:**
- URL: `https://your-mailclaw-site.com/api/agent/log-event`
- Method: `POST`
- Header: `Authorization: Bearer YOUR_API_KEY_HERE`
- Body (JSON):
  ```json
  {
    "event_type": "sent",
    "mailbox_id": "the-mailbox-uuid",
    "message_id": "optional-message-uuid"
  }
  ```

**Event types you can use:**
- `sent` — email was sent
- `delivered` — email was delivered
- `soft_bounce` — temporary bounce
- `hard_bounce` — permanent bounce
- `reply` — someone replied

---

## Troubleshooting

| Problem | What to try |
|---------|-------------|
| "Invalid API key" | Make sure you copied the full key and there are no extra spaces. Create a new key if needed. |
| "Missing or invalid Authorization header" | Add `Authorization: Bearer YOUR_KEY` to every request. |
| "Mailbox not found" | The `mailbox_id` must belong to your workspace. Get it from `/api/agent/best-sender` first. |

---

## Quick Reference

- **Base URL:** Your MailClaw site (e.g. `http://localhost:3000` or `https://your-app.vercel.app`)
- **Header:** `Authorization: Bearer YOUR_API_KEY`
- **Content type (for POST):** `Content-Type: application/json`
