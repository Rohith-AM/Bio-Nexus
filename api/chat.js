/* api/chat.js - Powered by Groq (Llama 3) */
export default async function handler(req, res) {
  // 1. Basic Setup
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { message } = body;

    // 2. Get the New Key
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new Error("GROQ_API_KEY is missing in Vercel Settings");
    }

    // 3. The Brain (Dr. Nexus Persona)
    const systemInstruction = `
    You are Dr. Nexus, the AI core of 'Project Bio-Nexus'.
    
    YOUR IDENTITY:
    - You are a specialized Biology Research Assistant.
    - User: Undergraduate Biology Student (Pro Data).
    - Tone: Scientific, Fast, Precise, and Encouraging.
    
    YOUR TOOLKIT:
    - Genomics: Suggest "IGV.js" for visualizing DNA/BAM files.
    - Structure: Suggest "Mol*" for 3D Protein visualization.
    - Learning: Offer "Flashcards" or "Quizzes" if the user asks to learn.
    
    GOAL:
    - Help the user analyze data, not just read it.
    - Be concise.
    `;

    // 4. Connect to Groq API (Standard OpenAI Format)
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile", // Super Smart & Super Fast
        messages: [
          { role: "system", content: systemInstruction },
          { role: "user", content: message }
        ],
        temperature: 0.7,
        max_tokens: 1024
      })
    });

    const data = await response.json();

    // 5. Handle Errors
    if (!response.ok) {
      const errorMsg = data.error?.message || "Unknown Groq Error";
      return res.status(200).json({ 
        reply: `⚠️ **Neural Link Error:** ${errorMsg}` 
      });
    }

    // 6. Success
    const botReply = data.choices?.[0]?.message?.content || "No reply.";
    return res.status(200).json({ reply: botReply });

  } catch (error) {
    return res.status(200).json({ 
      reply: `🔥 **System Crash:** ${error.message}` 
    });
  }
}