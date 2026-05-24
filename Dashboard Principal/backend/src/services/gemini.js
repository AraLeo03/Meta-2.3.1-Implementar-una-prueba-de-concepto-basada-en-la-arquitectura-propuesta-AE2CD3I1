const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const GEMINI_MODEL   = process.env.GEMINI_MODEL || 'gemini-2.0-flash'
const GEMINI_URL     = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`

export function isGeminiAvailable() {
  return Boolean(GEMINI_API_KEY)
}

function parseGeminiJson(raw) {
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/, '')
    .trim()
  return JSON.parse(cleaned)
}

export async function analyzeMatch(manuscript, reviewers) {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY no configurada')
  }

  if (!reviewers || reviewers.length === 0) {
    return []
  }

  const reviewerList = reviewers.map((r, i) =>
    `Revisor ${i + 1}:\n  - ID: ${r.id}\n  - Nombre: ${r.nombre}\n  - Organizacion: ${r.organizacion || 'No especificada'}\n  - Tags: ${r.tags && r.tags.length ? r.tags.join(', ') : 'No especificadas'}\n  - Keywords: ${r.keywords && r.keywords.length ? r.keywords.join(', ') : 'Ninguna'}`
  ).join('\n\n')

  const expectedIds = new Set(reviewers.map(r => r.id))

  const prompt = `Eres un sistema experto en revision academica por pares. Analiza que tan adecuado es cada revisor para evaluar el siguiente manuscrito.

MANUSCRITO:
- Titulo: ${manuscript.title}
- Resumen: ${manuscript.abstract || 'No proporcionado'}
- Tags: ${manuscript.tags && manuscript.tags.length ? manuscript.tags.join(', ') : 'No especificados'}

REVISORES:
${reviewerList}

INSTRUCCIONES:
1. Evalua CADA revisor con un score de 0 a 100.
2. La explicacion debe ser breve (1-2 oraciones) en espanol.
3. Devuelve UNICAMENTE un arreglo JSON valido, sin texto adicional ni markdown.
4. El arreglo debe tener EXACTAMENTE ${reviewers.length} objetos.
5. Usa el ID EXACTO de cada revisor.

Formato:
[{"reviewerId":"<ID>","score":<0-100>,"explanation":"<explicacion>"}]`

  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 2048,
      responseMimeType: 'application/json'
    }
  }

  const response = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })

  if (!response.ok) {
    const errorText = await response.text()
    if (response.status === 400 && errorText.includes('responseMimeType')) {
      return analyzeMatchFallback(prompt)
    }
    throw new Error(`Gemini API error ${response.status}: ${errorText}`)
  }

  const data = await response.json()
  const candidate = data && data.candidates && data.candidates[0]
  const part = candidate && candidate.content && candidate.content.parts && candidate.content.parts[0]
  const rawText = part && part.text

  if (!rawText) {
    const finishReason = candidate && candidate.finishReason
    throw new Error(`Gemini no devolvio contenido. finishReason: ${finishReason || 'desconocido'}`)
  }

  let parsed
  try {
    parsed = parseGeminiJson(rawText)
  } catch (parseErr) {
    throw new Error(`No se pudo parsear respuesta de Gemini: ${parseErr.message}`)
  }

  if (!Array.isArray(parsed)) {
    throw new Error('Gemini no devolvio un arreglo JSON valido')
  }

  const sanitized = parsed
    .filter(item => item && typeof item.reviewerId === 'string' && expectedIds.has(item.reviewerId))
    .map(item => ({
      reviewerId:  item.reviewerId,
      score:       Math.max(0, Math.min(100, Math.round(Number(item.score) || 0))),
      explanation: typeof item.explanation === 'string' ? item.explanation.trim() : ''
    }))

  const returnedIds = new Set(sanitized.map(s => s.reviewerId))
  for (const reviewer of reviewers) {
    if (!returnedIds.has(reviewer.id)) {
      sanitized.push({ reviewerId: reviewer.id, score: 0, explanation: 'No evaluado por el modelo.' })
    }
  }

  return sanitized
}

async function analyzeMatchFallback(prompt) {
  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.2, maxOutputTokens: 2048 }
  }

  const response = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Gemini API error ${response.status}: ${errorText}`)
  }

  const data = await response.json()
  const candidate = data && data.candidates && data.candidates[0]
  const part = candidate && candidate.content && candidate.content.parts && candidate.content.parts[0]
  const rawText = part && part.text

  if (!rawText) throw new Error('Gemini no devolvio contenido (fallback)')

  const parsed = parseGeminiJson(rawText)
  if (!Array.isArray(parsed)) throw new Error('Gemini no devolvio arreglo JSON (fallback)')

  return parsed
    .filter(item => item && typeof item.reviewerId === 'string')
    .map(item => ({
      reviewerId:  item.reviewerId,
      score:       Math.max(0, Math.min(100, Math.round(Number(item.score) || 0))),
      explanation: typeof item.explanation === 'string' ? item.explanation.trim() : ''
    }))
}
