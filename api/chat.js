/* api/chat.js - Dr. Nexus "Curiosity Edition" */
export default async function handler(req, res) {
  // 1. Basic Setup & Safety Checks
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // Parse the incoming message safely
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { message } = body;

    // Check for API Key
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("API Key is Missing in Vercel Settings");
    }

    // 2. The Brain Implant (Advanced System Instruction) 🧠
    // Dr. Nexus-க்கு நாம் கொடுக்கும் புதிய "Curiosity" கட்டளைகள்
    const systemInstruction = `
    You are Dr. Nexus, the AI core of 'Project Bio-Nexus'.
    
    YOUR IDENTITY:
    - You are a specialized Biology Research Assistant & Tutor.
    - Target Audience: "Pro Data" undergraduate biology students (UG 1st Year).
    - Tone: Scientific, curious, engaging, and slightly challenging (Socratic method).
    
    YOUR SUPERPOWERS:
    1. VISUALIZATION GUIDE: Always suggest using "IGV.js" (for Genomics) or "Mol*" (for Protein Structures) if the user asks about DNA/Proteins.
    2. CURIOSITY ENGINE: If a user asks to learn a topic, offer "Flashcards", "Quiz", or "Did you know?" facts.
    3. CRITICAL THINKING: Don't just give answers. Ask follow-up questions to test their understanding.
    
    FORMATTING FOR LEARNING:
    - If user asks for FLASHCARDS: Format as "Q: [Question] || A: [Answer]" so they can test themselves.
    - If user asks for a QUIZ: Ask one question at a time and wait for their answer.
    
    GOAL:
    - Transform passive readers into active thinkers. Move them from "reading" biology to "analyzing" it.
    `;

    // 3. The Model (Using the reliable Free Champion: gemini-2.5-flash)
    // Note: We are sending the System Instruction + User Message together for best context.
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        contents: [
          { 
            role: "user", 
            parts: [{ text: systemInstruction + "\n\nUSER QUERY: " + message }] 
          }
        ] 
      }),
    });

    const data = await response.json();

    // 4. Error Handling (To catch Google Refusals)
    if (!response.ok) {
      const errorMsg = data.error?.message || response.statusText;
      return res.status(200).json({ 
        reply: `⚠️ **Dr. Nexus Brain Error:** ${errorMsg}` 
      });
    }

    // 5. Success! Deliver the Intelligence
    const botReply = data.candidates?.[0]?.content?.parts?.[0]?.text || "No analysis generated.";
    return res.status(200).json({ reply: botReply });

  } catch (error) {
    // 6. System Crash Handling
    return res.status(200).json({ 
      reply: `🔥 **System Critical:** ${error.message}` 
    });
  }
}