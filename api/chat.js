/* api/chat.js */
export default async function handler(req, res) {
  // 1. Method Check
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // 2. API Key Check (இங்குதான் பிரச்சனை இருக்க வாய்ப்பு அதிகம்)
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("❌ CRITICAL: API Key is missing in Vercel Settings!");
    return res.status(500).json({ error: 'API Key is missing in Vercel Environment Variables' });
  }

  const { message } = req.body;

  try {
    // 3. Call Google
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: message }] }] }),
    });

    const data = await response.json();

    // 4. Handle Google Errors
    if (!response.ok) {
      console.error("❌ GOOGLE ERROR:", JSON.stringify(data)); // இது லாக்ஸ்ல தெரியும்
      throw new Error(data.error?.message || 'Unknown error from Gemini');
    }

    // 5. Success
    const botReply = data.candidates[0].content.parts[0].text;
    return res.status(200).json({ reply: botReply });

  } catch (error) {
    console.error("❌ SERVER CRASH:", error.message); // இதுவும் லாக்ஸ்ல தெரியும்
    return res.status(500).json({ error: error.message });
  }
}
