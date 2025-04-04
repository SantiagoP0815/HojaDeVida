const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const { v4: uuidv4 } = require('uuid');
const pool = require('../database');
const helpers = require('./helpers');

passport.use('local.signin', new LocalStrategy({
  usernameField: 'numero_documento', // Campo que identifica al usuario
  passwordField: 'password',        // Campo de contraseña
  passReqToCallback: true
}, async (req, numero_documento, password, done) => {
  try {
    // Buscar al usuario en la base de datos
    const rows = await pool.query('SELECT * FROM personas WHERE numero_documento = ?', [numero_documento]);
    if (rows.length > 0) {
      const user = rows[0];

      // Verificar la contraseña
      const validPassword = await helpers.matchPassword(password, user.password);
      if (validPassword) {
        // Si la contraseña es válida
        return done(null, user, req.flash('success'));
      } else {
        // Contraseña incorrecta
        return done(null, false, req.flash('message', 'Contraseña incorrecta.'));
      }
    } else {
      // Usuario no encontrado
      return done(null, false, req.flash('message', 'El número de documento no está registrado.'));
    }
  } catch (err) {
    console.error('Error durante la autenticación:', err);
    return done(err);
  }
}));

passport.use('local.signup', new LocalStrategy({
  usernameField: 'numero_documento', // Campo único del usuario
  passwordField: 'password',
  passReqToCallback: true
}, async (req, numero_documento, password, done) => {
  try {
    // Extrayendo los campos adicionales del cuerpo de la solicitud
    const { primer_apellido, segundo_apellido, nombres, tipo_documento } = req.body;

    // Creando un objeto para el nuevo usuario
    let newUser = {
      primer_apellido,
      segundo_apellido,
      nombres,
      tipo_documento,
      numero_documento,
      password: await helpers.encryptPassword(password), // Encriptando la contraseña
      unique_identifier: uuidv4() // Generar un identificador único
    };

    // Guardando en la base de datos
    const result = await pool.query('INSERT INTO personas SET ?', newUser);

    // Asignando el ID insertado al usuario
    newUser.id_persona = result.insertId;

    // Devolviendo el usuario creado
    return done(null, newUser);
  } catch (err) {
    console.error('Error al registrar usuario:', err);
    return done(err);
  }
}));

passport.serializeUser((user, done) => {
  console.log('Usuario a serializar:', user.id_persona); // Depuración
  if (!user.id_persona) {
    console.error('Error: el usuario no tiene un campo id_persona');
    return done(new Error('Usuario inválido para serializar'));
  }
  done(null, user.id_persona); // Asegúrate de usar el identificador correcto
});


passport.deserializeUser(async (id, done) => {
  console.log('Intentando deserializar usuario con ID:', id);
  try {
    const rows = await pool.query('SELECT * FROM personas WHERE id_persona = ?', [id]);
    if (rows.length > 0) {
      console.log('Usuario deserializado');
      done(null, rows[0]);
    } else {
      console.log('Usuario no encontrado en la base de datos');
      done(null, false);
    }
  } catch (err) {
    console.error('Error durante la deserialización:', err);
    done(err, false);
  }
});