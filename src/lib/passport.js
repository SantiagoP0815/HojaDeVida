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
  usernameField: 'numero_documento',
  passwordField: 'password',
  passReqToCallback: true
}, async (req, numero_documento, password, done) => {
  const {
    primer_apellido,
    segundo_apellido,
    nombres,
    tipo_documento,
    vereda,
    respuesta_junta
  } = req.body;

  // 1) Sanitizar input de vereda
  const veredaBusca = vereda.trim();

  try {
    // 2) Query con TRIM + LOWER
    const sql = `
      SELECT nombre_presidente
        FROM junta_presidentes
       WHERE LOWER(TRIM(vereda)) = LOWER(?)
      LIMIT 1
    `;


    const rows = await pool.query(sql, [veredaBusca]);


    if (!Array.isArray(rows) || rows.length === 0) {
      console.error('Error: la consulta no devolvió resultados o no es un array:', rows);
      console.error('Vereda no encontrada en BD:', JSON.stringify(veredaBusca));
      return done(null, false, req.flash('message', 'Vereda no encontrada.'));
    }

    const oficialRaw = rows[0].nombre_presidente;
    if (typeof oficialRaw !== 'string') {
      console.error('Columna nombre_presidente ausente o mal nombrada:', rows[0]);
      return done(null, false, req.flash('message', 'Error en la base de datos.'));
    }

    // 3) Sanitizar también el nombre de presidente y la respuesta
    const oficial = oficialRaw.trim().toLowerCase();
    const respuestaLt = respuesta_junta.trim().toLowerCase();
    /*
        if (oficial !== respuestaLt) {
          return done(null, false, req.flash('message', 'La respuesta es incorrecta.'));
        }
    */

    // Verificar si el número de documento ya existe
    const checkQuery = 'SELECT id_persona FROM personas WHERE numero_documento = ? LIMIT 1';
    const existingUser = await pool.query(checkQuery, [numero_documento]);

    if (existingUser.length > 0) {
      return done(null, false, req.flash('message', 'Ya existe un usuario con ese número de documento.'));
    }

    // 4) Crear usuario
    const newUser = {
      primer_apellido,
      segundo_apellido,
      nombres,
      tipo_documento,
      numero_documento,
      password: await helpers.encryptPassword(password),
      unique_identifier: uuidv4(),
      vereda: veredaBusca,
    };

    const result = await pool.query(
      'INSERT INTO personas SET ?',
      newUser
    );
    newUser.id_persona = result.insertId;
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