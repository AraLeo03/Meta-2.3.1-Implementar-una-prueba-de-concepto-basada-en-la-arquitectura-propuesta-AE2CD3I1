/**
 * migrate-roles.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Script de migración ONE-TIME para convertir el campo `rol` (String) al
 * nuevo campo `roles` (Array) en todos los usuarios existentes de MongoDB.
 *
 * Ejecución:
 *   node migrate-roles.js
 *
 * Requiere que MONGO_URI esté definida como variable de entorno, o edita
 * directamente la constante MONGO_URI más abajo.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import mongoose from 'mongoose'

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/peer-review'

async function migrate() {
  await mongoose.connect(MONGO_URI)
  console.log('✅ Conectado a MongoDB:', MONGO_URI)

  const db = mongoose.connection.db
  const collection = db.collection('users')

  // 1. Busca usuarios que todavía tengan `rol` como string y no tengan `roles`
  const usersToMigrate = await collection
    .find({ rol: { $exists: true, $type: 'string' }, roles: { $exists: false } })
    .toArray()

  console.log(`📋 Usuarios a migrar: ${usersToMigrate.length}`)

  if (usersToMigrate.length === 0) {
    console.log('ℹ️  No hay usuarios que migrar. Puede que la migración ya se haya ejecutado.')
    await mongoose.disconnect()
    return
  }

  let migrated = 0
  let errors = 0

  for (const user of usersToMigrate) {
    try {
      await collection.updateOne(
        { _id: user._id },
        {
          $set: { roles: [user.rol] },   // convierte el string a array de un elemento
          $unset: { rol: '' }             // elimina el campo antiguo
        }
      )
      console.log(`  ✔ ${user.email} → roles: ["${user.rol}"]`)
      migrated++
    } catch (err) {
      console.error(`  ✘ Error migrando ${user.email}:`, err.message)
      errors++
    }
  }

  console.log(`\n🎉 Migración completa: ${migrated} migrados, ${errors} errores.`)

  // 2. Verifica que no queden usuarios sin `roles`
  const remaining = await collection.countDocuments({
    $or: [
      { roles: { $exists: false } },
      { roles: { $size: 0 } }
    ]
  })

  if (remaining > 0) {
    console.warn(`⚠️  Aún hay ${remaining} usuarios sin campo "roles". Revísalos manualmente.`)
  } else {
    console.log('✅ Todos los usuarios tienen el campo "roles" correctamente.')
  }

  await mongoose.disconnect()
}

migrate().catch(err => {
  console.error('Error fatal en migración:', err)
  process.exit(1)
})
