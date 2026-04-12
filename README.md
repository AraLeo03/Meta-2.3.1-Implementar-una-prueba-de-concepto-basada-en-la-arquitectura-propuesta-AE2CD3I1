# PeerReview AI

Sistema de Revisión por Pares - Panel principal con arquitectura Multi-SPA usando Vue 3, Vue Router y Pinia.

## Requisitos

- Node.js 18+ 
- npm 9+

## Instalación

```bash
# Entrar al directorio del proyecto
cd "Dashboard Principal"

# Instalar dependencias
npm install
```

## Ejecutar en desarrollo

```bash
npm run dev
```

Abre el navegador en: [http://localhost:5173](http://localhost:5173)

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
| `/` | Selector de roles |
| `/autor` | Dashboard del Autor |
| `/revisor` | Dashboard del Revisor |
| `/editor-seccion` | Dashboard del Editor de Sección |
| `/editor-jefe` | Dashboard del Editor Jefe |
| `/admin` | Dashboard del Administrador |

## Roles y funcionalidades

- **Autor**: Gestiona manuscritos, envía nuevos artículos
- **Revisor**: Revisa invitaciones y gestiona revisiones
- **Editor de Sección**: Administra manuscritos y asigna revisores
- **Editor Jefe**: Supervisa flujo editorial y métricas
- **Administrador**: Gestiona usuarios y configuración del sistema
