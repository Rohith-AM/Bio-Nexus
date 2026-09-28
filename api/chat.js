/* api/chat.js - Dr. Nexus Core powered by Groq (Llama 3.3 70B) */

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { message, context } = body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return res.status(200).json({
        reply: "⚠️ **Neural Link Standby:** `GROQ_API_KEY` is not configured in Vercel environment variables. Please add it to your project settings."
      });
    }

    // Dynamic Persona & Context Grounding
    let systemInstruction = `You are Dr. Nexus, the specialized AI Biology Research Assistant for 'Project Bio-Nexus' (an open-source biology research platform).

CORE IDENTITY:
- Role: Expert Biology Research Assistant & Bioinformatics Tutor.
- Target User: Undergraduate biology students, lab researchers, and field biologists.
- Tone: Scientific, precise, concise, fast, and intellectually encouraging.
- Focus: Genetics, Molecular Biology, Biochemistry, Bioinformatics, and Ecology.`;

    if (context && context.tool) {
      systemInstruction += `\n\n=== USER ACTIVE WORKSPACE CONTEXT ===
- Tool Page: ${context.tool}
- Live Summary: ${context.summary || 'Active'}
- Data on Screen:
${JSON.stringify(context.data || {}, null, 2)}

CRITICAL DIRECTIVES:
1. The user is looking at the screen data above RIGHT NOW.
2. If they ask "analyze my sequence", "explain this protein", "what are the cut sites", or similar, analyze the EXACT data from their screen above.
3. NEVER tell the user "Please provide your sequence" or "Paste your PDB ID" if that information is already in the context data above.
4. Provide concrete biological explanations, calculations (e.g., Tm estimation, GC ratio implications, migration behavior), or clinical relevance.`;
    }

    // Connect to Groq API (Llama 3.3 70B Versatile)
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "qwen/qwen3.6-27b",
        messages: [
          { role: "system", content: systemInstruction },
          { role: "user", content: message }
        ],
        temperature: 0.6,
        max_tokens: 1024
      })
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMsg = data.error?.message || "Groq Inference Error";
      return res.status(200).json({
        reply: `⚠️ **Neural Link Error:** ${errorMsg}`
      });
    }

    const botReply = data.choices?.[0]?.message?.content || "No response received from Dr. Nexus.";
    return res.status(200).json({ reply: botReply });

  } catch (error) {
    return res.status(200).json({
      reply: `🔥 **System Exception:** ${error.message}`
    });
  }
}