# PeerReview AI

Sistema de Revisión por Pares - Panel principal con arquitectura Multi-SPA usando Vue 3, Vue Router y Pinia.

## Requisitos

- Node.js 18+ 
- npm 9+
- Docker Desktop (opcional, ver sección Docker)
- MariaDB 10+ (si no usas Docker)

## Instalación

```bash
# Entrar al directorio del proyecto
cd "Dashboard Principal"

# Instalar dependencias
npm install
```

## Ejecución con Docker (Recomendado)

Esta es la forma más fácil de ejecutar el proyecto sin instalar MariaDB ni Node.js localmente.

### Primeros pasos

1. Instala **Docker Desktop** desde https://www.docker.com/products/docker-desktop/ (Windows AMD64)
2. Asegúrate de que Docker esté corriendo (icono en la barra de tareas)

### Iniciar el proyecto

```bash
# En la raíz del proyecto
docker-compose up -d
```

Esto levantará:
- **MariaDB** en puerto 3306
- **Backend** en puerto 3000
- **Frontend** en puerto 5173

Abre http://localhost:5173 en tu navegador.

### ¿Qué hacer si modificas el proyecto?

Si haces cambios en el código, reconstruye las imágenes:

```bash
# Reconstruir todo
docker-compose up -d --build

# Reconstruir solo frontend
docker-compose up -d --build frontend

# Reconstruir solo backend
docker-compose up -d --build backend
```

Para ver cambios en vivo, también puedes usar volúmenes montados:

```yaml
#Agregar en docker-compose.yml bajo frontend:
volumes:
  - .:/app
  - /app/node_modules
```

### ¿Cómo evitar perder los datos?

Los datos se almacenan en un volumen named volume llamado `db_data`. Para mantenerlos:

**Detener servicios sin perder datos:**
```bash
docker-compose down
```

**PERDER DATOS - NO uses el flag -v:**
```bash
docker-compose down -v  # ESTO ELIMINA TODOS LOS DATOS
```

**Ver logs:**
```bash
docker-compose logs -f
docker-compose logs -f backend
docker-compose logs -f frontend
```

### Comandos útiles

```bash
# Ver estado de los contenedores
docker-compose ps

# Detener servicios
docker-compose stop

# Iniciar servicios detenidos
docker-compose start

# Reiniciar un servicio específico
docker-compose restart backend

# Acceder a la base de datos
docker-compose exec db mysql -u root -p peer_review
```

---

## Ejecución sin Docker (Local)

### Requisitos

- Node.js 18+
- MariaDB 10+

### Instalación

```bash
# Frontend
cd "Dashboard Principal"
npm install

# Backend
cd backend
npm install
```

### Configuración de MariaDB

Para ejecutar sin Docker, necesitas tener MariaDB instalado localmente.

#### Opción 1: Desde VS Code con extensión MySQL

1. Instala la extensión **MySQL** o **MariaDB** en VS Code
2. Abre el panel de MySQL en la barra lateral
3. Conecta a tu servidor MariaDB:
   - Host: `localhost`
   - Port: `3306`
   - User: `root`
   - Password: `(tu contraseña de MariaDB)`
4. Haz clic derecho en la conexión → "Run SQL File"
5. Selecciona el archivo `backend/database.sql`

#### Opción 2: Desde terminal/MySQL Workbench

1. Abre MySQL Workbench o terminal
2. Conecta a tu servidor MariaDB
3. Abre el archivo `backend/database.sql`
4. Ejecútalo o impórtalo

#### Opción 3: Desde terminal

```bash
mysql -u root -p < "ruta/al/archivo/database.sql"
```

### Configuración del backend

Crea el archivo `.env` en `backend/` con tus credenciales:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=tu_contraseña
DB_NAME=peer_review
JWT_SECRET=peer-review-secret-key
PORT=3000
```

### Ejecución

**Terminal 1 - Backend:**
```bash
cd backend
npm start
```

**Terminal 2 - Frontend:**
```bash
cd "Dashboard Principal"
npm run dev
```

Abre http://localhost:5173 en tu navegador.

## Scripts disponibles

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Inicia el servidor de desarrollo |
| `npm run build` | Genera la versión de producción en `/dist` |
| `npm run preview` | Previsualiza la versión de producción |

## Estructura del proyecto

```
Dashboard Principal/
├── src/
│   ├── main.js              # Punto de entrada
│   ├── App.vue             # Componente principal
│   ├── style.css           # Estilos globales
│   ├── router/
│   │   └── index.js        # Configuración de rutas
│   ├── shared/
│   │   ├── components/     # Componentes reutilizables
│   │   │   ├── BaseModal.vue
│   │   │   ├── DeadlineBar.vue
│   │   │   ├── InvitationCard.vue
│   │   │   └── ToastContainer.vue
│   │   └── stores/         # Pinia stores
│   │       └── appStore.js
│   └── views/              # Vistas/Dashboards
│       ├── HomeView.vue
│       ├── AuthorDashboard.vue
│       ├── ReviewerDashboard.vue
│       ├── SectionEditorDashboard.vue
│       ├── ChiefEditorDashboard.vue
│       └── AdminDashboard.vue
├── package.json
├── vite.config.js
└── index.html
```

## Rutas disponibles

| Ruta | Dashboard |
|------|----------|
| `/login` | Login y Registro de usuarios |
| `/` | Selector de roles (requiere autenticación) |
| `/autor` | Dashboard del Autor |
| `/revisor` | Dashboard del Revisor |
| `/editor-seccion` | Dashboard del Editor de Sección |
| `/editor-jefe` | Dashboard del Editor Jefe |
| `/admin` | Dashboard del Administrador |

## Autenticación

El sistema incluye:
- **Registro de usuarios**: Correo, nombres, apellido paterno/materno, rol, organización y contraseña
- **Login**: Autenticación con correo y contraseña
- **Roles disponibles**: Autor, Revisor, Editor de Sección, Editor Jefe, Administrador
- **Cierre de sesión**: Limpia la sesión del usuario

## Roles y funcionalidades

- **Autor**: Gestiona manuscritos, envía nuevos artículos
- **Revisor**: Revisa invitaciones y gestiona revisiones
- **Editor de Sección**: Administra manuscritos y asigna revisores
- **Editor Jefe**: Supervisa flujo editorial y métricas
- **Administrador**: Gestiona usuarios y configuración del sistema
