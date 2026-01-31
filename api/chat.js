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

    // ✅ CORRECT MODEL: gemini-1.5-flash (Works best with AI Studio Keys)
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: message }] }] }),
    });

    const data = await response.json();

    if (!response.ok) {
      // எரர் வந்தால் அதை தெளிவாக காட்டச் சொல்வோம்
      console.error("Gemini Error Detail:", JSON.stringify(data)); 
      throw new Error(data.error?.message || 'Unknown Gemini Error');
    }

    const botReply = data.candidates?.[0]?.content?.parts?.[0]?.text || "No reply generated.";
    return res.status(200).json({ reply: botReply });

  } catch (error) {
    console.error("Server Crash:", error);
    return res.status(500).json({ error: error.message });
  }
}