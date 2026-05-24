import { DataTypes } from 'sequelize';
import { sequelize } from '../mariadb.js'; // Ajusta la ruta si mariadb.js está en otra carpeta

export const User = sequelize.define('User', {
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  nombres: { type: DataTypes.STRING, allowNull: false },
  apellido_paterno: { type: DataTypes.STRING, allowNull: false },
  apellido_materno: { type: DataTypes.STRING, allowNull: false },
  
  roles: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: ['autor']
  },
  
  organizacion: { type: DataTypes.STRING, allowNull: false },
  
  afiliaciones_previas: {
    type: DataTypes.JSON,
    defaultValue: []
  },
  
  tags: { type: DataTypes.JSON, defaultValue: [] },
  keywords: { type: DataTypes.JSON, defaultValue: [] },
  embedding: { type: DataTypes.JSON, defaultValue: null },
  password: { type: DataTypes.STRING, allowNull: false },
  
  invitations: {
    type: DataTypes.JSON,
    defaultValue: []
  }
}, {
  timestamps: true
});

User.prototype.getRolePriority = function() {
  const ROLE_PRIORITY = ['admin', 'editor_jefe', 'editor_seccion', 'revisor', 'autor'];
  const roles = this.roles || [];
  return roles.reduce((highest, current) => {
    return ROLE_PRIORITY.indexOf(current) < ROLE_PRIORITY.indexOf(highest) ? current : highest;
  }, roles[0] || 'autor');
};

export default User;