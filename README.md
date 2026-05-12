# HojaDeVida

Aplicación web para gestión y generación de hojas de vida. Permite a usuarios registrarse, diligenciar su información personal, académica y laboral, y exportar su hoja de vida en PDF.

## Características

- Registro con verificación por vereda y junta de presidentes
- Autenticación segura (Passport.js + bcrypt)
- Diligenciamiento de hoja de vida:
  - Datos personales y de contacto
  - Educación básica/media y superior
  - Experiencia laboral (sector público, privado e independiente)
  - Idiomas
- Subida de documentos soporte (PDF/imagen) por sección
- Foto de perfil
- Generación de PDF de la hoja de vida
- Panel de administrador para listar personas registradas
- Protección: Helmet, CSRF, rate limiting, XSS clean, sanitización

## Stack

| Capa | Tecnología |
|---|---|
| Servidor | Node.js + Express 4 |
| Plantillas | Handlebars (express-handlebars) |
| Base de datos | MySQL 2 |
| Sesiones | express-session + express-mysql-session |
| Auth | Passport.js (local strategy) |
| Archivos | Multer |
| PDF | pdfmake + pdf-lib |

## Requisitos

- Node.js ≥ 16
- MySQL ≥ 5.7

## Instalación

```bash
git clone <repo>
cd HojaDeVida
npm install
```

Crear la base de datos:

```bash
mysql -u root -p < db/init.sql
```

Configurar variables de entorno:

```bash
cp .env.example .env   # o crear .env manualmente
```

`.env` mínimo:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=tu_password
DB_NAME=hoja_de_vida
DB_CONN_LIMIT=10
PORT=4000
NODE_ENV=development
SESSION_SECRET=cadena_secreta_larga
```

## Ejecución

```bash
# Desarrollo (con hot-reload)
npm run dev

# Producción
npm start
```

Servidor disponible en `http://localhost:4000`.

## Rutas principales

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/signup` | Formulario de registro |
| GET | `/signin` | Inicio de sesión |
| GET | `/logout` | Cerrar sesión |
| GET | `/hoja/add` | Formulario de hoja de vida |
| POST | `/hoja/insertar-datos` | Guardar / actualizar datos |
| GET | `/hoja/view/:id` | Ver hoja de vida |
| GET | `/hoja/generar-pdf` | Descargar PDF propio |
| GET | `/hoja/generar-pdf/:id` | Descargar PDF por ID (admin) |
| GET | `/hoja/list` | Listar personas (admin) |

## Estructura del proyecto

```
HojaDeVida/
├── db/
│   └── init.sql              # Schema de la base de datos
├── src/
│   ├── config/               # Constantes y validación de variables de entorno
│   ├── controllers/          # Lógica de rutas (hojaController)
│   ├── lib/                  # Auth helpers, multer, passport config
│   ├── repositories/         # Queries SQL (hojaRepository)
│   ├── routes/               # Express routers
│   ├── services/             # Lógica de negocio (hojaService)
│   ├── validators/           # express-validator middleware
│   ├── views/                # Plantillas Handlebars
│   ├── public/               # Archivos estáticos (JS, CSS)
│   └── index.js              # Entry point
├── .env                      # Variables de entorno (no commitear)
└── package.json
```

## Notas de producción

- Cambiar `NODE_ENV=production` activa cookies seguras y `trust proxy`.
- Los documentos subidos se sirven desde `/docs`; en producción usar CDN o ruta protegida.
- Definir `SESSION_SECRET` con una cadena aleatoria larga.
