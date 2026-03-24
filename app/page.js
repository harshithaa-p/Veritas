'use client'
import { useState, useRef } from 'react'

const VERDICTS = {
  REAL:       { color: '#52b87a', bg: 'rgba(82,184,122,0.08)',  border: 'rgba(82,184,122,0.22)',  emoji: '✓' },
  FAKE:       { color: '#e05566', bg: 'rgba(224,85,102,0.08)', border: 'rgba(224,85,102,0.22)', emoji: '✕' },
  MISLEADING: { color: '#e2b96a', bg: 'rgba(226,185,106,0.08)',border: 'rgba(226,185,106,0.22)',emoji: '!' },
  UNVERIFIED: { color: '#5fa8e0', bg: 'rgba(95,168,224,0.08)', border: 'rgba(95,168,224,0.22)', emoji: '?' },
}

const VIRAL_COLORS = {
  'Low': '#52b87a', 'Medium': '#e2b96a', 'High': '#e08855', 'Very High': '#e05566',
}

const LOADING_STEPS = [
  { icon: '🌐', text: 'Detecting language & parsing claim…' },
  { icon: '🔍', text: 'Cross-referencing with known facts…' },
  { icon: '🧠', text: 'Analyzing logic, fallacies & language…' },
  { icon: '📡', text: 'Checking propagation patterns…' },
  { icon: '⚖️',  text: 'Calculating trust score & verdict…' },
]

const TABS = [
  { id: 'overview',    label: 'Overview',      icon: '⚖️'  },
  { id: 'analysis',    label: 'Deep Analysis', icon: '🔬'  },
  { id: 'propagation', label: 'Spread',         icon: '📢'  },
  { id: 'sources',     label: 'Sources',        icon: '📰'  },
  { id: 'assistant',   label: 'AI Assistant',   icon: '💬'  },
]

const QUICK_QUESTIONS = [
  'Why is this fake?',
  'What part is misleading?',
  'Simplify this for me',
  'How confident are you?',
]

export default function Home() {
  const [claim, setClaim]             = useState('')
  const [loading, setLoading]         = useState(false)
  const [step, setStep]               = useState(0)
  const [result, setResult]           = useState(null)
  const [error, setError]             = useState('')
  const [activeTab, setActiveTab]     = useState('overview')
  const [chatInput, setChatInput]     = useState('')
  const [chatLog, setChatLog]         = useState([])
  const [chatLoading, setChatLoading] = useState(false)
  const resultsRef                    = useRef(null)
  const chatEndRef                    = useRef(null)

  async function analyze() {
    if (!claim.trim() || loading) return
    setLoading(true)
    setResult(null)
    setError('')
    setStep(0)
    setChatLog([])
    setActiveTab('overview')

    const timers = LOADING_STEPS.map((_, i) =>
      setTimeout(() => setStep(i + 1), i * 1200)
    )
    try {
      const res  = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claim }),
      })
      const data = await res.json()
      timers.forEach(clearTimeout)
      if (!res.ok) throw new Error(data.error || 'Analysis failed')
      setResult(data)
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
    } catch (e) {
      timers.forEach(clearTimeout)
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function askQuestion(q) {
    if (!q.trim() || chatLoading) return
    const question = q.trim()
    setChatInput('')
    const newUserMsg = { role: 'user', text: question }
    const updatedLog = [...chatLog, newUserMsg]
    setChatLog(updatedLog)
    setChatLoading(true)
    try {
      const messages = updatedLog.map(m => ({
        role: m.role === 'ai' ? 'assistant' : 'user',
        content: m.text,
      }))
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claim, analysis: result, messages }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Chat failed')
      setChatLog(prev => [...prev, { role: 'ai', text: data.answer }])
    } catch (e) {
      setChatLog(prev => [...prev, { role: 'ai', text: 'Something went wrong: ' + e.message }])
    } finally {
      setChatLoading(false)
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    }
  }

  function reset() {
    setResult(null)
    setError('')
    setClaim('')
    setStep(0)
    setChatLog([])
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const v = result ? (VERDICTS[result.verdict] || VERDICTS.UNVERIFIED) : null

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 24px' }}>

      {/* Header */}
      <header style={{
        padding: '44px 0 28px', borderBottom: '1px solid var(--border)', marginBottom: 44,
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16,
      }}>
        <div>
          <div className="font-mono" style={{ fontSize: 11, letterSpacing: '0.2em', color: 'var(--accent)', textTransform: 'uppercase', marginBottom: 6 }}>
            Advanced AI Truth Engine
          </div>
          <div className="font-display" style={{ fontSize: 52, fontWeight: 900, lineHeight: 1, letterSpacing: -1 }}>
            Veri<span style={{ color: 'var(--accent)' }}>tas</span>
          </div>
          <div style={{ fontSize: 14, color: 'var(--muted)', marginTop: 8 }}>
            Paste any news claim. Get a full AI-powered truth analysis — in any language.
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
          <Pill color="var(--green)">● Live Analysis</Pill>
          <Pill color="var(--blue)">🌐 EN · தமிழ் · हिंदी</Pill>
        </div>
      </header>

      {/* Input */}
      {!result && (
        <div style={{ marginBottom: 40 }}>
          <Label>Article, Headline or Claim to Verify</Label>
          <div style={{
            border: `1px solid ${claim ? 'var(--accent)' : 'var(--border)'}`,
            borderRadius: 12, background: 'var(--surface)', transition: 'border-color 0.2s',
            boxShadow: claim ? '0 0 0 3px rgba(226,185,106,0.07)' : 'none',
          }}>
            <textarea
              value={claim}
              onChange={e => setClaim(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && e.ctrlKey && analyze()}
              placeholder={`Paste a headline, article, or any claim in English, Tamil, or Hindi…\n\ne.g. "5G towers cause COVID-19" or "கோவிட் தடுப்பூசி தீங்கானது"`}
              style={{
                width: '100%', minHeight: 160, background: 'transparent', border: 'none', outline: 'none',
                color: 'var(--text)', fontFamily: 'DM Sans, sans-serif',
                fontSize: 15, lineHeight: 1.75, padding: '20px 20px 60px', resize: 'vertical',
              }}
            />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
              <span className="font-mono" style={{ fontSize: 12, color: 'var(--muted)' }}>
                {claim.length} chars · Ctrl+Enter to analyze
              </span>
              <button onClick={analyze} disabled={!claim.trim() || loading} style={btnStyle(!claim.trim() || loading)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                </svg>
                Analyze Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{ background: 'rgba(224,85,102,0.08)', border: '1px solid rgba(224,85,102,0.25)', borderRadius: 10, padding: '14px 20px', fontSize: 14, color: 'var(--red)', marginBottom: 20 }}>
          ⚠ {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '64px 0' }}>
          <div className="spinner" style={{ margin: '0 auto 24px' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 340, margin: '0 auto' }}>
            {LOADING_STEPS.map((s, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 10, fontSize: 13,
                opacity: step > i ? 1 : 0.22,
                color: step > i ? 'var(--text)' : 'var(--muted)',
                transform: step > i ? 'none' : 'translateY(6px)',
                transition: 'all 0.4s ease',
              }}>
                <span style={{ fontSize: 16 }}>{s.icon}</span>{s.text}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Results */}
      {result && v && (
        <div ref={resultsRef} className="animate-fade-up">

          {/* Verdict Banner — always visible above tabs */}
          <div style={{
            background: v.bg, border: `1px solid ${v.border}`,
            borderRadius: 16, padding: '24px 28px', marginBottom: 20,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap',
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <Label>Verdict</Label>
                {result.detectedLanguage && (
                  <span className="font-mono" style={{ fontSize: 11, color: 'var(--blue)', background: 'rgba(95,168,224,0.1)', border: '1px solid rgba(95,168,224,0.2)', borderRadius: 20, padding: '2px 10px' }}>
                    🌐 {result.detectedLanguage}
                  </span>
                )}
              </div>
              <div className="font-display" style={{ fontSize: 30, fontWeight: 700, color: v.color, display: 'flex', alignItems: 'center', gap: 10 }}>
                <span>{v.emoji}</span> {result.verdict}
              </div>
              <div style={{ fontSize: 14, color: 'var(--muted)', marginTop: 6, maxWidth: 500, lineHeight: 1.65 }}>
                {result.summary}
              </div>
            </div>
            <div style={{ textAlign: 'center', minWidth: 110 }}>
              <div className="font-display" style={{ fontSize: 52, fontWeight: 900, lineHeight: 1, color: v.color }}>
                {result.trustScore}
              </div>
              <div className="font-mono" style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--muted)', marginTop: 4 }}>Trust Score</div>
              <div style={{ width: 90, height: 4, background: 'var(--border)', borderRadius: 2, margin: '8px auto 0', overflow: 'hidden' }}>
                <div style={{ height: '100%', borderRadius: 2, background: v.color, width: result.trustScore + '%', transition: 'width 1s ease' }} />
              </div>
            </div>
          </div>

          {/* Tab Bar */}
          <div style={{
            display: 'flex', gap: 4, marginBottom: 24,
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 12, padding: 5, flexWrap: 'wrap',
          }}>
            {TABS.map(tab => {
              const isActive = activeTab === tab.id
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
                  flex: 1, minWidth: 100,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  padding: '9px 14px', borderRadius: 8, border: 'none',
                  background: isActive ? 'var(--surface2)' : 'transparent',
                  color: isActive ? 'var(--accent)' : 'var(--muted)',
                  fontFamily: 'DM Sans, sans-serif', fontSize: 13,
                  fontWeight: isActive ? 600 : 400,
                  cursor: 'pointer', transition: 'all 0.18s',
                  borderBottom: isActive ? '2px solid var(--accent)' : '2px solid transparent',
                }}>
                  <span style={{ fontSize: 14 }}>{tab.icon}</span>
                  {tab.label}
                </button>
              )
            })}
          </div>

          {/* Tab Panels */}
          <div style={{ minHeight: 400 }}>

            {/* OVERVIEW */}
            {activeTab === 'overview' && (
              <div className="animate-fade-up">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                  <Card icon="📡" iconBg="rgba(95,168,224,0.1)" title="Source & Author Credibility">
                    <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--text)', marginBottom: 12 }}>
                      {result.sourceCredibility?.assessment}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 12, color: 'var(--muted)' }}>Credibility</span>
                      <div style={{ flex: 1, height: 5, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ height: '100%', borderRadius: 3, background: 'var(--accent)', width: (result.sourceCredibility?.score || 0) + '%', transition: 'width 1s ease' }} />
                      </div>
                      <span className="font-mono" style={{ fontSize: 12, color: 'var(--accent)', minWidth: 36 }}>
                        {result.sourceCredibility?.score}%
                      </span>
                    </div>
                  </Card>
                  <Card icon="⚠️" iconBg="rgba(224,85,102,0.1)" title="Logical Fallacies">
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {(result.logicalFallacies || ['None detected']).map((f, i) => {
                        const isNone = f.toLowerCase().includes('none')
                        return (
                          <span key={i} style={{
                            background: isNone ? 'rgba(82,184,122,0.1)' : 'rgba(224,85,102,0.1)',
                            border: `1px solid ${isNone ? 'rgba(82,184,122,0.22)' : 'rgba(224,85,102,0.22)'}`,
                            color: isNone ? 'var(--green)' : 'var(--red)',
                            fontFamily: 'DM Mono, monospace', fontSize: 12,
                            padding: '4px 10px', borderRadius: 6,
                          }}>{f}</span>
                        )
                      })}
                    </div>
                  </Card>
                </div>
                <Card icon="📋" iconBg="rgba(226,185,106,0.1)" title="Key Findings">
                  {(result.keyFindings || []).map((f, i) => (
                    <div key={i} style={{
                      display: 'flex', gap: 12, padding: '10px 0',
                      borderBottom: i < result.keyFindings.length - 1 ? '1px solid var(--border)' : 'none',
                      fontSize: 14, lineHeight: 1.65,
                    }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', marginTop: 8, flexShrink: 0 }} />
                      <div>{f}</div>
                    </div>
                  ))}
                </Card>
              </div>
            )}

            {/* DEEP ANALYSIS */}
            {activeTab === 'analysis' && result.explainableAnalysis && (
              <div className="animate-fade-up">
                <Card icon="🔬" iconBg="rgba(226,185,106,0.1)" title="Flagged Phrases & Language" style={{ marginBottom: 16 }}>
                  {result.explainableAnalysis.flaggedPhrases?.length > 0 && (
                    <div style={{ marginBottom: 18 }}>
                      <div className="font-mono" style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 10 }}>FLAGGED PHRASES</div>
                      {result.explainableAnalysis.flaggedPhrases.map((fp, i) => (
                        <div key={i} style={{ background: 'rgba(224,85,102,0.06)', border: '1px solid rgba(224,85,102,0.15)', borderRadius: 8, padding: '10px 14px', marginBottom: 8 }}>
                          <div style={{ fontSize: 13, color: 'var(--red)', fontStyle: 'italic', marginBottom: 4 }}>"{fp.phrase}"</div>
                          <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.55 }}>↳ {fp.reason}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  <InfoRow label="Emotional Language" value={result.explainableAnalysis.emotionalLanguage} />
                  <InfoRow label="Evidence Assessment" value={result.explainableAnalysis.evidenceAssessment} />
                </Card>
                {result.explainableAnalysis.reasoningBreakdown?.length > 0 && (
                  <Card icon="🧠" iconBg="rgba(95,168,224,0.1)" title="Step-by-Step Reasoning">
                    {result.explainableAnalysis.reasoningBreakdown.map((s, i) => (
                      <div key={i} style={{
                        display: 'flex', gap: 14, padding: '12px 0',
                        borderBottom: i < result.explainableAnalysis.reasoningBreakdown.length - 1 ? '1px solid var(--border)' : 'none',
                        fontSize: 14, lineHeight: 1.65,
                      }}>
                        <span className="font-mono" style={{ color: 'var(--accent)', fontSize: 12, paddingTop: 2, minWidth: 22 }}>
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        <span>{s}</span>
                      </div>
                    ))}
                  </Card>
                )}
              </div>
            )}

            {/* PROPAGATION */}
            {activeTab === 'propagation' && (
              <div className="animate-fade-up">
                {result.propagationInsight && (
                  <Card icon="📢" iconBg="rgba(224,136,85,0.1)" title="Viral Potential" style={{ marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 16, flexWrap: 'wrap' }}>
                      <div style={{ textAlign: 'center' }}>
                        <div className="font-display" style={{ fontSize: 36, fontWeight: 700, color: VIRAL_COLORS[result.propagationInsight.viralPotential] || 'var(--accent)' }}>
                          {result.propagationInsight.viralPotential}
                        </div>
                        <div className="font-mono" style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>VIRAL POTENTIAL</div>
                      </div>
                      <div style={{ flex: 1, fontSize: 14, color: 'var(--text)', lineHeight: 1.65 }}>
                        {result.propagationInsight.viralReason}
                      </div>
                    </div>
                    <InfoRow label="How It Typically Spreads" value={result.propagationInsight.spreadPattern} />
                    <InfoRow label="Trending Status" value={result.propagationInsight.trendingStatus} />
                  </Card>
                )}
                {result.reverseSearch && (
                  <Card icon="🔄" iconBg="rgba(95,168,224,0.1)" title="Reverse News Search">
                    <div style={{ marginBottom: 14 }}>
                      <span style={{
                        background: result.reverseSearch.appearedBefore ? 'rgba(224,85,102,0.1)' : 'rgba(82,184,122,0.1)',
                        border: `1px solid ${result.reverseSearch.appearedBefore ? 'rgba(224,85,102,0.25)' : 'rgba(82,184,122,0.25)'}`,
                        color: result.reverseSearch.appearedBefore ? 'var(--red)' : 'var(--green)',
                        fontFamily: 'DM Mono, monospace', fontSize: 12, padding: '4px 12px', borderRadius: 6,
                      }}>
                        {result.reverseSearch.appearedBefore ? '⚠ This claim has appeared before' : '✓ Appears to be a new claim'}
                      </span>
                    </div>
                    <InfoRow label="Context" value={result.reverseSearch.context} />
                    <InfoRow label="What Trusted Sources Say" value={result.reverseSearch.trustedSourceVerdict} />
                    <InfoRow label="Related Fact-Checks" value={result.reverseSearch.relatedFactChecks} />
                  </Card>
                )}
              </div>
            )}

            {/* SOURCES */}
            {activeTab === 'sources' && (
              <div className="animate-fade-up">
                <Card icon="✅" iconBg="rgba(82,184,122,0.1)" title="What Real News Actually Says">
                  {(result.realNews || []).length === 0
                    ? <div style={{ fontSize: 14, color: 'var(--muted)' }}>No corroborating sources found.</div>
                    : (result.realNews || []).map((item, i) => (
                      <div key={i} style={{
                        display: 'flex', gap: 16, padding: '16px 0',
                        borderBottom: i < result.realNews.length - 1 ? '1px solid var(--border)' : 'none',
                      }}>
                        <span className="font-mono" style={{ fontSize: 13, color: 'var(--accent)', paddingTop: 2, minWidth: 24 }}>
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        <div>
                          <div style={{ fontSize: 15, lineHeight: 1.65, color: 'var(--text)', marginBottom: 4 }}>{item.headline}</div>
                          {item.source && <div className="font-mono" style={{ fontSize: 12, color: 'var(--muted)' }}>— {item.source}</div>}
                        </div>
                      </div>
                    ))
                  }
                </Card>
              </div>
            )}

            {/* AI ASSISTANT */}
            {activeTab === 'assistant' && (
              <div className="animate-fade-up">
                <Card icon="💬" iconBg="rgba(95,168,224,0.1)" title="AI Assistant">
                  <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>
                    Ask anything about this analysis. The assistant knows the full context.
                  </div>

                  {/* Pre-answers */}
                  {result.interactiveExplanations && (
                    <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: 16, marginBottom: 20 }}>
                      <div className="font-mono" style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 12 }}>QUICK ANSWERS</div>
                      <PreAnswer q="Why is this fake/real/misleading?" a={result.interactiveExplanations.whyFakeOrReal} />
                      <PreAnswer q="What's the most problematic part?" a={result.interactiveExplanations.mostProblematicPart} />
                      <PreAnswer q="Simple explanation" a={result.interactiveExplanations.simpleExplanation} />
                    </div>
                  )}

                  {/* Quick chips */}
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                    {QUICK_QUESTIONS.map(q => (
                      <button key={q} onClick={() => askQuestion(q)} disabled={chatLoading} style={{
                        background: 'var(--surface2)', border: '1px solid var(--border)',
                        borderRadius: 20, padding: '6px 14px', fontSize: 12,
                        color: 'var(--muted)', cursor: chatLoading ? 'not-allowed' : 'pointer',
                        fontFamily: 'DM Sans, sans-serif', transition: 'all 0.15s',
                      }}>
                        {q}
                      </button>
                    ))}
                  </div>

                  {/* Chat log */}
                  {chatLog.length > 0 && (
                    <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: 14, marginBottom: 12, maxHeight: 320, overflowY: 'auto' }}>
                      {chatLog.map((msg, i) => (
                        <div key={i} style={{ marginBottom: 10, display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                          <div style={{
                            background: msg.role === 'user' ? 'rgba(226,185,106,0.12)' : 'var(--surface2)',
                            border: `1px solid ${msg.role === 'user' ? 'rgba(226,185,106,0.2)' : 'var(--border)'}`,
                            borderRadius: 10, padding: '10px 14px', fontSize: 13,
                            lineHeight: 1.65, maxWidth: '85%',
                            color: msg.role === 'user' ? 'var(--accent)' : 'var(--text)',
                          }}>
                            {msg.text}
                          </div>
                        </div>
                      ))}
                      {chatLoading && (
                        <div style={{ display: 'flex', gap: 5, padding: '8px 4px' }}>
                          {[0,1,2].map(i => (
                            <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--muted)', animation: `pulse 1s ease ${i * 0.2}s infinite` }} />
                          ))}
                        </div>
                      )}
                      <div ref={chatEndRef} />
                    </div>
                  )}

                  {/* Input */}
                  <div style={{ display: 'flex', gap: 10 }}>
                    <input
                      value={chatInput}
                      onChange={e => setChatInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && askQuestion(chatInput)}
                      placeholder="Ask anything about this analysis…"
                      style={{
                        flex: 1, background: 'var(--surface2)', border: '1px solid var(--border)',
                        borderRadius: 8, padding: '10px 14px', fontSize: 13,
                        color: 'var(--text)', fontFamily: 'DM Sans, sans-serif', outline: 'none',
                      }}
                    />
                    <button onClick={() => askQuestion(chatInput)} disabled={!chatInput.trim() || chatLoading} style={btnStyle(!chatInput.trim() || chatLoading)}>
                      Ask
                    </button>
                  </div>
                </Card>
              </div>
            )}
          </div>

          {/* Reset */}
          <button onClick={reset} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'transparent', color: 'var(--muted)',
            border: '1px solid var(--border)', borderRadius: 8,
            padding: '10px 20px', fontFamily: 'DM Sans, sans-serif',
            fontSize: 13, cursor: 'pointer', margin: '28px 0 48px', transition: 'all 0.2s',
          }}>
            ← Analyze another claim
          </button>
        </div>
      )}

      <footer style={{
        borderTop: '1px solid var(--border)', padding: '24px 0',
        display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
      }}>
        <span className="font-mono" style={{ fontSize: 12, color: 'var(--muted)' }}>
          Veritas — <span style={{ color: 'var(--accent)' }}>Advanced AI Truth Engine</span>
        </span>
        <span className="font-mono" style={{ fontSize: 12, color: 'var(--muted)' }}>
          Powered by Groq · LLaMA 3.3 70B
        </span>
      </footer>
    </div>
  )
}

function Card({ icon, iconBg, title, children, style = {} }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 22, ...style }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>{icon}</div>
        <div className="font-mono" style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 500 }}>{title}</div>
      </div>
      {children}
    </div>
  )
}

function Label({ children }) {
  return (
    <div className="font-mono" style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 12 }}>
      {children}
    </div>
  )
}

function Pill({ color, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 100, padding: '7px 14px', fontFamily: 'DM Mono, monospace', fontSize: 12, color }}>
      {children}
    </div>
  )
}

function InfoRow({ label, value }) {
  if (!value) return null
  return (
    <div style={{ marginBottom: 12 }}>
      <div className="font-mono" style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>{label.toUpperCase()}</div>
      <div style={{ fontSize: 14, lineHeight: 1.65, color: 'var(--text)' }}>{value}</div>
    </div>
  )
}

function PreAnswer({ q, a }) {
  if (!a) return null
  return (
    <div style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
      <div className="font-mono" style={{ fontSize: 11, color: 'var(--accent)', marginBottom: 5 }}>Q: {q}</div>
      <div style={{ fontSize: 13, lineHeight: 1.65, color: 'var(--muted)' }}>{a}</div>
    </div>
  )
}

function btnStyle(disabled) {
  return {
    display: 'flex', alignItems: 'center', gap: 8,
    background: 'var(--accent)', color: '#0c0d0f',
    border: 'none', borderRadius: 8, padding: '9px 22px',
    fontFamily: 'DM Sans, sans-serif', fontSize: 13, fontWeight: 600,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.45 : 1, transition: 'all 0.2s', whiteSpace: 'nowrap',
  }
}
