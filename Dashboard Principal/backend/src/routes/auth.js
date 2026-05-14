import express from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import pool from '../db.js'
import User from '../models/User.js'

const router = express.Router()
const JWT_SECRET = process.env.JWT_SECRET || 'peer-review-secret-key-2024'

async function queryDB(sql, params = []) {
  let conn
  try {
    conn = await pool.getConnection()
    const result = await conn.query(sql, params)
    return result
  } finally {
    if (conn) conn.release()
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Normaliza el campo de roles: acepta tanto `roles` (array nuevo)
 * como `rol` (string legado) para mantener compatibilidad con clientes
 * que todavía envíen el campo antiguo.
 */
function parseRoles(body) {
  if (Array.isArray(body.roles) && body.roles.length > 0) return body.roles
  if (typeof body.roles === 'string') return [body.roles]
  if (typeof body.rol === 'string') return [body.rol]  // compatibilidad legada
  return null
}

/**
 * Formatea un documento User para la respuesta JSON.
 * Siempre devuelve `roles` (array). Incluye `rol` como alias
 * del rol primario para no romper clientes antiguos.
 */
function formatUser(user) {
  const ROLE_PRIORITY = ['admin', 'editor_jefe', 'editor_seccion', 'revisor', 'autor']
  const primaryRole = ROLE_PRIORITY.find(r => user.roles.includes(r)) || user.roles[0]
  return {
    id: user._id,
    email: user.email,
    nombres: user.nombres,
    apellidoPaterno: user.apellido_paterno,
    apellidoMaterno: user.apellido_materno,
    roles: user.roles,          // ← nuevo campo (array)
    rol: primaryRole,           // ← alias legado (rol de mayor prioridad)
    organizacion: user.organizacion,
    tags: user.tags
  }
}

// ── POST /register ────────────────────────────────────────────────────────────

router.post('/register', async (req, res) => {
  const { email, nombres, apellidoPaterno, apellidoMaterno, organizacion, password, tags } = req.body

  const roles = parseRoles(req.body)

  if (!email || !nombres || !apellidoPaterno || !apellidoMaterno || !roles || !organizacion || !password) {
    return res.status(400).json({ message: 'Todos los campos son requeridos' })
  }

  const validRoles = ['autor', 'revisor', 'editor_seccion', 'editor_jefe', 'admin']
  const invalidRoles = roles.filter(r => !validRoles.includes(r))
  if (invalidRoles.length > 0) {
    return res.status(400).json({ message: `Roles inválidos: ${invalidRoles.join(', ')}` })
  }

  try {
    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return res.status(400).json({ message: 'El correo electrónico ya está registrado' })
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const newUser = new User({
      email,
      nombres,
      apellido_paterno: apellidoPaterno,
      apellido_materno: apellidoMaterno,
      roles,               // ← array de roles
      organizacion,
      tags: tags || [],
      password: hashedPassword
    })

    await newUser.save()

    res.status(201).json({ message: 'Usuario registrado exitosamente' })
  } catch (error) {
    console.error('Error en registro:', error)
    res.status(500).json({ message: 'Error al registrar usuario' })
  }
})

// ── POST /login ───────────────────────────────────────────────────────────────

router.post('/login', async (req, res) => {
  const { email, password } = req.body

  if (!email || !password) {
    return res.status(400).json({ message: 'Correo y contraseña son requeridos' })
  }

  try {
    const user = await User.findOne({ email })
    if (!user) {
      return res.status(401).json({ message: 'Usuario no encontrado' })
    }

    const validPassword = await bcrypt.compare(password, user.password)
    if (!validPassword) {
      return res.status(401).json({ message: 'Contraseña incorrecta' })
    }

    // El JWT incluye `roles` (array) y `rol` (rol primario) para compatibilidad
    const ROLE_PRIORITY = ['admin', 'editor_jefe', 'editor_seccion', 'revisor', 'autor']
    const primaryRole = ROLE_PRIORITY.find(r => user.roles.includes(r)) || user.roles[0]

    const token = jwt.sign(
      {
        id: user._id.toString(),
        email: user.email,
        roles: user.roles,   // ← nuevo
        rol: primaryRole     // ← alias legado
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    )

    res.json({ token, user: formatUser(user) })
  } catch (error) {
    console.error('Error en login:', error)
    res.status(500).json({ message: 'Error al iniciar sesión' })
  }
})

// ── GET /me ───────────────────────────────────────────────────────────────────

router.get('/me', async (req, res) => {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No autorizado' })
  }

  const token = authHeader.split(' ')[1]

  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    const user = await User.findById(decoded.id).select('-password')

    if (!user) {
      return res.status(401).json({ message: 'Usuario no encontrado' })
    }

    res.json({ user: formatUser(user) })
  } catch (error) {
    console.error('Error en /me:', error)
    res.status(401).json({ message: 'Token inválido' })
  }
})

export default router
