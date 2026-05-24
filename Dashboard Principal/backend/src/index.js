import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import path from 'path'
import authRoutes from './routes/auth.js'
import manuscriptRoutes from './routes/manuscripts.js'
import userRoutes from './routes/users.js'
import commentRoutes from './routes/comments.js'
import matchingRoutes from './routes/matching.js'
import pool from './db.js'
import mongoose from 'mongoose'
import { connectDB } from './mariadb.js'

await connectDB()

const app = express()
const PORT = process.env.PORT || 3000
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/peer_review'

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB conectado exitosamente (Arquitectura Híbrida)')
  })
  .catch(err => {
    console.error('❌ ERROR CRÍTICO: No se pudo conectar a MongoDB.')
    console.error('Asegúrate de que MongoDB esté corriendo en:', MONGO_URI)
    console.error('Detalle:', err.message)
  })

app.use(cors())
app.use(express.json())

app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')))

app.use('/api/auth', authRoutes)
app.use('/api/manuscripts', manuscriptRoutes)
app.use('/api/users', userRoutes)
app.use('/api/comments', commentRoutes)
app.use('/api/matching', matchingRoutes)

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' })
})

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
