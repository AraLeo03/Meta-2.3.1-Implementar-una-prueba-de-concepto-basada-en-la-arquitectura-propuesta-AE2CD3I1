import mongoose from 'mongoose'

const commentSchema = new mongoose.Schema({
  manuscriptId: { type: mongoose.Schema.Types.ObjectId, ref: 'Manuscript', required: true },
  authorId: { type: String, required: true },
  reviewerId: { type: String, required: true },
  senderId: { type: String, required: true },
  senderName:   { type: String, required: true },
  senderRole:   { type: String, enum: ['autor', 'revisor'], required: true },
  text:         { type: String, required: true },
  readBy: { type: [String], default: [] },
  createdAt:    { type: Date, default: Date.now }
})

export default mongoose.model('Comment', commentSchema)
