import express from 'express'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import pool from '../db.js'

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
  const { email, nombres, apellidoPaterno, apellidoMaterno, rol, organizacion, password } = req.body

  if (!email || !nombres || !apellidoPaterno || !apellidoMaterno || !rol || !organizacion || !password) {
    return res.status(400).json({ message: 'Todos los campos son requeridos' })
  }

  let conn
  try {
    conn = await pool.getConnection()
    const existingUser = await conn.query('SELECT id FROM usuarios WHERE email = ?', [email])
    
    if (existingUser && existingUser.length > 0) {
      return res.status(400).json({ message: 'El correo electrónico ya está registrado' })
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    await conn.query(
      `INSERT INTO usuarios (email, nombres, apellido_paterno, apellido_materno, rol, organizacion, password) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [email, nombres, apellidoPaterno, apellidoMaterno, rol, organizacion, hashedPassword]
    )

    res.status(201).json({ message: 'Usuario registrado exitosamente' })
  } catch (error) {
    console.error('Error en registro:', error)
    res.status(500).json({ message: 'Error al registrar usuario' })
  } finally {
    if (conn) conn.release()
  }
})

router.post('/login', async (req, res) => {
  const { email, password } = req.body

  if (!email || !password) {
    return res.status(400).json({ message: 'Correo y contraseña son requeridos' })
  }

  let conn
  try {
    conn = await pool.getConnection()
    const users = await conn.query('SELECT * FROM usuarios WHERE email = ?', [email])
    
    if (!users || users.length === 0) {
      return res.status(401).json({ message: 'Usuario no encontrado' })
    }

    const user = users[0]
    const validPassword = await bcrypt.compare(password, user.password)
    
    if (!validPassword) {
      return res.status(401).json({ message: 'Contraseña incorrecta' })
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, rol: user.rol },
      JWT_SECRET,
      { expiresIn: '24h' }
    )

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        nombres: user.nombres,
        apellidoPaterno: user.apellido_paterno,
        apellidoMaterno: user.apellido_materno,
        rol: user.rol,
        organizacion: user.organizacion
      }
    })
  } catch (error) {
    console.error('Error en login:', error)
    res.status(500).json({ message: 'Error al iniciar sesión' })
  } finally {
    if (conn) conn.release()
  }
})

router.get('/me', async (req, res) => {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No autorizado' })
  }

  const token = authHeader.split(' ')[1]

  let conn
  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    conn = await pool.getConnection()
    const users = await conn.query('SELECT id, email, nombres, apellido_paterno, apellido_materno, rol, organizacion FROM usuarios WHERE id = ?', [decoded.id])
    
    if (!users || users.length === 0) {
      return res.status(401).json({ message: 'Usuario no encontrado' })
    }

    const user = users[0]
    res.json({
      user: {
        id: user.id,
        email: user.email,
        nombres: user.nombres,
        apellidoPaterno: user.apellido_paterno,
        apellidoMaterno: user.apellido_materno,
        rol: user.rol,
        organizacion: user.organizacion
      }
    })
  } catch (error) {
    console.error('Error en /me:', error)
    res.status(401).json({ message: 'Token inválido' })
  } finally {
    if (conn) conn.release()
  }
})

export default router
