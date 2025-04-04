const multer = require('multer');
const path = require('path'); // Para manejar las extensiones de los archivos

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'src/docs/'); // Directorio donde se guardarán los archivos
    },
    filename: (req, file, cb) => {
        // Obtener datos del usuario desde `req.body` o `req.user`
        const nombres = req.body.nombres || ''; // Obtén el nombre de `req.body` (asegúrate de enviarlo desde el formulario)
        const primerApellido = req.body.primer_apellido || '';
        const segundoApellido = req.body.segundo_apellido || '';
        const tipoDocumento = file.fieldname; // Nombre del campo, como 'documento_id' o 'libreta_militar'

        // Reemplazar espacios con guiones bajos
        const nombresLimpios = nombres.replace(/\s+/g, '_');
        const primerApellidoLimpio = primerApellido.replace(/\s+/g, '');
        const segundoApellidoLimpio = segundoApellido.replace(/\s+/g, '');

        // Generar nombre del archivo
        const extension = path.extname(file.originalname); // Extensión del archivo
        const nombreArchivo = `${primerApellidoLimpio}_${segundoApellidoLimpio}_${nombresLimpios}_${tipoDocumento}${extension}`;

        cb(null, nombreArchivo); // Guardar el archivo con el nombre personalizado
    }
});

const upload = multer({ storage: storage });

module.exports = upload;  // Exportamos el middleware para usarlo en otros archivos