import express from 'express'
import jwt from 'jsonwebtoken'
import mongoose from 'mongoose'
import Comment from '../models/Comment.js'
import Manuscript from '../models/Manuscript.js'
import User from '../models/User.js'

const router = express.Router()
const JWT_SECRET = process.env.JWT_SECRET || 'peer-review-secret-key-2024'

function extractUser(req) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) return null
  try {
    return jwt.verify(authHeader.split(' ')[1], JWT_SECRET)
  } catch {
    return null
  }
}

function toOid(id) {
  try { return new mongoose.Types.ObjectId(id) } catch { return null }
}

// ─── NOTIFICATIONS (must be before /:manuscriptId) ───────────────────────────

router.get('/notifications', async (req, res) => {
  const caller = extractUser(req)
  if (!caller) return res.status(401).json({ error: 'No autorizado' })

  const callerId = toOid(caller.id)
  if (!callerId) return res.status(400).json({ error: 'ID inválido' })

  try {
    // Todos los manuscritos donde este revisor está asignado
    const manuscripts = await Manuscript.find({ 'reviewers.reviewerId': callerId })

    // Invitaciones pendientes
    const pendingInvitations = manuscripts
      .filter(m => {
        const r = m.reviewers.find(r => r.reviewerId.toString() === caller.id)
        return r?.status === 'pendiente'
      })
      .map(m => {
        const r = m.reviewers.find(r => r.reviewerId.toString() === caller.id)
        return {
          type: 'invitation',
          manuscriptId: m._id.toString(),
          title: m.title,
          createdAt: r?.assignedAt
        }
      })

    // Mensajes no leídos del autor hacia este revisor
    const unreadComments = await Comment.find({
      reviewerId: callerId,
      senderRole: 'autor',
      readBy: { $nin: [callerId] }
    }).sort({ createdAt: -1 })

    // Agrupar por manuscrito
    const unreadMap = {}
    for (const c of unreadComments) {
      const key = c.manuscriptId.toString()
      if (!unreadMap[key]) {
        const ms = manuscripts.find(m => m._id.toString() === key)
        unreadMap[key] = {
          type: 'message',
          manuscriptId: key,
          title: ms?.title || 'Manuscrito',
          count: 0,
          lastAt: c.createdAt
        }
      }
      unreadMap[key].count++
    }

    const messages = Object.values(unreadMap)
    const total = pendingInvitations.length + messages.length

    res.json({ invitations: pendingInvitations, messages, total })
  } catch (err) {
    console.error('Error fetching notifications:', err)
    res.status(500).json({ error: 'Error al obtener notificaciones' })
  }
})

// ─── MARK READ ────────────────────────────────────────────────────────────────

router.post('/:manuscriptId/mark-read', async (req, res) => {
  const caller = extractUser(req)
  if (!caller) return res.status(401).json({ error: 'No autorizado' })

  const callerId = toOid(caller.id)
  if (!callerId) return res.status(400).json({ error: 'ID inválido' })

  try {
    const manuscript = await Manuscript.findById(req.params.manuscriptId)
    if (!manuscript) return res.status(404).json({ error: 'Manuscrito no encontrado' })

    const isAuthor = manuscript.authorId.toString() === caller.id
    const isReviewer = manuscript.reviewers.some(r => r.reviewerId.toString() === caller.id)
    if (!isAuthor && !isReviewer) return res.status(403).json({ error: 'Sin acceso' })

    const filter = {
      manuscriptId: manuscript._id,
      readBy: { $nin: [callerId] }
    }

    if (isReviewer) {
      filter.reviewerId = callerId
      filter.senderRole = 'autor'
    } else {
      filter.senderRole = 'revisor'
      if (req.body.reviewerId) filter.reviewerId = toOid(req.body.reviewerId)
    }

    await Comment.updateMany(filter, { $addToSet: { readBy: callerId } })
    res.json({ ok: true })
  } catch (err) {
    console.error('Error marking read:', err)
    res.status(500).json({ error: 'Error al marcar como leído' })
  }
})

// ─── THREADS (author only) ────────────────────────────────────────────────────

router.get('/:manuscriptId/threads', async (req, res) => {
  const caller = extractUser(req)
  if (!caller) return res.status(401).json({ error: 'No autorizado' })

  const callerId = toOid(caller.id)
  try {
    const manuscript = await Manuscript.findById(req.params.manuscriptId)
    if (!manuscript) return res.status(404).json({ error: 'Manuscrito no encontrado' })

    if (manuscript.authorId.toString() !== caller.id)
      return res.status(403).json({ error: 'Solo el autor puede ver los hilos' })

    const threads = await Promise.all(manuscript.reviewers.map(async r => {
      const unread = await Comment.countDocuments({
        manuscriptId: manuscript._id,
        reviewerId: r.reviewerId,
        senderRole: 'revisor',
        readBy: { $nin: [callerId] }
      })
      return {
        reviewerId: r.reviewerId.toString(),
        reviewerName: r.reviewerName,
        status: r.status,
        unread
      }
    }))

    res.json(threads)
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener hilos' })
  }
})

// ─── GET COMMENTS ─────────────────────────────────────────────────────────────

router.get('/:manuscriptId', async (req, res) => {
  const caller = extractUser(req)
  if (!caller) return res.status(401).json({ error: 'No autorizado' })

  const callerId = toOid(caller.id)
  try {
    const manuscript = await Manuscript.findById(req.params.manuscriptId)
    if (!manuscript) return res.status(404).json({ error: 'Manuscrito no encontrado' })

    const isAuthor = manuscript.authorId.toString() === caller.id
    const isReviewer = manuscript.reviewers.some(r => r.reviewerId.toString() === caller.id)

    if (!isAuthor && !isReviewer)
      return res.status(403).json({ error: 'Sin acceso' })

    const filter = { manuscriptId: manuscript._id, authorId: manuscript.authorId }

    if (isReviewer) {
      filter.reviewerId = callerId
    } else if (req.query.reviewerId) {
      filter.reviewerId = toOid(req.query.reviewerId)
    }

    const comments = await Comment.find(filter).sort({ createdAt: 1 })
    res.json(comments)
  } catch (err) {
    console.error('Error fetching comments:', err)
    res.status(500).json({ error: 'Error al obtener comentarios' })
  }
})

// ─── POST COMMENT ─────────────────────────────────────────────────────────────

router.post('/:manuscriptId', async (req, res) => {
  const caller = extractUser(req)
  if (!caller) return res.status(401).json({ error: 'No autorizado' })

  const { text, reviewerId } = req.body
  if (!text?.trim()) return res.status(400).json({ error: 'El comentario no puede estar vacío' })

  const callerId = toOid(caller.id)
  try {
    const manuscript = await Manuscript.findById(req.params.manuscriptId)
    if (!manuscript) return res.status(404).json({ error: 'Manuscrito no encontrado' })

    const isAuthor = manuscript.authorId.toString() === caller.id
    const isReviewer = manuscript.reviewers.some(r => r.reviewerId.toString() === caller.id)
    if (!isAuthor && !isReviewer) return res.status(403).json({ error: 'Sin acceso' })

    const user = await User.findById(caller.id).select('nombres apellido_paterno')
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' })

    let targetReviewerId
    if (isAuthor) {
      if (!reviewerId) return res.status(400).json({ error: 'reviewerId requerido para el autor' })
      const assigned = manuscript.reviewers.find(r => r.reviewerId.toString() === reviewerId)
      if (!assigned) return res.status(403).json({ error: 'El revisor no está asignado' })
      targetReviewerId = toOid(reviewerId)
    } else {
      targetReviewerId = callerId
    }

    const comment = new Comment({
      manuscriptId: manuscript._id,
      authorId: manuscript.authorId,
      reviewerId: targetReviewerId,
      senderId: callerId,
      senderName: `${user.nombres} ${user.apellido_paterno}`,
      senderRole: isAuthor ? 'autor' : 'revisor',
      text: text.trim(),
      readBy: [callerId]
    })

    await comment.save()
    res.status(201).json(comment)
  } catch (err) {
    console.error('Error creating comment:', err)
    res.status(500).json({ error: 'Error al crear comentario' })
  }
})

export default router
