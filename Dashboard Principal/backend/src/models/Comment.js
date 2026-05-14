import mongoose from 'mongoose'

const commentSchema = new mongoose.Schema({
  manuscriptId: { type: mongoose.Schema.Types.ObjectId, ref: 'Manuscript', required: true },
  authorId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reviewerId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  senderId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  senderName:   { type: String, required: true },
  senderRole:   { type: String, enum: ['autor', 'revisor'], required: true },
  text:         { type: String, required: true },
  readBy:       { type: [mongoose.Schema.Types.ObjectId], default: [] }, // IDs que ya lo leyeron
  createdAt:    { type: Date, default: Date.now }
})

export default mongoose.model('Comment', commentSchema)
