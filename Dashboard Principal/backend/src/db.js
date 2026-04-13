import { createPool } from 'mariadb'

const pool = createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: 'LeoCra',
  database: process.env.DB_NAME || 'peer_review',
  connectionLimit: 1,
  connectTimeout: 10000,
  acquireTimeout: 10000
})

export default pool
