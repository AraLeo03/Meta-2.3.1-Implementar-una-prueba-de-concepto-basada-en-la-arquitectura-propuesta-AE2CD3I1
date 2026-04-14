import express from 'express'
import cors from 'cors'
import path from 'path'
import authRoutes from './routes/auth.js'
import manuscriptRoutes from './routes/manuscripts.js'
import userRoutes from './routes/users.js'
import pool from './db.js'
import { connectMongo } from './mongo.js'

await connectMongo()

const app = express()
const PORT = process.env.PORT || 3000

app.use(cors())
app.use(express.json())

app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')))

app.use('/api/auth', authRoutes)
app.use('/api/manuscripts', manuscriptRoutes)
app.use('/api/users', userRoutes)

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' })
})

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
