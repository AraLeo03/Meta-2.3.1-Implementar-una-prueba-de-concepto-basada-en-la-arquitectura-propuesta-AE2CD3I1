/**
 * Adaptador para la API de Groq
 * Configuración via variables de entorno:
 *   GROQ_API_KEY  — clave de API de Groq (requerida)
 *   GROQ_MODEL    — modelo a usar (default: llama-3.3-70b-versatile)
 */

const GROQ_API_KEY = process.env.GROQ_API_KEY
const GROQ_MODEL   = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile'
const GROQ_URL     = 'https://api.groq.com/openai/v1/chat/completions'

export function isGroqAvailable() {
  return Boolean(GROQ_API_KEY)
}

/**
 * Analiza la compatibilidad entre un manuscrito y una lista de revisores.
 * Misma interfaz que gemini.js para intercambiabilidad.
 *
 * @param {{ title: string, abstract: string, tags: string[] }} manuscript
 * @param {{ id: string, nombre: string, organizacion: string, tags: string[], keywords: string[] }[]} reviewers
 * @returns {Promise<{ reviewerId: string, score: number, explanation: string }[]>}
 */
export async function analyzeMatch(manuscript, reviewers) {
  if (!GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY no configurada')
  }

  const reviewerList = reviewers.map((r, i) =>
    `Revisor ${i + 1}:
  - ID: ${r.id}
  - Nombre: ${r.nombre}
  - Organización: ${r.organizacion}
  - Áreas de expertise (tags): ${r.tags.length ? r.tags.join(', ') : 'No especificadas'}
  - Palabras clave adicionales: ${r.keywords && r.keywords.length ? r.keywords.join(', ') : 'Ninguna'}`
  ).join('\n\n')

  const prompt = `Eres un sistema experto en revisión académica por pares. Analiza qué tan adecuado es cada revisor para evaluar el siguiente manuscrito.

MANUSCRITO:
- Título: ${manuscript.title}
- Resumen: ${manuscript.abstract || 'No proporcionado'}
- Temas/Tags: ${manuscript.tags.length ? manuscript.tags.join(', ') : 'No especificados'}

REVISORES:
${reviewerList}

Evalúa cada revisor de 0 a 100 según compatibilidad con el manuscrito.
La explicación debe ser breve (máximo 2 oraciones) en español.

Responde ÚNICAMENTE con un arreglo JSON válido, sin texto adicional ni markdown:
[
  {
    "reviewerId": "<ID exacto del revisor>",
    "score": <número entero 0-100>,
    "explanation": "<explicación breve en español>"
  }
]`

  const response = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_API_KEY}`
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      max_tokens: 1024
    })
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Groq API error ${response.status}: ${errorText}`)
  }

  const data = await response.json()
  const rawText = data?.choices?.[0]?.message?.content

  if (!rawText) {
    throw new Error('Groq no devolvió contenido válido')
  }

  const cleaned = rawText.replace(/```json|```/g, '').trim()
  const parsed = JSON.parse(cleaned)

  if (!Array.isArray(parsed)) {
    throw new Error('Groq no devolvió un arreglo JSON válido')
  }

  return parsed
}
