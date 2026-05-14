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
  // ── MULTI-ROL: se reemplaza `rol` (String) por `roles` (Array) ──────────
  roles: {
    type: [String],
    enum: ['autor', 'revisor', 'editor_seccion', 'editor_jefe', 'admin'],
    required: true,
    validate: {
      validator: v => Array.isArray(v) && v.length > 0,
      message: 'El usuario debe tener al menos un rol'
    }
  },
  // ────────────────────────────────────────────────────────────────────────
  organizacion: { type: String, required: true },
  tags: { type: [String], default: [] },
  password: { type: String, required: true },
  invitations: { type: [invitationSchema], default: [] },
  createdAt: { type: Date, default: Date.now }
})

// Helper virtual: devuelve el rol de mayor prioridad (útil en el backend)
const ROLE_PRIORITY = ['admin', 'editor_jefe', 'editor_seccion', 'revisor', 'autor']
userSchema.virtual('primaryRole').get(function () {
  return ROLE_PRIORITY.find(r => this.roles.includes(r)) || this.roles[0]
})

export default mongoose.model('User', userSchema)
