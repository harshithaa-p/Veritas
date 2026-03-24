import { NextResponse } from 'next/server'

const SYSTEM_PROMPT = `You are Veritas, an advanced AI-powered fake news detection system designed to analyze news articles or claims with high accuracy, transparency, and contextual awareness.

You support multiple languages — analyze content in English, Tamil, Hindi, or any mix of these languages accurately.

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
- 80-100: Credible, well-sourced, factually accurate
- 50-79: Mixed, partially true, context missing
- 20-49: Likely misleading, distorted facts
- 0-19:  Clearly false or fabricated

Rules:
- Analyze in whatever language the input is in — Tamil, Hindi, English, or mixed
- logicalFallacies: only list fallacies actually present; if none, return ["None detected"]
- realNews: 2-4 items of what credible outlets actually say
- keyFindings: 3-5 concrete specific findings
- flaggedPhrases: 2-4 specific phrases from the actual input
- Be specific, transparent, and avoid overconfidence when uncertainty exists`

function extractJSON(text) {
  // Strip markdown fences
  let cleaned = text
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()

  // Try direct parse first
  try {
    return JSON.parse(cleaned)
  } catch {}

  // Find the outermost { } block
  const start = cleaned.indexOf('{')
  if (start === -1) throw new Error('No JSON object found in response')

  // Walk forward tracking depth to find the matching closing brace
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

  // Response was truncated — try to close all open structures
  let partial = end !== -1 ? cleaned.slice(start, end + 1) : cleaned.slice(start)

  // Count unclosed quotes, braces, brackets
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

  // Remove any trailing incomplete string or value
  partial = partial.replace(/,\s*$/, '')
  if (inString) partial += '"'
  partial += ']'.repeat(Math.max(0, openBrackets))
  partial += '}'.repeat(Math.max(0, openBraces))

  return JSON.parse(partial)
}

export async function POST(req) {
  try {
    const { claim } = await req.json()
    if (!claim || claim.trim().length < 5) {
      return NextResponse.json({ error: 'Please provide a claim to analyze.' }, { status: 400 })
    }

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
          { role: 'user', content: `Fact-check this claim thoroughly: ${claim.trim()}` }
        ],
        temperature: 0.3,
        max_tokens: 4000,  // increased — Tamil/Hindi need more tokens than English
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
