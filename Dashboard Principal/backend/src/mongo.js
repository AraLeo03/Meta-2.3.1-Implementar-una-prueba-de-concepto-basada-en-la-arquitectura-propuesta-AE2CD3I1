import mongoose from 'mongoose'

const mongoUri = `mongodb://${process.env.MONGO_USER || 'root'}:${process.env.MONGO_PASSWORD || 'LeoCra'}@${process.env.MONGO_HOST || 'localhost'}:27017`

export async function connectMongo() {
  try {
    await mongoose.connect(mongoUri, {
      dbName: process.env.MONGO_DB || 'peer_review'
    })
    console.log('MongoDB connected')
  } catch (err) {
    console.error('MongoDB connection error:', err.message)
    process.exit(1)
  }
}

export default mongoose