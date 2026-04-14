import mongoose from 'mongoose'

const authorSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  affiliation: { type: String, default: '' }
}, { _id: false })

const reviewerAssignmentSchema = new mongoose.Schema({
  reviewerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reviewerName: { type: String, default: '' },
  status: { 
    type: String, 
    enum: ['pendiente', 'aceptada', 'completada'],
    default: 'pendiente'
  },
  assignedAt: { type: Date, default: Date.now },
  deadline: { type: Date, default: null },
  completedAt: { type: Date, default: null },
  verdict: { type: String, default: null }
}, { _id: false })

const manuscriptSchema = new mongoose.Schema({
  title: { type: String, required: true },
  authors: { type: [authorSchema], required: true },
  description: { type: String, default: '' },
  tags: { type: [String], default: [] },
  pdfPath: { type: String, required: true },
  pdfName: { type: String, required: true },
  authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { 
    type: String, 
    enum: ['enviado', 'en_revision', 'decision', 'aceptado', 'rechazado'],
    default: 'enviado'
  },
  reviewers: { type: [reviewerAssignmentSchema], default: [] },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
})

manuscriptSchema.pre('save', function(next) {
  this.updatedAt = new Date()
  next()
})

export default mongoose.model('Manuscript', manuscriptSchema)