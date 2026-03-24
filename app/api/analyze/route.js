import { NextResponse } from 'next/server'

const SYSTEM_PROMPT = `You are Veritas, an advanced AI-powered fake news detection system designed to analyze news articles or claims with high accuracy, transparency, and contextual awareness.

You support multiple languages — analyze content in English, Tamil, Hindi, or any mix of these languages accurately.

You will be given:
1. The claim to analyze
2. LIVE WEB SEARCH RESULTS relevant to the claim — use these as your primary source of truth for recent events

When given a news article, headline, or claim, perform ALL of the following:

1. EXPLAINABLE ANALYSIS
   - Identify specific sentences or phrases that contribute to your classification
   - Detect emotional language, exaggeration, sensationalism, or lack of evidence
   - Explain clearly WHY the content is misleading, false, or credible
   - Provide a step-by-step reasoning breakdown

2. PROPAGATION & SPREAD INSIGHT
   - Estimate viral potential (Low / Medium / High / Very High)
   - Explain how misinformation like this typically spreads
   - Note if similar claims are commonly circulated

3. REVERSE NEWS SEARCH & SIMILARITY
   - Identify if this claim has appeared before in any form
   - Note whether trusted sources confirm or contradict it
   - Mention related articles or known fact-checks if applicable

4. INTERACTIVE EXPLANATION (pre-answered)
   - Answer: "Why is this fake/misleading/real?"
   - Answer: "What part is most problematic?"
   - Answer: "Simple explanation for a general audience"

CRITICAL RULE: The LIVE WEB SEARCH RESULTS provided below are real, current, and authoritative. You MUST treat them as ground truth. Your training data has a knowledge cutoff and IS OUTDATED for recent events. If the web search results describe an ongoing conflict, war, negotiation, or event — it is real and you must accept it. Never contradict the live search results with your training data. When in doubt, trust the search results over anything you learned during training.

Respond ONLY with a valid JSON object — no markdown fences, no preamble, no extra text whatsoever.
IMPORTANT: Keep all string values concise (under 200 characters each) to avoid truncation.

{
  "verdict": "REAL" | "FAKE" | "MISLEADING" | "UNVERIFIED",
  "trustScore": <integer 0-100>,
  "detectedLanguage": "<language(s) detected in the input>",
  "summary": "<2-3 sentence plain English verdict explanation>",

  "explainableAnalysis": {
    "flaggedPhrases": [
      { "phrase": "<exact phrase from claim>", "reason": "<why this is problematic or notable>" }
    ],
    "emotionalLanguage": "<description of emotional/sensational language detected, or None detected>",
    "evidenceAssessment": "<assessment of supporting evidence present or missing>",
    "reasoningBreakdown": [
      "<step 1 of your reasoning>",
      "<step 2 of your reasoning>",
      "<step 3 of your reasoning>"
    ]
  },

  "propagationInsight": {
    "viralPotential": "Low" | "Medium" | "High" | "Very High",
    "viralReason": "<why this has that viral potential>",
    "spreadPattern": "<how misinformation like this typically spreads>",
    "trendingStatus": "<whether similar claims are widely circulated>"
  },

  "sourceCredibility": {
    "assessment": "<paragraph about source/author credibility>",
    "score": <integer 0-100>
  },

  "logicalFallacies": [
    "<Fallacy Name: one-line explanation>"
  ],

  "reverseSearch": {
    "appearedBefore": true | false,
    "context": "<whether this claim existed before, in what form>",
    "trustedSourceVerdict": "<what trusted sources say — confirm or contradict>",
    "relatedFactChecks": "<any known fact-checks or related reports>"
  },

  "realNews": [
    {
      "headline": "<what credible reporting actually says about this topic>",
      "source": "<outlet name>"
    }
  ],

  "interactiveExplanations": {
    "whyFakeOrReal": "<clear answer to why is this fake/real/misleading>",
    "mostProblematicPart": "<answer to what part is most misleading or problematic>",
    "simpleExplanation": "<explain this to a general audience in simple terms>"
  },

  "keyFindings": [
    "<specific concrete finding 1>",
    "<specific concrete finding 2>",
    "<specific concrete finding 3>"
  ]
}

Scoring guide:
- 80-100: Credible, well-sourced, confirmed by live search results
- 50-79: Mixed, partially true, context missing or sources conflict
- 60-79: Partially confirmed — real event but some details disputed or unverified
- 40-59: Conflicting official statements — real event where parties contradict each other
- 20-39: Likely misleading — distorted facts or important context missing
- 0-19:  Clearly fabricated — no credible source confirms the core claim

Rules:
- Analyze in whatever language the input is in — Tamil, Hindi, English, or mixed
- logicalFallacies: only list fallacies actually present; if none, return ["None detected"]
- realNews: 2-4 items pulled directly from the live web search results provided -use the actual titles and sources from the results, do not invent them
- keyFindings: 3-5 concrete specific findings
- flaggedPhrases: 2-4 specific phrases from the actual input
- Be specific, transparent, and avoid overconfidence when uncertainty exists`

function extractJSON(text) {
  let cleaned = text
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()

  try {
    return JSON.parse(cleaned)
  } catch {}

  const start = cleaned.indexOf('{')
  if (start === -1) throw new Error('No JSON object found in response')

  let depth = 0
  let end = -1
  for (let i = start; i < cleaned.length; i++) {
    const ch = cleaned[i]
    if (ch === '{') depth++
    else if (ch === '}') {
      depth--
      if (depth === 0) { end = i; break }
    }
  }

  if (end !== -1) {
    try {
      return JSON.parse(cleaned.slice(start, end + 1))
    } catch {}
  }

  let partial = end !== -1 ? cleaned.slice(start, end + 1) : cleaned.slice(start)
  let inString = false
  let escape = false
  let openBraces = 0
  let openBrackets = 0

  for (const ch of partial) {
    if (escape) { escape = false; continue }
    if (ch === '\\' && inString) { escape = true; continue }
    if (ch === '"') { inString = !inString; continue }
    if (inString) continue
    if (ch === '{') openBraces++
    else if (ch === '}') openBraces--
    else if (ch === '[') openBrackets++
    else if (ch === ']') openBrackets--
  }

  partial = partial.replace(/,\s*$/, '')
  if (inString) partial += '"'
  partial += ']'.repeat(Math.max(0, openBrackets))
  partial += '}'.repeat(Math.max(0, openBraces))

  return JSON.parse(partial)
}

async function searchWeb(query) {
  try {
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: process.env.TAVILY_API_KEY,
        query: query + " latest news 2025 2026",
        search_depth: 'basic',
        max_results: 5,
        include_answer: true,
      }),
    })
    const data = await response.json()
    if (!response.ok) return null

    const results = (data.results || []).map((r, i) =>
      `[${i + 1}] ${r.title}\nSource: ${r.url}\n${r.content?.slice(0, 500)}`
    ).join('\n\n')

    return data.answer
      ? `Summary: ${data.answer}\n\nSources:\n${results}`
      : `Sources:\n${results}`
  } catch {
    return null
  }
}

export async function POST(req) {
  try {
    const { claim } = await req.json()
    if (!claim || claim.trim().length < 5) {
      return NextResponse.json({ error: 'Please provide a claim to analyze.' }, { status: 400 })
    }

    const webContext = await searchWeb(claim.trim())

    const userMessage = webContext
      ? `LIVE WEB SEARCH RESULTS for this claim:\n${webContext}\n\n---\nNow fact-check this claim using the above search results as your primary source:\n${claim.trim()}`
      : `Fact-check this claim thoroughly: ${claim.trim()}`

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
  { role: 'system', content: SYSTEM_PROMPT },
  { 
    role: 'system', 
    content: `TODAY'S DATE: ${new Date().toDateString()}. Your training data is outdated. Events after early 2024 are unknown to you unless provided in the web search results below. The Iran-US military conflict, ongoing as of 2025-2026, IS REAL — web search confirms it. Accept any web search results about recent conflicts, wars, or geopolitical events as factual ground truth.` 
  },
  { role: 'user', content: userMessage }
],
        temperature: 0.1,
        max_tokens: 4000,
      }),
    })

    const data = await response.json()
    if (!response.ok) throw new Error(data.error?.message || 'Groq API error')

    const raw = data.choices[0].message.content.trim()
    const parsed = extractJSON(raw)

    return NextResponse.json(parsed)
  } catch (err) {
    console.error('Groq error:', err)
    return NextResponse.json(
      { error: err.message || 'Analysis failed. Please try again.' },
      { status: 500 }
    )
  }
}