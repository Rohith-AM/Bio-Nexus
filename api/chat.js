/* api/chat.js - Using Official Google SDK */
import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
  // 1. Setup Headers (Allow CORS if needed, mostly for testing)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // 2. Parse Message
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { message } = body;

    // 3. Initialize Google AI
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("API Key is missing in Vercel!");
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    
    // 4. Select the Model (Flash is fast and free-tier friendly)
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // 5. Generate Content
    const result = await model.generateContent(message);
    const response = await result.response;
    const text = response.text();

    // 6. Send Reply
    return res.status(200).json({ reply: text });

  } catch (error) {
    console.error("SDK Error:", error);
    return res.status(500).json({ error: error.message || "AI processing failed" });
  }
}