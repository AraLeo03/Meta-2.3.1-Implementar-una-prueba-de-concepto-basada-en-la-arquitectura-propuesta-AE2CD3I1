import express from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import User from '../models/User.js'

const router = express.Router()
const JWT_SECRET = process.env.JWT_SECRET || 'peer-review-secret-key-2024'

// ── HELPERS ──────────────────────────────────────────────────────────────────

function parseRoles(body) {
  if (Array.isArray(body.roles) && body.roles.length > 0) return body.roles
  if (typeof body.roles === 'string') return [body.roles]
  if (typeof body.rol === 'string') return [body.rol]
  return ['autor']
}

function formatUser(user) {
  try {
    const ROLE_PRIORITY = ['admin', 'editor_jefe', 'editor_seccion', 'revisor', 'autor']
    const rolesArray = Array.isArray(user.roles) ? user.roles : []
    const primaryRole = ROLE_PRIORITY.find(r => rolesArray.includes(r)) || (rolesArray[0] || 'autor')

    return {
      id: user.id.toString(),
      email: user.email,
      nombres: user.nombres,
      apellido_paterno: user.apellido_paterno,
      apellido_materno: user.apellido_materno,
      nombre: `${user.nombres} ${user.apellido_paterno} ${user.apellido_materno}`,
      roles: rolesArray,
      rol: primaryRole,
      organizacion: user.organizacion,
      tags: user.tags || [],
      afiliaciones_previas: user.afiliaciones_previas || []
    }
  } catch (err) {
    console.error('Error formateando usuario:', err)
    return { email: user.email, id: user.id }
  }
}

// ── RUTAS ─────────────────────────────────────────────────────────────────────

// POST /register
router.post('/register', async (req, res) => {
  console.log('>>> [AUTH] Intento de registro para:', req.body.email)
  
  try {
    const { 
      email, password, nombres, organizacion, 
      apellido_paterno, apellidoPaterno, 
      apellido_materno, apellidoMaterno 
    } = req.body

    const final_ap_paterno = apellido_paterno || apellidoPaterno
    const final_ap_materno = apellido_materno || apellidoMaterno
    const roles = parseRoles(req.body)

    // Validación de seguridad
    if (!email || !password || !nombres || !final_ap_paterno || !organizacion) {
      console.warn('>>> [AUTH] Registro rechazado: Faltan campos')
      return res.status(400).json({ message: 'Faltan campos obligatorios' })
    }

    // Búsqueda de usuario existente
    const existingUser = await User.findOne({ where: { email } })
    if (existingUser) {
      return res.status(400).json({ message: 'El correo ya está registrado' })
    }

    // Hash
    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(password, salt)

    // Inserción en DB
    console.log('>>> [AUTH] Intentando crear registro en MariaDB...')
    const newUser = await User.create({
      email,
      password: hashedPassword,
      nombres,
      apellido_paterno: final_ap_paterno,
      apellido_materno: final_ap_materno || '',
      organizacion,
      roles,
      afiliaciones_previas: [],
      tags: [],
      keywords: []
    })

    console.log('>>> [AUTH] Registro exitoso para:', email)
    return res.status(201).json({
      message: 'Usuario registrado exitosamente',
      user: formatUser(newUser)
    })

  } catch (error) {
    // ESTO ES LO MÁS IMPORTANTE: Ver el error real en la terminal
    console.error('!!! [AUTH] ERROR FATAL EN REGISTRO:', error)
    
    // Si el error es de Sequelize, suele traer más detalles en 'parent' o 'original'
    const detail = error.parent || error.original || error
    console.error('Detalles del error:', detail)

    return res.status(500).json({ 
      message: 'Error interno en el servidor',
      dev_details: error.message 
    })
  }
})

// POST /login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body
    const user = await User.findOne({ where: { email } })
    
    if (!user) return res.status(401).json({ message: 'Usuario no encontrado' })

    const validPassword = await bcrypt.compare(password, user.password)
    if (!validPassword) return res.status(401).json({ message: 'Contraseña incorrecta' })

    const token = jwt.sign(
      { id: user.id.toString(), email: user.email, roles: user.roles },
      JWT_SECRET,
      { expiresIn: '24h' }
    )

    res.json({ token, user: formatUser(user) })
  } catch (error) {
    console.error('Error en login:', error)
    res.status(500).json({ message: 'Error al iniciar sesión' })
  }
})

// GET /me
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ message: 'No autorizado' })
    
    const token = authHeader.split(' ')[1]
    const decoded = jwt.verify(token, JWT_SECRET)
    const user = await User.findByPk(decoded.id)

    if (!user) return res.status(401).json({ message: 'Usuario no encontrado' })
    res.json({ user: formatUser(user) })
  } catch (error) {
    res.status(401).json({ message: 'Sesión expirada' })
  }
})

export default router