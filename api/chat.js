/* api/chat.js - Debug Mode */
export default async function handler(req, res) {
  // 1. Basic Setup
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // 2. Parse Input
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { message } = body;

    // 3. Check API Key
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("API Key is Missing in Vercel Settings (Check Environment Variables)");
    }

    // 4. Connect to Google (Gemini 1.5 Flash)
    // Note: We use 'v1beta' which is standard for AI Studio keys
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        contents: [{ parts: [{ text: message }] }] 
      }),
    });

    const data = await response.json();

    // 5. IF ERROR: Send the error details back to the chat directly!
    if (!response.ok) {
      const errorMsg = data.error?.message || response.statusText;
      return res.status(200).json({ 
        reply: `⚠️ **Google Refused:** ${errorMsg}\n(Code: ${data.error?.code || 'Unknown'})` 
      });
    }

    // 6. Success
    const botReply = data.candidates?.[0]?.content?.parts?.[0]?.text || "No reply generated.";
    return res.status(200).json({ reply: botReply });

  } catch (error) {
    // 7. CATCH ALL ERRORS
    // Instead of 500, we send 200 so you can read the error in the chat
    return res.status(200).json({ 
      reply: `🔥 **System Crash:** ${error.message}` 
    });
  }
}