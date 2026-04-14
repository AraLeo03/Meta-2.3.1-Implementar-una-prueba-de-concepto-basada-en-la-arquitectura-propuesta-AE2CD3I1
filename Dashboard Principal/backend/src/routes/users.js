import express from 'express'
import User from '../models/User.js'

const router = express.Router()

router.get('/', async (req, res) => {
  try {
    const { rol } = req.query
    
    const filter = {}
    if (rol) filter.rol = rol

    const users = await User.find(filter).select('nombres apellido_paterno apellido_materno email rol organizacion tags')

    res.json(users.map(u => ({
      id: u._id,
      nombres: u.nombres,
      apellido_paterno: u.apellido_paterno,
      apellido_materno: u.apellido_materno,
      nombre: `${u.nombres} ${u.apellido_paterno} ${u.apellido_materno}`,
      email: u.email,
      rol: u.rol,
      organizacion: u.organizacion,
      tags: u.tags
    })))
  } catch (err) {
    console.error('Error fetching users:', err)
    res.status(500).json({ error: 'Error al obtener usuarios' })
  }
})

router.get('/reviewers', async (req, res) => {
  try {
    const { tags, search } = req.query
    
    const filter = { rol: 'revisor' }
    if (tags) {
      filter.tags = { $in: tags.split(',').map(t => t.trim()) }
    }

    let reviewers = await User.find(filter).select('nombres apellido_paterno apellido_materno email organizacion tags')

    if (search) {
      const searchLower = search.toLowerCase()
      reviewers = reviewers.filter(r => {
        const fullName = `${r.nombres} ${r.apellido_paterno} ${r.apellido_materno}`.toLowerCase()
        return fullName.includes(searchLower) || 
               r.tags.some(t => t.toLowerCase().includes(searchLower))
      })
    }

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

router.get('/me/invitations', async (req, res) => {
  try {
    const { userId } = req.query
    const user = await User.findById(userId)
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' })
    }
    const pendingInvitations = user.invitations.filter(i => i.status === 'pendiente')
    res.json(pendingInvitations.map(inv => ({
      id: inv._id,
      manuscriptId: inv.manuscriptId,
      title: inv.manuscriptTitle,
      assignedAt: inv.assignedAt
    })))
  } catch (err) {
    console.error('Error fetching invitations:', err)
    res.status(500).json({ error: 'Error al obtener invitaciones' })
  }
})

router.post('/me/invitations/:id/accept', async (req, res) => {
  try {
    const { userId } = req.body
    const user = await User.findById(userId)
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' })
    }
    const invitation = user.invitations.id(req.params.id)
    if (!invitation) {
      return res.status(404).json({ error: 'Invitación no encontrada' })
    }
    if (invitation.status !== 'pendiente') {
      return res.status(400).json({ error: 'Invitación ya procesada' })
    }
    invitation.status = 'aceptada'
    await user.save()
    res.json({ message: 'Invitación aceptada', invitationId: invitation._id })
  } catch (err) {
    console.error('Error accepting invitation:', err)
    res.status(500).json({ error: 'Error al aceptar invitación' })
  }
})

router.post('/me/invitations/:id/decline', async (req, res) => {
  try {
    const { userId } = req.body
    const user = await User.findById(userId)
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' })
    }
    const invitation = user.invitations.id(req.params.id)
    if (!invitation) {
      return res.status(404).json({ error: 'Invitación no encontrada' })
    }
    if (invitation.status !== 'pendiente') {
      return res.status(400).json({ error: 'Invitación ya procesada' })
    }
    invitation.status = 'rechazada'
    await user.save()
    res.json({ message: 'Invitación declinada' })
  } catch (err) {
    console.error('Error declining invitation:', err)
    res.status(500).json({ error: 'Error al declinar invitación' })
  }
})

router.put('/:id', async (req, res) => {
  try {
    const { nombres, apellido_paterno, apellido_materno, email, organizacion, rol, tags, password } = req.body
    
    const user = await User.findById(req.params.id)
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' })
    }

    if (nombres) user.nombres = nombres
    if (apellido_paterno) user.apellido_paterno = apellido_paterno
    if (apellido_materno) user.apellido_materno = apellido_materno
    if (email) user.email = email
    if (organizacion) user.organizacion = organizacion
    if (rol) user.rol = rol
    if (tags) user.tags = tags
    if (password) user.password = password

    await user.save()

    res.json({
      id: user._id,
      nombre: `${user.nombres} ${user.apellido_paterno} ${user.apellido_materno}`,
      email: user.email,
      rol: user.rol
    })
  } catch (err) {
    console.error('Error updating user:', err)
    res.status(500).json({ error: 'Error al actualizar usuario' })
  }
})

export default router