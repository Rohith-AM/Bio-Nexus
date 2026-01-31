/* api/chat.js */
export default async function handler(req, res) {
  console.log("📨 Request Received:", req.method); // லாக் 1

  // 1. Method Check
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // 2. Body Parsing (பாதுகாப்பாக பிரித்தல்)
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { message } = body;

    console.log("💬 User Message:", message); // லாக் 2

    // 3. API Key Check
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("❌ CRITICAL: API Key Missing!"); 
      return res.status(500).json({ error: 'API Key is missing in Vercel' });
    }

    // 4. Call Google Gemini
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: message || "Hello" }] }] }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("❌ GOOGLE ERROR:", JSON.stringify(data));
      throw new Error(data.error?.message || 'Gemini Refused');
    }

    const botReply = data.candidates?.[0]?.content?.parts?.[0]?.text || "No reply found.";
    return res.status(200).json({ reply: botReply });

  } catch (error) {
    console.error("🔥 CRASH REPORT:", error.message); // முழு எரர் இங்கே வரும்
    return res.status(500).json({ error: "Server Error: " + error.message });
  }
}