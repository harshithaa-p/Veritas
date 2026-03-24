import { NextResponse } from 'next/server'

export async function POST(req) {
  try {
    const { claim, analysis, messages } = await req.json()

    if (!claim || !messages) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 })
    }

    const systemPrompt = `You are Veritas Assistant, an expert AI fact-checker helping a user understand a news analysis.

The user submitted this claim for fact-checking:
"${claim}"

Here is the full analysis that was already performed:
${JSON.stringify(analysis, null, 2)}

Your job is to answer the user's follow-up questions about this specific analysis in a clear, conversational, and helpful way.

Rules:
- Answer ONLY based on the analysis above and your knowledge about the topic
- Be specific — reference actual details from the analysis
- Keep answers concise but thorough (2-5 sentences usually)
- If asked to simplify, use plain everyday language
- If asked why something is fake/real/misleading, explain the specific reasons from the analysis
- If asked about a part of the claim, quote it and explain it
- Never make up new facts not supported by the analysis
- Be friendly and clear — the user may not be an expert`

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages
        ],
        temperature: 0.5,
        max_tokens: 500,
      }),
    })

    const data = await response.json()
    if (!response.ok) throw new Error(data.error?.message || 'Groq API error')

    const answer = data.choices[0].message.content.trim()
    return NextResponse.json({ answer })

  } catch (err) {
    console.error('Chat error:', err)
    return NextResponse.json(
      { error: err.message || 'Chat failed. Please try again.' },
      { status: 500 }
    )
  }
}
