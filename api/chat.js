/* api/chat.js */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { message } = req.body;
  const apiKey = process.env.GEMINI_API_KEY; 

  if (!apiKey) {
    return res.status(500).json({ error: 'API Key missing in Vercel' });
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: message }] }] }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || 'Gemini Error');

    return res.status(200).json({ reply: data.candidates[0].content.parts[0].text });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
