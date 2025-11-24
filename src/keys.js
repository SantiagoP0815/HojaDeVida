// Use environment variables for configuration (set in .env or environment)
module.exports = {
    database: {
        connectionLimit: parseInt(process.env.DB_CONN_LIMIT || '10', 10),
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'hoja_de_vida'
    }
};