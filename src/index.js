const express = require('express');
const morgan = require('morgan');
const path = require('path');
const exphbs = require('express-handlebars');
const session = require('express-session');
const validator = require('express-validator');
const passport = require('passport');
const flash = require('connect-flash');
const MySQLStore = require('express-mysql-session')(session);
const bodyParser = require('body-parser');
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


// Settings
app.set('port', process.env.PORT || 4000);
app.set('views', path.join(__dirname, 'views'));
app.engine('.hbs', exphbs({
  defaultLayout: 'main',
  layoutsDir: path.join(app.get('views'), 'layouts'),
  partialsDir: path.join(app.get('views'), 'partials'),
  extname: '.hbs',
}))
app.set('view engine', '.hbs');

Handlebars.registerHelper('eq', function(a, b) {
  return a === b;
});

Handlebars.registerHelper('range', function(start, end) {
  let range = [];
  for (let i = start; i < end; i++) {
    range.push(i);
  }
  return range;
});

Handlebars.registerHelper('add', function (a, b) {
  return a + b;
});

// Middlewares
app.use(morgan('dev'));
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

app.use(session({
  secret: 'secret',
  resave: false,
  saveUninitialized: false,
  store: new MySQLStore(database)
}));
app.use(flash());
app.use(passport.initialize());
app.use(passport.session());
app.use(validator());

// Global variables
app.use((req, res, next) => {
  app.locals.message = req.flash('message');
  app.locals.success = req.flash('success');
  app.locals.user = req.user;
  next();
});

// Routes
app.use(require('./routes/index'));
app.use(require('./routes/authentication'));
app.use('/hoja', require('./routes/hoja'));

// Public
app.use(express.static(path.join(__dirname, 'public')));

// Starting
const port = app.get('port');
const ips = getServerIps();

app.listen(port, '0.0.0.0', () => {
  console.log('Servidor corriendo en:');
  ips.forEach(ip => {
    console.log(`http://${ip}:${port}`);
  });
  console.log(`http://localhost:${port}`);
});