import mongoose from 'mongoose'

const invitationSchema = new mongoose.Schema({
  manuscriptId: { type: mongoose.Schema.Types.ObjectId, ref: 'Manuscript', required: true },
  manuscriptTitle: { type: String, required: true },
  assignedAt: { type: Date, default: Date.now },
  status: { type: String, enum: ['pendiente', 'aceptada', 'rechazada'], default: 'pendiente' }
}, { _id: true })

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  nombres: { type: String, required: true },
  apellido_paterno: { type: String, required: true },
  apellido_materno: { type: String, required: true },
  rol: { type: String, enum: ['autor', 'revisor', 'editor_seccion', 'editor_jefe', 'admin'], required: true },
  organizacion: { type: String, required: true },
  tags: { type: [String], default: [] },
  password: { type: String, required: true },
  invitations: { type: [invitationSchema], default: [] },
  createdAt: { type: Date, default: Date.now }
})

export default mongoose.model('User', userSchema)