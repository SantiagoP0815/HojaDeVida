/**
 * Validador de variables de entorno
 * Asegura que todas las variables requeridas estén definidas antes de iniciar la aplicación
 */

const requiredEnvVars = [
    'DB_HOST',
    'DB_USER',
    'DB_NAME',
    'SESSION_SECRET',
    'NODE_ENV'
];

function validateEnv() {
    const missing = [];

    requiredEnvVars.forEach(varName => {
        if (!process.env[varName]) {
            missing.push(varName);
        }
    });

    if (missing.length > 0) {
        throw new Error(
            `Variables de entorno faltantes: ${missing.join(', ')}\n` +
            `Por favor, verifica tu archivo .env`
        );
    }

    // Validaciones específicas
    if (process.env.NODE_ENV === 'production') {
        if (process.env.SESSION_SECRET === 'secret' || process.env.SESSION_SECRET.length < 32) {
            throw new Error(
                'SESSION_SECRET debe ser una cadena segura de al menos 32 caracteres en producción'
            );
        }
    }

    console.log('✓ Todas las variables de entorno requeridas están configuradas');
}

module.exports = validateEnv;
