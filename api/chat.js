/* api/chat.js */
export default async function handler(req, res) {
  // 1. Check if the request is POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // 2. Get the user's message from the frontend
  const { message } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  // 3. Prepare the payload for Gemini API
  const apiKey = process.env.GEMINI_API_KEY; // This takes the key from Vercel Vault
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  const payload = {
    contents: [{
      parts: [{ text: message }]
    }]
  };

  try {
    // 4. Send request to Google
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    // 5. Check for errors from Google
    if (!response.ok) {
      return res.status(500).json({ error: data.error?.message || 'Error fetching from Gemini' });
    }

    // 6. Send the answer back to your website
    const botReply = data.candidates[0].content.parts[0].text;
    return res.status(200).json({ reply: botReply });

  } catch (error) {
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
