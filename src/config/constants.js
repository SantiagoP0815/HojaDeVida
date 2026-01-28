/**
 * Constantes centralizadas para el proyecto HojaDeVida
 * Facilita el mantenimiento y actualización de valores de configuración
 */

module.exports = {
    // Archivos subidos
    MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB en bytes
    ALLOWED_FILE_TYPES: ['pdf', 'jpg', 'jpeg', 'png'],
    ALLOWED_MIME_TYPES: ['application/pdf', 'image/jpeg', 'image/png'],

    // Límites de formulario
    MAX_EDUCACION_ITEMS: 5,
    MAX_IDIOMAS_ITEMS: 5,
    MAX_EXPERIENCIA_ITEMS: 5,

    // Seguridad
    PASSWORD_MIN_LENGTH: 8,
    RATE_LIMIT_WINDOW_MS: 15 * 60 * 1000, // 15 minutos
    RATE_LIMIT_MAX_REQUESTS: 200,

    // Sesiones
    SESSION_MAX_AGE_MS: 24 * 60 * 60 * 1000, // 1 día

    // Validaciones
    DOCUMENTO_MIN_LENGTH: 6,
    DOCUMENTO_MAX_LENGTH: 15,
    TELEFONO_MIN_LENGTH: 7,
    TELEFONO_MAX_LENGTH: 15,

    // Roles
    ROLE_ADMIN: 'SI',
    ROLE_USER: 'NO',

    // Tipos de documento
    TIPOS_DOCUMENTO: ['C.C', 'C.E', 'PAS'],

    // Tipos de empleo
    TIPO_PUBLICO: 'PUBLICA',
    TIPO_PRIVADO: 'PRIVADA',

    // Niveles de idioma
    NIVEL_REGULAR: 'REGULAR',
    NIVEL_BIEN: 'BIEN',
    NIVEL_MUY_BIEN: 'MUY BIEN',

    // Valores booleanos
    SI: 'SI',
    NO: 'NO'
};
