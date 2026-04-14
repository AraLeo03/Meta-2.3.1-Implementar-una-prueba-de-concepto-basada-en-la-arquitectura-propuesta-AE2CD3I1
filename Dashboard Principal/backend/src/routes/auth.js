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

router.post('/register', async (req, res) => {
  const { email, nombres, apellidoPaterno, apellidoMaterno, rol, organizacion, password, tags } = req.body

  if (!email || !nombres || !apellidoPaterno || !apellidoMaterno || !rol || !organizacion || !password) {
    return res.status(400).json({ message: 'Todos los campos son requeridos' })
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
      rol,
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

    const token = jwt.sign(
      { id: user._id.toString(), email: user.email, rol: user.rol },
      JWT_SECRET,
      { expiresIn: '24h' }
    )

    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        nombres: user.nombres,
        apellidoPaterno: user.apellido_paterno,
        apellidoMaterno: user.apellido_materno,
        rol: user.rol,
        organizacion: user.organizacion,
        tags: user.tags
      }
    })
  } catch (error) {
    console.error('Error en login:', error)
    res.status(500).json({ message: 'Error al iniciar sesión' })
  }
})

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

    res.json({
      user: {
        id: user._id,
        email: user.email,
        nombres: user.nombres,
        apellidoPaterno: user.apellido_paterno,
        apellidoMaterno: user.apellido_materno,
        rol: user.rol,
        organizacion: user.organizacion,
        tags: user.tags
      }
    })
  } catch (error) {
    console.error('Error en /me:', error)
    res.status(401).json({ message: 'Token inválido' })
  }
})

export default router
