import express from 'express'
import User from '../models/User.js'
import { Op } from 'sequelize' // Importamos los operadores de Sequelize para hacer búsquedas

const router = express.Router()

// ── GET / ─────────────────────────────────────────────────────────────────────
// Acepta ?rol=revisor para filtrar usuarios que tengan ese rol entre sus roles
router.get('/', async (req, res) => {
  console.log('>>> [USERS] Petición recibida para cargar usuarios...')
  try {
    const { rol } = req.query

    // AGREGAMOS { raw: true } para evitar que Sequelize congele la respuesta
    const users = await User.findAll({ raw: true })
    console.log(`>>> [USERS] Se leyeron ${users.length} usuarios de MariaDB.`)

    const safeUsers = users.map(u => {
      // Garantizar que roles sea un array sin importar cómo lo devuelva MariaDB
      let rolesArray = []
      try {
        if (typeof u.roles === 'string') rolesArray = JSON.parse(u.roles)
        else if (Array.isArray(u.roles)) rolesArray = u.roles
      } catch (e) {
        rolesArray = [u.roles]
      }

      return {
        id: u.id ? u.id.toString() : '',
        nombres: u.nombres || '',
        apellido_paterno: u.apellido_paterno || '',
        apellido_materno: u.apellido_materno || '',
        nombre: `${u.nombres || ''} ${u.apellido_paterno || ''} ${u.apellido_materno || ''}`.trim(),
        email: u.email || '',
        roles: rolesArray,           
        rol: rolesArray[0] || 'autor',
        organizacion: u.organizacion || '',
        tags: u.tags || []
      }
    })

    if (rol) {
      const filtrados = safeUsers.filter(u => u.roles.includes(rol))
      return res.json(filtrados)
    }

    res.json(safeUsers)
  } catch (err) {
    console.error('!!! [USERS] Error fatal detectado:', err)
    res.status(500).json({ error: 'Error al obtener usuarios' })
  }
})

// ── GET /reviewers ────────────────────────────────────────────────────────────
// Usado por los dropdowns de asignación manual y los sistemas de keywords/Gemini
router.get('/reviewers', async (req, res) => {
  try {
    const { tags, search } = req.query

    // Traemos todos los usuarios de la base de datos
    const allUsers = await User.findAll()

    // 1. Filtrar primero que solo sean revisores (reemplaza el filtro $in de Mongo)
    let reviewers = allUsers.filter(u => u.roles && u.roles.includes('revisor'))

    // 2. Filtrar por tags si vienen en la URL (?tags=ia,blockchain)
    if (tags) {
      const tagList = tags.split(',').map(t => t.trim().toLowerCase())
      reviewers = reviewers.filter(u => 
        u.tags && u.tags.some(t => tagList.includes(t.toLowerCase()))
      )
    }

    // 3. Filtrar por texto de búsqueda (?search=juan) (reemplaza los $regex de Mongo)
    if (search) {
      const s = search.toLowerCase()
      reviewers = reviewers.filter(u => 
        (u.nombres && u.nombres.toLowerCase().includes(s)) ||
        (u.apellido_paterno && u.apellido_paterno.toLowerCase().includes(s)) ||
        (u.email && u.email.toLowerCase().includes(s))
      )
    }

    res.json(reviewers.map(u => ({
      id: u.id.toString(),
      nombre: `${u.nombres} ${u.apellido_paterno} ${u.apellido_materno}`,
      email: u.email,
      organizacion: u.organizacion,
      tags: u.tags || [],
      keywords: u.keywords || []
    })))
  } catch (err) {
    console.error('Error fetching reviewers:', err)
    res.status(500).json({ error: 'Error al obtener revisores' })
  }
})

// ── GET /:id ──────────────────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id)
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' })
    }
    res.json({
      id: user.id.toString(),
      nombres: user.nombres,
      apellido_paterno: user.apellido_paterno,
      apellido_materno: user.apellido_materno,
      email: user.email,
      roles: user.roles,
      organizacion: user.organizacion,
      afiliaciones_previas: user.afiliaciones_previas || [],
      tags: user.tags || [],
      keywords: user.keywords || []
    })
  } catch (err) {
    console.error('Error fetching user by id:', err)
    res.status(500).json({ error: 'Error al obtener usuario' })
  }
})

// ── PUT /:id ──────────────────────────────────────────────────────────────────
// Modificar perfil del usuario desde la interfaz
router.put('/:id', async (req, res) => {
  try {
    const { nombres, apellido_paterno, apellido_materno, email, organizacion, tags, password } = req.body

    // Mantenemos intacta la lógica de compatibilidad multi-rol que programó tu compañero
    let roles = null
    if (Array.isArray(req.body.roles) && req.body.roles.length > 0) {
      roles = req.body.roles
    } else if (typeof req.body.roles === 'string') {
      roles = [req.body.roles]
    } else if (typeof req.body.rol === 'string') {
      roles = [req.body.rol]
    }

    // Buscamos con Sequelize
    const user = await User.findByPk(req.params.id)
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' })
    }

    // Mapeamos los campos exactamente igual
    if (nombres) user.nombres = nombres
    if (apellido_paterno) user.apellido_paterno = apellido_paterno
    if (apellido_materno) user.apellido_materno = apellido_materno
    if (email) user.email = email
    if (organizacion) user.organizacion = organizacion
    if (roles) user.roles = roles
    if (tags) user.tags = tags
    if (password) user.password = password

    // Guardamos los cambios en MariaDB
    await user.save()

    res.json({
      id: user.id.toString(),
      nombre: `${user.nombres} ${user.apellido_paterno} ${user.apellido_materno}`,
      email: user.email,
      roles: user.roles
    })
  } catch (err) {
    console.error('Error updating user:', err)
    res.status(500).json({ error: 'Error al actualizar usuario' })
  }
})

export default router