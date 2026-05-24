import { Sequelize } from 'sequelize';

// Configuramos la conexión leyendo tu .env
export const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    dialect: 'mariadb',
    logging: false, // Para que no llene la consola de texto innecesario
  }
);

export async function connectDB() {
  try {
    await sequelize.authenticate();
    console.log('MariaDB conectado exitosamente');
    
    // Esto es magia pura: Crea las tablas automáticamente si no existen
    await sequelize.sync({ alter: true }); 
    console.log('Tablas sincronizadas en MariaDB');
  } catch (error) {
    console.error('Error conectando a MariaDB:', error.message);
    process.exit(1);
  }
}