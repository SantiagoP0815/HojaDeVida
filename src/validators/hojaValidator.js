const { body } = require('express-validator');

const insertarDatosValidators = [
    body('nombres').trim().notEmpty().withMessage('El campo nombres es obligatorio.'),
    body('primer_apellido').trim().notEmpty().withMessage('El primer apellido es obligatorio.'),
    body('tipo_documento').trim().notEmpty().withMessage('El tipo de documento es obligatorio.'),
    body('numero_documento').trim().notEmpty().withMessage('El número de documento es obligatorio.'),
    body('email').optional({ checkFalsy: true }).isEmail().withMessage('Correo electrónico inválido.'),
    body('telefono').optional({ checkFalsy: true }).isLength({ min: 7 }).withMessage('Teléfono inválido.'),
    body('fecha_nacimiento').optional({ checkFalsy: true }).isISO8601().withMessage('Fecha de nacimiento inválida (YYYY-MM-DD).'),
    body('anios_total_experiencia').optional({ checkFalsy: true }).isInt({ min: 0 }).withMessage('Años de experiencia inválidos.'),
    body('meses_total_experiencia').optional({ checkFalsy: true }).isInt({ min: 0, max: 11 }).withMessage('Meses de experiencia inválidos (0-11).'),
    body('pais_correspondencia').optional({ checkFalsy: true }).trim().notEmpty().withMessage('El país de correspondencia es inválido.'),
    body('departamento_correspondencia').optional({ checkFalsy: true }).trim().notEmpty().withMessage('El departamento de correspondencia es inválido.'),
    body('municipio_correspondencia').optional({ checkFalsy: true }).trim().notEmpty().withMessage('El municipio de correspondencia es inválido.')
];

module.exports = {
    insertarDatosValidators
};
