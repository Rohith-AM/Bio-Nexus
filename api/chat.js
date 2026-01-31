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
      throw new Error("API Key is Missing in Vercel Settings");
    }

    // 🏆 BACK TO THE CHAMPION: gemini-1.5-flash (This works on Free Tier!)
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        contents: [{ parts: [{ text: message }] }] 
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      // 429 = Quota Limit, 404 = Wrong Model Name
      const errorMsg = data.error?.message || response.statusText;
      return res.status(200).json({ 
        reply: `⚠️ **Google Error:** ${errorMsg}` 
      });
    }

    const botReply = data.candidates?.[0]?.content?.parts?.[0]?.text || "No reply generated.";
    return res.status(200).json({ reply: botReply });

  } catch (error) {
    return res.status(200).json({ 
      reply: `🔥 **System Crash:** ${error.message}` 
    });
  }
}