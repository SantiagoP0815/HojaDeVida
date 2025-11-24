const multer = require('multer');
const path = require('path'); // Para manejar las extensiones de los archivos
const fs = require('fs');

const docsDir = path.join(__dirname, '..', 'docs');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Asegurar que el directorio exista
        try {
            fs.mkdirSync(docsDir, { recursive: true });
        } catch (e) {
            console.error('Error creando directorio de documentos:', e);
        }
        cb(null, docsDir); // Directorio donde se guardarán los archivos
    },
    filename: (req, file, cb) => {
        // Obtener datos del usuario desde `req.body` o `req.user`
        const nombres = req.body.nombres || ''; // Obtén el nombre de `req.body` (asegúrate de enviarlo desde el formulario)
        const primerApellido = req.body.primer_apellido || '';
        const segundoApellido = req.body.segundo_apellido || '';
        const numeroDocumento = req.body.numero_documento || ''; // Número de documento del usuario
        const tipoDocumento = file.fieldname; // Nombre del campo, como 'documento_id' o 'libreta_militar'

        // Reemplazar espacios con guiones bajos y eliminar caracteres inválidos
        const sanitize = (s) => s.toString().trim().replace(/\s+/g, '_').replace(/[^\w\-\.]/g, '');
        const nombresLimpios = sanitize(nombres);
        const numero_documentoLimpio = sanitize(numeroDocumento);
        const primerApellidoLimpio = sanitize(primerApellido);
        const segundoApellidoLimpio = sanitize(segundoApellido);

        // Generar nombre del archivo
        const extension = path.extname(file.originalname); // Extensión del archivo
        const timestamp = Date.now();
        const nombreArchivo = `${numero_documentoLimpio}_${primerApellidoLimpio}_${segundoApellidoLimpio}_${nombresLimpios}_${tipoDocumento}_${timestamp}${extension}`;

        cb(null, nombreArchivo); // Guardar el archivo con el nombre personalizado
    }
});

// File filter and limits
const allowedMimes = ['application/pdf', 'image/jpeg', 'image/png'];
const limits = { fileSize: 5 * 1024 * 1024 }; // 5MB

const fileFilter = (req, file, cb) => {
    if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Tipo de archivo no permitido. Solo PDF, JPG y PNG son aceptados.'));
    }
};

const upload = multer({ storage: storage, limits, fileFilter });

module.exports = upload;  // Exportamos el middleware para usarlo en otros archivos