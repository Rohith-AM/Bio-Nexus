/* api/chat.js - Dr. Nexus Core powered by Groq (Llama 3.3 70B & 3.1 8B) */

const ACTIVE_GROQ_MODELS = [
  "llama-3.3-70b-versatile",
  "llama-3.1-8b-instant"
];

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { message, context, model: requestedModel } = body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey || apiKey === 'your-groq-api-key-here') {
      return res.status(200).json({
        reply: "⚠️ **Neural Link Standby:** `GROQ_API_KEY` is not configured in environment variables. Please add a valid Groq API key (from console.groq.com) to your settings."
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

    // Candidate models to attempt: requested model first, then active verified models
    const candidateModels = [];
    if (requestedModel && typeof requestedModel === 'string' && requestedModel.trim()) {
      candidateModels.push(requestedModel.trim());
    }
    ACTIVE_GROQ_MODELS.forEach(m => {
      if (!candidateModels.includes(m)) candidateModels.push(m);
    });

    let lastError = null;

    for (const modelToTry of candidateModels) {
      try {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: modelToTry,
            messages: [
              { role: "system", content: systemInstruction },
              { role: "user", content: message }
            ],
            temperature: 0.6,
            max_tokens: 1024
          })
        });

        const data = await response.json();

        if (response.ok && data.choices?.[0]?.message?.content) {
          return res.status(200).json({ reply: data.choices[0].message.content });
        }

        const errorMsg = data.error?.message || `HTTP ${response.status}`;
        lastError = errorMsg;

        if (response.status === 401) {
          return res.status(200).json({
            reply: `⚠️ **Neural Link Auth Error:** Your Groq API key is invalid or unauthorized. Please verify your API key at console.groq.com.`
          });
        }
      } catch (reqErr) {
        lastError = reqErr.message;
      }
    }

    return res.status(200).json({
      reply: `⚠️ **Neural Link Error:** ${lastError || "Could not complete inference with Groq models."}`
    });

  } catch (error) {
    return res.status(200).json({
      reply: `🔥 **System Exception:** ${error.message}`
    });
  }
}