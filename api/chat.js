/* api/chat.js */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { message } = body;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'API Key Missing' });
    }

    // UPDATED MODEL to 'gemini-pro' (The Stable One)
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: message }] }] }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || 'Gemini Error');
    }

    const botReply = data.candidates?.[0]?.content?.parts?.[0]?.text || "No reply.";
    return res.status(200).json({ reply: botReply });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}/* js/nexus-widget.js */