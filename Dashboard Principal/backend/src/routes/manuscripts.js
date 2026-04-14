import express from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import mongoose from 'mongoose'
import Manuscript from '../models/Manuscript.js'
import User from '../models/User.js'
import jwt from 'jsonwebtoken'

const router = express.Router()
const JWT_SECRET = process.env.JWT_SECRET || 'peer-review-secret-key-2024'

function extractUserId(req) {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }
  const token = authHeader.split(' ')[1]
  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    return decoded.id
  } catch {
    return null
  }
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, uniqueSuffix + path.extname(file.originalname))
  }
})

const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true)
    } else {
      cb(new Error('Solo se permiten archivos PDF'), false)
    }
  },
  limits: { fileSize: 50 * 1024 * 1024 }
})

function mapStatusToSpanish(status) {
  const map = {
    'enviado': 'Enviado',
    'en_revision': 'En revisión',
    'decision': 'Decisión',
    'aceptado': 'Aceptado',
    'rechazado': 'Rechazado'
  }
  return map[status] || status
}

function formatDate(date) {
  const d = new Date(date)
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  return `${day}/${month}/${year}`
}

router.post('/', upload.single('pdf'), async (req, res) => {
  try {
    const { title, authors, description, tags } = req.body
    
    const parsedAuthors = typeof authors === 'string' ? JSON.parse(authors) : authors
    
    if (!title || !parsedAuthors || !parsedAuthors.length || !req.file) {
      return res.status(400).json({ error: 'Faltan campos requeridos' })
    }

    const authorId = extractUserId(req)
    if (!authorId) {
      return res.status(401).json({ error: 'No autorizado' })
    }

    const manuscript = new Manuscript({
      title,
      authors: parsedAuthors,
      description: description || '',
      tags: tags ? (typeof tags === 'string' ? JSON.parse(tags) : tags) : [],
      pdfPath: req.file.path,
      pdfName: req.file.originalname,
      authorId,
      status: 'enviado'
    })

    await manuscript.save()

    res.status(201).json({
      id: manuscript._id,
      title: manuscript.title,
      authors: manuscript.authors,
      description: manuscript.description,
      tags: manuscript.tags,
      pdfName: manuscript.pdfName,
      status: mapStatusToSpanish(manuscript.status),
      date: formatDate(manuscript.createdAt)
    })
  } catch (err) {
    console.error('Errorcreating manuscript:', err)
    res.status(500).json({ error: 'Error al crear manuscrito' })
  }
})

router.get('/', async (req, res) => {
  try {
    const { authorId, status, tags } = req.query
    
    const filter = {}
    if (authorId) filter.authorId = authorId
    if (status) filter.status = status
    if (tags) filter.tags = { $in: tags.split(',') }

    const manuscripts = await Manuscript.find(filter).sort({ createdAt: -1 })

    res.json(manuscripts.map(m => ({
      id: m._id,
      title: m.title,
      authors: m.authors,
      description: m.description,
      tags: m.tags,
      pdfName: m.pdfName,
      pdfPath: m.pdfPath,
      status: mapStatusToSpanish(m.status),
      date: formatDate(m.createdAt),
      reviewers: m.reviewers
    })))
  } catch (err) {
    console.error('Error fetching manuscripts:', err)
    res.status(500).json({ error: 'Error al obtener manuscritos' })
  }
})

router.get('/available', async (req, res) => {
  try {
    const { tags } = req.query
    
    const filter = { status: { $in: ['enviado', 'en_revision'] } }
    if (tags) {
      filter.tags = { $in: tags.split(',') }
    }

    const manuscripts = await Manuscript.find(filter).sort({ createdAt: -1 })

    res.json(manuscripts.map(m => ({
      id: m._id,
      title: m.title,
      authors: m.authors,
      description: m.description,
      tags: m.tags,
      pdfName: m.pdfName,
      pdfPath: m.pdfPath,
      status: mapStatusToSpanish(m.status),
      date: formatDate(m.createdAt)
    })))
  } catch (err) {
    console.error('Error fetching available manuscripts:', err)
    res.status(500).json({ error: 'Error al obtener manuscritos disponibles' })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const manuscript = await Manuscript.findById(req.params.id)
    if (!manuscript) {
      return res.status(404).json({ error: 'Manuscrito no encontrado' })
    }
    res.json({
      id: manuscript._id,
      title: manuscript.title,
      authors: manuscript.authors,
      description: manuscript.description,
      tags: manuscript.tags,
      pdfName: manuscript.pdfName,
      pdfPath: manuscript.pdfPath,
      status: mapStatusToSpanish(manuscript.status),
      date: formatDate(manuscript.createdAt)
    })
  } catch (err) {
    console.error('Error fetching manuscript:', err)
    res.status(500).json({ error: 'Error al obtener manuscrito' })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    const manuscript = await Manuscript.findByIdAndDelete(req.params.id)
    if (!manuscript) {
      return res.status(404).json({ error: 'Manuscrito no encontrado' })
    }
    if (manuscript.pdfPath && fs.existsSync(manuscript.pdfPath)) {
      fs.unlinkSync(manuscript.pdfPath)
    }
    res.json({ message: 'Manuscrito eliminado' })
  } catch (err) {
    console.error('Error deleting manuscript:', err)
    res.status(500).json({ error: 'Error al eliminar manuscrito' })
  }
})

router.get('/:id/view', async (req, res) => {
  try {
    const manuscript = await Manuscript.findById(req.params.id)
    if (!manuscript) {
      return res.status(404).json({ error: 'Manuscrito no encontrado' })
    }
    if (!manuscript.pdfPath || !fs.existsSync(manuscript.pdfPath)) {
      return res.status(404).json({ error: 'PDF no encontrado' })
    }
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', 'inline')
    const fileStream = fs.createReadStream(manuscript.pdfPath)
    fileStream.pipe(res)
  } catch (err) {
    console.error('Error viewing manuscript:', err)
    res.status(500).json({ error: 'Error al ver PDF' })
  }
})

router.get('/:id/download', async (req, res) => {
  try {
    const manuscript = await Manuscript.findById(req.params.id)
    if (!manuscript) {
      return res.status(404).json({ error: 'Manuscrito no encontrado' })
    }
    if (!manuscript.pdfPath || !fs.existsSync(manuscript.pdfPath)) {
      return res.status(404).json({ error: 'PDF no encontrado' })
    }
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `inline; filename="${manuscript.pdfName}"`)
    const fileStream = fs.createReadStream(manuscript.pdfPath)
    fileStream.pipe(res)
  } catch (err) {
    console.error('Error downloading manuscript:', err)
    res.status(500).json({ error: 'Error al descargar PDF' })
  }
})

router.post('/:id/assign-reviewer', async (req, res) => {
  try {
    const { reviewerId } = req.body
    const manuscriptId = req.params.id

    if (!reviewerId) {
      return res.status(400).json({ error: 'ID de revisor requerido' })
    }

    const manuscript = await Manuscript.findById(manuscriptId)
    if (!manuscript) {
      return res.status(404).json({ error: 'Manuscrito no encontrado' })
    }

    const reviewer = await User.findById(reviewerId)
    if (!reviewer || reviewer.rol !== 'revisor') {
      return res.status(400).json({ error: 'Revisor no válido' })
    }

    if (manuscript.reviewers.length >= 3) {
      return res.status(400).json({ error: 'El manuscrito ya tiene el máximo de 3 revisores' })
    }

    const alreadyAssigned = manuscript.reviewers.find(r => 
      r.reviewerId.toString() === reviewerId
    )
    if (alreadyAssigned) {
      return res.status(400).json({ error: 'El revisor ya está asignado a este manuscrito' })
    }

    manuscript.reviewers.push({
      reviewerId: new mongoose.Types.ObjectId(reviewerId),
      reviewerName: `${reviewer.nombres} ${reviewer.apellido_paterno} ${reviewer.apellido_materno}`,
      status: 'pendiente',
      assignedAt: new Date(),
      deadline: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000)
    })

    reviewer.invitations.push({
      manuscriptId: manuscript._id,
      manuscriptTitle: manuscript.title,
      status: 'pendiente'
    })

    await reviewer.save()

    if (manuscript.status === 'enviado') {
      manuscript.status = 'en_revision'
    }

    await manuscript.save()

    res.json({
      message: 'Revisor asignado correctamente',
      manuscript: {
        id: manuscript._id,
        title: manuscript.title,
        status: mapStatusToSpanish(manuscript.status),
        reviewers: manuscript.reviewers
      }
    })
  } catch (err) {
    console.error('Error assigning reviewer:', err)
    res.status(500).json({ error: 'Error al asignar revisor' })
  }
})

router.get('/reviewers', async (req, res) => {
  try {
    const { tags } = req.query
    
    const filter = { rol: 'revisor' }
    if (tags) {
      filter.tags = { $in: tags.split(',') }
    }

    const reviewers = await User.find(filter).select('nombres apellido_paterno apellido_materno email organizacion tags')

    res.json(reviewers.map(r => ({
      id: r._id,
      nombre: `${r.nombres} ${r.apellido_paterno} ${r.apellido_materno}`,
      email: r.email,
      organizacion: r.organizacion,
      tags: r.tags
    })))
  } catch (err) {
    console.error('Error fetching reviewers:', err)
    res.status(500).json({ error: 'Error al obtener revisores' })
  }
})

router.get('/all', async (req, res) => {
  try {
    const manuscripts = await Manuscript.find()
      .populate('authorId', 'nombres apellido_paterno apellido_materno email')
      .sort({ createdAt: -1 })

    res.json(manuscripts.map(m => ({
      id: m._id,
      title: m.title,
      authors: m.authors,
      description: m.description,
      tags: m.tags,
      pdfName: m.pdfName,
      status: mapStatusToSpanish(m.status),
      date: formatDate(m.createdAt),
      authorId: m.authorId ? {
        id: m.authorId._id,
        nombre: `${m.authorId.nombres} ${m.authorId.apellido_paterno} ${m.authorId.apellido_materno}`
      } : null,
      reviewers: m.reviewers
    })))
  } catch (err) {
    console.error('Error fetching all manuscripts:', err)
    res.status(500).json({ error: 'Error al obtener manuscritos' })
  }
})

router.get('/reviewer/:id', async (req, res) => {
  try {
    const reviewerId = req.params.id
    const manuscripts = await Manuscript.find({
      'reviewers.reviewerId': reviewerId
    }).sort({ createdAt: -1 })

    res.json(manuscripts.map(m => {
      const reviewerAssignment = m.reviewers.find(r => r.reviewerId.toString() === reviewerId)
      const deadline = reviewerAssignment?.deadline || new Date(Date.now() + 21 * 24 * 60 * 60 * 1000)
      return {
        manuscriptId: m._id,
        title: m.title,
        tags: m.tags,
        status: reviewerAssignment?.status || 'pendiente',
        assignedAt: reviewerAssignment?.assignedAt,
        deadline: reviewerAssignment?.completedAt ? null : deadline,
        completedAt: reviewerAssignment?.completedAt,
        verdict: reviewerAssignment?.verdict
      }
    }))
  } catch (err) {
    console.error('Error fetching reviewer manuscripts:', err)
    res.status(500).json({ error: 'Error al obtener manuscritos del revisor' })
  }
})

router.delete('/:id/reviewers/:reviewerId', async (req, res) => {
  try {
    const manuscript = await Manuscript.findById(req.params.id)
    if (!manuscript) {
      return res.status(404).json({ error: 'Manuscrito no encontrado' })
    }
    const reviewerIndex = manuscript.reviewers.findIndex(r => r.reviewerId.toString() === req.params.reviewerId)
    if (reviewerIndex === -1) {
      return res.status(404).json({ error: 'Revisor no encontrado en este manuscrito' })
    }
    manuscript.reviewers.splice(reviewerIndex, 1)
    await manuscript.save()

    const reviewer = await User.findById(req.params.reviewerId)
    if (reviewer) {
      reviewer.invitations = reviewer.invitations.filter(inv => 
        inv.manuscriptId.toString() !== manuscript._id.toString()
      )
      await reviewer.save()
    }

    res.json({ message: 'Revisor eliminado del manuscrito' })
  } catch (err) {
    console.error('Error removing reviewer:', err)
    res.status(500).json({ error: 'Error al eliminar revisor' })
  }
})

router.put('/:id/deadline', async (req, res) => {
  try {
    const { days } = req.body
    if (!days || days < 1 || days > 90) {
      return res.status(400).json({ error: 'Días inválidos (debe ser entre 1 y 90)' })
    }
    const manuscript = await Manuscript.findById(req.params.id)
    if (!manuscript) {
      return res.status(404).json({ error: 'Manuscrito no encontrado' })
    }
    const newDeadline = new Date(Date.now() + days * 24 * 60 * 60 * 1000)
    manuscript.reviewers.forEach(r => {
      if (!r.completedAt) {
        r.deadline = newDeadline
      }
    })
    await manuscript.save()
    res.json({ message: 'Plazo actualizado', deadline: newDeadline })
  } catch (err) {
    console.error('Error updating deadline:', err)
    res.status(500).json({ error: 'Error al actualizar plazo' })
  }
})

export default router