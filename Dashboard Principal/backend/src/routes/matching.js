import express from 'express'
import User from '../models/User.js'
import Manuscript from '../models/Manuscript.js'
import { isGroqAvailable, analyzeMatch } from '../services/groq.js'

const router = express.Router()

// ── Helpers ───────────────────────────────────────────────────────────────────

function keywordScore(reviewer, manuscriptTagsLower, titleTokens) {
  const reviewerTagsLower     = (reviewer.tags     || []).map(t => t.toLowerCase())
  const reviewerKeywordsLower = (reviewer.keywords || []).map(k => k.toLowerCase())

  const tagMatches = manuscriptTagsLower.filter(t => reviewerTagsLower.includes(t)).length
  const keywordTagMatches = manuscriptTagsLower.filter(t =>
    reviewerKeywordsLower.some(k => k.includes(t) || t.includes(k))
  ).length
  const titleMatches = titleTokens.filter(token =>
    reviewerKeywordsLower.some(k => k.includes(token) || token.includes(k))
  ).length

  const MAX_WEIGHT = Math.max(manuscriptTagsLower.length * 2 + manuscriptTagsLower.length + titleTokens.length * 0.5, 1)
  const rawScore   = tagMatches * 2 + keywordTagMatches * 1 + titleMatches * 0.5
  return Math.min(Math.round((rawScore / MAX_WEIGHT) * 100), 100)
}

async function getCandidates(manuscriptId) {
  let assignedReviewerIds = []
  let autorOrganizacion = null
  let autorAfiliaciones = []

  // 1. Obtener datos del manuscrito para saber quién es el autor (MariaDB / Sequelize)
  if (manuscriptId) {
    const manuscript = await Manuscript.findById(manuscriptId)
    if (manuscript) {
      assignedReviewerIds = manuscript.reviewers ? manuscript.reviewers.map(r => r.reviewerId.toString()) : []
      
      const autor = await User.findByPk(manuscript.authorId) 
      if (autor) {
        autorOrganizacion = autor.organizacion
        autorAfiliaciones = autor.afiliaciones_previas || []
      }
    }
  }

  // 2. Buscar revisores usando Sequelize
  const allUsers = await User.findAll({ raw: true })
  const allReviewers = allUsers.filter(u => {
      try {
          const roles = typeof u.roles === 'string' ? JSON.parse(u.roles) : (u.roles || [])
          return roles.includes('revisor')
      } catch (e) {
          return u.roles === 'revisor'
      }
  })

  return allReviewers
    .filter(r => !assignedReviewerIds.includes(r.id.toString()))
    .map(r => {
      // ---> LÓGICA US-15: Detectar Conflicto de Interés <---
      let revisorAfiliaciones = []
      try {
          revisorAfiliaciones = typeof r.afiliaciones_previas === 'string' ? JSON.parse(r.afiliaciones_previas) : (r.afiliaciones_previas || [])
      } catch (e) {}

      const mismaOrg = autorOrganizacion && autorOrganizacion === r.organizacion;
      const mismaAfil = autorAfiliaciones.some(af => revisorAfiliaciones.includes(af));

      let tagsArray = []
      let keywordsArray = []
      try { tagsArray = typeof r.tags === 'string' ? JSON.parse(r.tags) : (r.tags || []) } catch (e) {}
      try { keywordsArray = typeof r.keywords === 'string' ? JSON.parse(r.keywords) : (r.keywords || []) } catch (e) {}

      return {
        id:           r.id.toString(),
        nombre:       `${r.nombres} ${r.apellido_paterno} ${r.apellido_materno || ''}`.trim(),
        email:        r.email,
        organizacion: r.organizacion,
        tags:         tagsArray,
        keywords:     keywordsArray,
        tieneConflicto: mismaOrg || mismaAfil
      }
    })
}

// ── POST /api/matching/suggestions  (keywords — carga automática) ─────────────
router.post('/suggestions', async (req, res) => {
  try {
    const { title = '', abstract = '', tags = [], manuscriptId } = req.body

    const candidates = await getCandidates(manuscriptId)

    const manuscriptTagsLower = tags.map(t => t.toLowerCase())
    const titleTokens = title.toLowerCase().split(/\s+/).filter(t => t.length > 3)

    const scored = candidates
      .map(r => ({
        ...r,
        score:          keywordScore(r, manuscriptTagsLower, titleTokens),
        explanation:    null,
        source:         'keywords',
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)

    return res.json(scored)
  } catch (err) {
    console.error('Error en matching/suggestions:', err)
    res.status(500).json({ error: 'Error al calcular sugerencias de revisores' })
  }
})

// ── POST /api/matching/suggestions-groq (Groq — solo al presionar botón) ──
router.post('/suggestions-groq', async (req, res) => {
  try {
    const { title = '', abstract = '', tags = [], manuscriptId } = req.body

    if (!isGroqAvailable()) {
      return res.status(503).json({ error: 'GROQ_API_KEY no configurada en el servidor' })
    }

    const allCandidates = await getCandidates(manuscriptId)

    if (allCandidates.length === 0) {
      return res.json([])
    }

    // Pre-filtrar top 5 por keywords antes de mandar a Groq
    const manuscriptTagsLower = tags.map(t => t.toLowerCase())
    const titleTokens = title.toLowerCase().split(/\s+/).filter(t => t.length > 3)

    const preScored = allCandidates
      .map(r => ({ ...r, _pre: keywordScore(r, manuscriptTagsLower, titleTokens) }))
      .sort((a, b) => b._pre - a._pre)
      .slice(0, 5)

    const candidates = preScored.map(({ _pre, ...r }) => r)

    const groqResults = await analyzeMatch(
      { title, abstract, tags },
      candidates
    )

    const groqMap = {}
    for (const g of groqResults) groqMap[g.reviewerId] = g

    const scored = candidates.map(r => {
      const g = groqMap[r.id]
      return {
        id:             r.id,
        nombre:         r.nombre,
        email:          r.email,
        organizacion:   r.organizacion,
        tags:           r.tags,
        keywords:       r.keywords,
        score:          g ? Math.max(0, Math.min(100, Math.round(g.score))) : 0,
        explanation:    g?.explanation || null,
        source:         'groq',
        tieneConflicto: r.tieneConflicto 
      }
    }).sort((a, b) => b.score - a.score).slice(0, 10)

    return res.json(scored)
  } catch (err) {
    console.error('Error en matching/suggestions-groq:', err)
    res.status(500).json({ error: err.message || 'Error al analizar con Groq' })
  }
})

export default router