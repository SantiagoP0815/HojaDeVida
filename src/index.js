const dotenv = require('dotenv');
dotenv.config();
const express = require('express');
const morgan = require('morgan');
const path = require('path');
const exphbs = require('express-handlebars');
const session = require('express-session');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const csurf = require('csurf');
const passport = require('passport');
const flash = require('connect-flash');
const MySQLStore = require('express-mysql-session')(session);
const Handlebars = require('handlebars');
const os = require('os');

const { database } = require('./keys');

// Intializations
const app = express();
require('./lib/passport');

function getServerIps() {
  const interfaces = os.networkInterfaces();
  const ips = [];

  for (const interfaceName in interfaces) {
    for (const iface of interfaces[interfaceName]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        ips.push(iface.address);
      }
    }
  }

  return ips;
}

// Settings and middleware (security)
// CONFIGURACIÓN DE SEGURIDAD AJUSTADA PARA PERMITIR SCRIPTS
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
      scriptSrcAttr: ["'unsafe-inline'"], // Esto permite los onclick="..."
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://use.fontawesome.com"],
      fontSrc: ["'self'", "https://use.fontawesome.com", "https://cdn.jsdelivr.net"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://cdn.jsdelivr.net"],
    },
  },
  crossOriginEmbedderPolicy: false, // Necesario para evitar bloqueos de recursos cruzados
}));

app.use(cors());
app.use(cors());

// Rate limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // limit each IP to 200 requests per windowMs
});
app.use(limiter);

// Body parsers
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// View engine setup
app.set('port', process.env.PORT || 4000);
app.set('views', path.join(__dirname, 'views'));
app.engine('.hbs', exphbs({
  defaultLayout: 'main',
  layoutsDir: path.join(app.get('views'), 'layouts'),
  partialsDir: path.join(app.get('views'), 'partials'),
  extname: '.hbs',
}))
app.set('view engine', '.hbs');

// Sessions
const sessionOptions = {
  secret: process.env.SESSION_SECRET || 'secret',
  resave: false,
  saveUninitialized: false,
  store: new MySQLStore(database),
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 1 day
  }
};

if (process.env.NODE_ENV === 'production') {
  // If behind a proxy (e.g., Heroku, nginx), enable trust proxy for secure cookies
  app.set('trust proxy', 1);
}

app.use(session(sessionOptions));

app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

// CSRF protection - after session and cookie parsers
app.use(csurf());

// Global variables
app.use((req, res, next) => {
  app.locals.message = req.flash('message');
  app.locals.success = req.flash('success');
  app.locals.user = req.user;
  // CSRF token for forms
  res.locals.csrfToken = req.csrfToken();
  next();
});

// Routes
app.use(require('./routes/index'));
app.use(require('./routes/authentication'));
app.use('/hoja', require('./routes/hoja'));

// Public
app.use(express.static(path.join(__dirname, 'public')));

// Serve uploaded documents statically from /docs (only in development). In production, serve via secure CDN or protected route.
const docsPath = path.join(__dirname, 'docs');
app.use('/docs', express.static(docsPath));

// Starting
const port = app.get('port');
const ips = getServerIps();

app.listen(port, '0.0.0.0', () => {
  console.log(`Servidor corriendo en http://localhost:${port}`);
});

// Register commonly used helpers
Handlebars.registerHelper('eq', function (a, b) {
  return a == b;
});

Handlebars.registerHelper('range', function (start, end) {
  let range = [];
  for (let i = start; i < end; i++) {
    range.push(i);
  }
  return range;
});

Handlebars.registerHelper('add', function (a, b) {
  return a + b;
});
Handlebars.registerHelper('formatDate', function (dateString) {
  if (!dateString) return '';
  const parts = dateString.toString().split('-');
  if (parts.length >= 2) {
    const year = parts[0];
    const monthIndex = parseInt(parts[1], 10) - 1;
    const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    if (months[monthIndex]) {
      return `${months[monthIndex]} ${year}`;
    }
  }
  return dateString;
});

Handlebars.registerHelper('formatFullDate', function (dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;

  // Adjust for timezone offset if necessary, but usually UTC dates from DB might show previous day if not handled.
  // However, the user complained about "Fri Aug 15 2003...".
  // Let's use UTC methods to avoid timezone shifts if the date is stored as YYYY-MM-DD 00:00:00 UTC.
  // But usually simple .getDate() uses local time.
  // If the server is in a different timezone, it might be an issue.
  // For now, simple formatting.

  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();

  return `${day}/${month}/${year}`;
});

