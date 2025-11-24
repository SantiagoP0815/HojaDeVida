const express = require('express');
const router = express.Router();

const passport = require('passport');
const { isLoggedIn } = require('../lib/auth');
const { body, validationResult } = require('express-validator');

// SIGNUP
router.get('/signup', (req, res) => {
  res.render('auth/signup');
});

router.post('/signup', [
  body('primer_apellido').trim().notEmpty().withMessage('Primer apellido es requerido'),
  body('segundo_apellido').trim().notEmpty().withMessage('Segundo apellido es requerido'),
  body('nombres').trim().notEmpty().withMessage('Nombres son requeridos'),
  body('tipo_documento').isIn(['C.C', 'C.E', 'PAS']).withMessage('Tipo de documento inválido'),
  body('numero_documento').trim().notEmpty().withMessage('Número de documento es requerido'),
  body('password').isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres'),
  body('vereda').trim().notEmpty().withMessage('La vereda es requerida'),
  body('respuesta_junta').trim().notEmpty().withMessage('La respuesta a la pregunta es requerida')
], (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    req.flash('message', errors.array()[0].msg);
    return res.redirect('/signup');
  }
  passport.authenticate('local.signup', {
    successRedirect: '/hoja/add',
    failureRedirect: '/signup',
    failureFlash: true
  })(req, res, next);
});

// SINGIN
router.get('/signin', (req, res) => {
  res.render('auth/signin');
});

router.post('/signin', [
  body('numero_documento').trim().notEmpty().withMessage('El número de documento es requerido'),
  body('password').notEmpty().withMessage('La contraseña es requerida')
], (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    req.flash('message', errors.array()[0].msg);
    return res.redirect('/signin');
  }
  passport.authenticate('local.signin', {
    successRedirect: '/hoja/add',
    failureRedirect: '/signin',
    failureFlash: true
  })(req, res, next);
});

router.get('/logout', (req, res, next) => {
  // Compatibilidad con versiones nuevas de passport: usar callback
  req.logOut(function(err) {
    if (err) { return next(err); }
    res.redirect('/');
  });
});

router.get('/profile', isLoggedIn, (req, res) => {
  res.render('profile');
});

module.exports = router;