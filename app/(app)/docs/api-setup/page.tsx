import Link from "next/link";

export default function ApiSetupPage() {
  return (
    <div className="max-w-2xl space-y-8">
      <Link
        href="/settings/api-keys"
        className="text-blue-400 hover:text-blue-300 text-sm"
      >
        ← Back to API Keys
      </Link>

      <h1 className="text-2xl font-bold">How to Set Up the API</h1>

      <p className="text-slate-400">
        Think of the API like a delivery service. Your app (like OpenClaw) needs
        to ask MailClaw: &quot;Which mailbox should I use to send this
        email?&quot; and &quot;Did the email get delivered?&quot; The API is how
        they talk. But first, your app needs a <strong>key</strong> — like a
        house key — to prove it&apos;s allowed in.
      </p>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Step 1: Sign In</h2>
        <ol className="list-decimal list-inside text-slate-400 space-y-2">
          <li>Open MailClaw in your browser.</li>
          <li>Sign in with your account.</li>
          <li>Make sure you&apos;re on the main dashboard.</li>
        </ol>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Step 2: Create an API Key</h2>
        <ol className="list-decimal list-inside text-slate-400 space-y-2">
          <li>Go to <strong>Settings</strong> → <strong>API Keys</strong>.</li>
          <li>Type a name (e.g. &quot;My App&quot; or &quot;OpenClaw&quot;).</li>
          <li>Click <strong>Create Key</strong>.</li>
          <li>
            <strong>Important:</strong> Copy the key and save it somewhere safe.
            You only see it once. Treat it like a password.
          </li>
        </ol>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Step 3: Use the Key in Your App</h2>
        <p className="text-slate-400">
          Every request to the API must include your key in the header:
        </p>
        <pre className="p-4 rounded-lg bg-slate-800 border border-slate-700 text-sm overflow-x-auto">
          Authorization: Bearer YOUR_API_KEY_HERE
        </pre>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">What Can Your App Ask For?</h2>
        <div className="rounded-lg bg-slate-800/50 border border-slate-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left px-4 py-3 text-slate-400 font-medium">
                  What you want
                </th>
                <th className="text-left px-4 py-3 text-slate-400 font-medium">
                  Endpoint
                </th>
              </tr>
            </thead>
            <tbody className="text-slate-300">
              <tr className="border-b border-slate-700/50">
                <td className="px-4 py-3">Check if my key works</td>
                <td className="px-4 py-3">
                  <code>POST /api/agent/auth/validate</code>
                </td>
              </tr>
              <tr className="border-b border-slate-700/50">
                <td className="px-4 py-3">Get best mailbox to send from</td>
                <td className="px-4 py-3">
                  <code>GET /api/agent/best-sender</code>
                </td>
              </tr>
              <tr className="border-b border-slate-700/50">
                <td className="px-4 py-3">Check if a mailbox can send</td>
                <td className="px-4 py-3">
                  <code>POST /api/agent/send-permission</code>
                </td>
              </tr>
              <tr className="border-b border-slate-700/50">
                <td className="px-4 py-3">Log sent/delivered/bounce events</td>
                <td className="px-4 py-3">
                  <code>POST /api/agent/log-event</code>
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3">Get domain health info</td>
                <td className="px-4 py-3">
                  <code>GET /api/agent/domain-health</code>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Example: Get the Best Mailbox</h2>
        <p className="text-slate-400 text-sm">
          Request: <code>GET /api/agent/best-sender</code> with header{" "}
          <code>Authorization: Bearer YOUR_KEY</code>
        </p>
        <p className="text-slate-400 text-sm">
          Response:{" "}
          <code className="text-slate-300">
            {`{ "mailbox": { "id": "...", "email": "me@example.com", ... } }`}
          </code>
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Example: Log an Event</h2>
        <p className="text-slate-400 text-sm">
          Request: <code>POST /api/agent/log-event</code> with body:
        </p>
        <pre className="p-4 rounded-lg bg-slate-800 border border-slate-700 text-sm overflow-x-auto">
          {`{
  "event_type": "sent",
  "mailbox_id": "the-mailbox-uuid",
  "message_id": "optional-message-uuid"
}`}
        </pre>
        <p className="text-slate-400 text-sm">
          Event types: <code>sent</code>, <code>delivered</code>,{" "}
          <code>soft_bounce</code>, <code>hard_bounce</code>, <code>reply</code>
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Troubleshooting</h2>
        <div className="rounded-lg bg-slate-800/50 border border-slate-700 overflow-hidden">
          <table className="w-full text-sm">
            <tbody className="text-slate-300">
              <tr className="border-b border-slate-700/50">
                <td className="px-4 py-3 font-medium text-slate-200">
                  &quot;Invalid API key&quot;
                </td>
                <td className="px-4 py-3">
                  Copy the full key, no extra spaces. Create a new key if needed.
                </td>
              </tr>
              <tr className="border-b border-slate-700/50">
                <td className="px-4 py-3 font-medium text-slate-200">
                  &quot;Missing Authorization header&quot;
                </td>
                <td className="px-4 py-3">
                  Add <code>Authorization: Bearer YOUR_KEY</code> to every
                  request.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
