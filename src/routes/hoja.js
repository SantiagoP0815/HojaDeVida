const express = require('express');
const router = express.Router();
const pool = require('../database');
const { isLoggedIn } = require('../lib/auth');
const upload = require('../lib/upload');
const PdfPrinter = require('pdfmake');

const fonts = {
    Helvetica: {
        normal: 'Helvetica',
        bold: 'Helvetica-Bold',
        italics: 'Helvetica-Oblique',
        bolditalics: 'Helvetica-BoldOblique'
    }
};

const printer = new PdfPrinter(fonts);

router.get("/list", isLoggedIn, async (req, res) => {
    try {
        // Verificar si el usuario es administrador
        const adminRows = await pool.query(
            `SELECT id_persona FROM personas WHERE id_persona = ? AND admin = 'SI' LIMIT 1`,
            [req.user.id_persona]
        );

        // Si el usuario no es administrador, devolver un error 403 (Prohibido)
        if (adminRows.length === 0) {
            return res.status(403).send('No tienes permisos para acceder a esta página');
        }

        // Obtener todas las personas
        const personas = await pool.query('SELECT * FROM personas');

        // Renderizar la vista con los datos
        res.render('hoja/list', { personas: personas });
    } catch (error) {
        console.error('Error en la ruta /list:', error);
        res.status(500).send('Error interno del servidor');
    }
});

router.get('/add', isLoggedIn, async (req, res) => {
    const idiomas = await pool.query('SELECT * FROM idiomas WHERE id_persona = ?', [req.user.id_persona]);
    const educacion_basica_media = (await pool.query('SELECT * FROM educacion_basica_media WHERE id_persona = ?', [req.user.id_persona]))[0] || {};
    const educacion_superior = await pool.query('SELECT * FROM educacion_superior WHERE id_persona = ?', [req.user.id_persona]);
    const tiempo_experiencia = (await pool.query('SELECT * FROM tiempo_experiencia WHERE id_persona = ?', [req.user.id_persona]))[0] || {};
    const empleos = await pool.query('SELECT * FROM experiencia_laboral WHERE id_persona = ?', [req.user.id_persona]);
    const empleoActual = empleos.find(empleo => empleo.empleo_actual === 'SI') || null;
    const empleosAnteriores = empleos.filter(empleo => empleo.empleo_actual === 'NO');
    res.render('hoja/add', { idiomas: idiomas, educacion_basica_media: educacion_basica_media, educacion_superior: educacion_superior, empleosAnteriores: empleosAnteriores, empleoActual: empleoActual, tiempo_experiencia: tiempo_experiencia });
});

router.get('/view/:unique_identifier', async (req, res) => {
    const { unique_identifier } = req.params;
    const persona = (await pool.query('SELECT * FROM personas WHERE unique_identifier = ?', [unique_identifier]))[0];
    if (!persona) {
        return res.status(404).send('Persona no encontrada');
    }
    const idiomas = await pool.query('SELECT * FROM idiomas WHERE id_persona = ?', [persona.id_persona]);
    const educacion_basica_media = (await pool.query('SELECT * FROM educacion_basica_media WHERE id_persona = ?', [persona.id_persona]))[0] || {};
    const educacion_superior = await pool.query('SELECT * FROM educacion_superior WHERE id_persona = ?', [persona.id_persona]);
    const tiempo_experiencia = (await pool.query('SELECT * FROM tiempo_experiencia WHERE id_persona = ?', [persona.id_persona]))[0] || {};
    const empleos = await pool.query('SELECT * FROM experiencia_laboral WHERE id_persona = ?', [persona.id_persona]);
    const empleoActual = empleos.find(empleo => empleo.empleo_actual === 'SI') || null;
    const empleosAnteriores = empleos.filter(empleo => empleo.empleo_actual === 'NO');
    res.render('hoja/view', { persona: persona, idiomas: idiomas, educacion_basica_media: educacion_basica_media, educacion_superior: educacion_superior, empleosAnteriores: empleosAnteriores, empleoActual: empleoActual, tiempo_experiencia: tiempo_experiencia });
});

router.post('/insertar-datos', isLoggedIn, upload.fields([{ name: 'documento_id', maxCount: 1 },
{ name: 'documento_educacion_superior_0', maxCount: 1 },
{ name: 'documento_educacion_superior_1', maxCount: 1 },
{ name: 'documento_educacion_superior_2', maxCount: 1 },
{ name: 'documento_educacion_superior_3', maxCount: 1 },
{ name: 'documento_educacion_superior_4', maxCount: 1 },
{ name: 'documento_educacion_superior_5', maxCount: 1 },
{ name: 'documento_idioma_0', maxCount: 1 },
{ name: 'documento_idioma_1', maxCount: 1 },
{ name: 'documento_idioma_2', maxCount: 1 },
{ name: 'documento_idioma_3', maxCount: 1 },
{ name: 'documento_idioma_4', maxCount: 1 },
{ name: 'documento_idioma_5', maxCount: 1 },
{ name: 'documento_experiencia_0', maxCount: 1 },
{ name: 'documento_experiencia_1', maxCount: 1 },
{ name: 'documento_experiencia_2', maxCount: 1 },
{ name: 'documento_experiencia_3', maxCount: 1 },
{ name: 'documento_experiencia_4', maxCount: 1 },
{ name: 'documento_experiencia_5', maxCount: 1 },
{ name: '' }]), async (req, res) => {
    const datos = req.body;
    const id_persona = req.user.id_persona;
    try {
        // Primero, subimos los archivos y los guardamos en la base de datos
        if (req.files) {
            // Guardar documento_id
            if (req.files['documento_id']) {
                const documentoIdFile = req.files['documento_id'][0];
                const nombreOriginalDocumentoId = documentoIdFile.originalname; // Nombre original    

                // Guardar en la tabla documentos
                await pool.query(
                    `UPDATE personas SET nombre_original_archivo = ? WHERE id_persona = ?`,
                    [nombreOriginalDocumentoId, id_persona]
                );

            }
        }
        // Actualización en tablas de uno a uno
        await pool.query(
            `UPDATE personas SET nombres = ?, primer_apellido = ?, segundo_apellido = ?, tipo_documento = ?, numero_documento = ?, sexo = ?, nacionalidad = ?, pais = ?, tipo_libreta_militar = ?, numero_libreta_militar = ?, dm_libreta_militar = ?, fecha_nacimiento = ?, pais_nacimiento = ?, departamento_nacimiento = ?, municipio_nacimiento = ?, direccion_correspondencia = ?, pais_correspondencia = ?, departamento_correspondencia = ?, municipio_correspondencia = ?, telefono = ?, email = ? WHERE id_persona = ?`,
            [
                datos.nombres, datos.primer_apellido, datos.segundo_apellido, datos.tipo_documento, datos.numero_documento,
                datos.sexo, datos.nacionalidad, datos.pais, datos.tipo_libreta_militar,
                datos.numero_libreta_militar, datos.dm_libreta_militar, datos.fecha_nacimiento, datos.pais_nacimiento,
                datos.departamento_nacimiento, datos.municipio_nacimiento, datos.direccion_correspondencia,
                datos.pais_correspondencia, datos.departamento_correspondencia, datos.municipio_correspondencia,
                datos.telefono, datos.email, id_persona
            ]
        );

        const [rowsBasica] = await pool.query(`SELECT 1 FROM educacion_basica_media WHERE id_persona = ? LIMIT 1`, [id_persona]);

        if (!rowsBasica || rowsBasica.length === 0) {
            await pool.query(
                `INSERT INTO educacion_basica_media (id_persona, titulo_obtenido, educacion_basica, fecha_grado) 
                    VALUES (?, ?, ?, ?)`,
                [
                    id_persona,
                    datos.titulo_obtenido,
                    datos.educacion_basica,
                    datos.fecha_grado,
                ]
            );
        } else {
            await pool.query(
                `UPDATE educacion_basica_media SET 
                    titulo_obtenido = ?, 
                    educacion_basica = ?, 
                    fecha_grado = ?
                    WHERE id_persona = ?`,
                [
                    datos.titulo_obtenido,
                    datos.educacion_basica,
                    datos.fecha_grado,
                    id_persona
                ]
            );
        }

        // Eliminación e inserción en tablas de uno a muchos

        const undefinedToNull = (value) => value === "" || value === "0" || value === undefined ? null : value;

        // Tabla "educacion_basica_media"
        // Procesar los datos dinámicamente
        const records = [];
        for (let i = 0; i <= 5; i++) {
            if (
                (datos[`id_educacion_superior_${i}`] !== undefined && datos[`id_educacion_superior_${i}`] != '') ||
                (datos[`modalidad_academica_${i}`] !== undefined && datos[`modalidad_academica_${i}`] != '') ||
                (datos[`semestres_aprobados_${i}`] !== undefined && datos[`semestres_aprobados_${i}`] != '') ||
                (datos[`graduado_${i}`] !== undefined && datos[`graduado_${i}`] != '') ||
                (datos[`nombre_titulo_${i}`] !== undefined && datos[`nombre_titulo_${i}`] != '') ||
                (datos[`mes_terminacion_${i}`] !== undefined && datos[`mes_terminacion_${i}`] != '') ||
                (datos[`numero_tarjeta_profesional_${i}`] !== undefined && datos[`numero_tarjeta_profesional_${i}`] != '')
            ) {
                const record = {
                    id_educacion_superior: undefinedToNull(datos[`id_educacion_superior_${i}`]),
                    modalidad_academica: undefinedToNull(datos[`modalidad_academica_${i}`]),
                    semestres_aprobados: undefinedToNull(datos[`semestres_aprobados_${i}`]),
                    graduado: undefinedToNull(datos[`graduado_${i}`]),
                    nombre_titulo: undefinedToNull(datos[`nombre_titulo_${i}`]),
                    mes_terminacion: undefinedToNull(datos[`mes_terminacion_${i}`]),
                    numero_tarjeta_profesional: undefinedToNull(datos[`numero_tarjeta_profesional_${i}`]),
                };
                records.push(record);
            }
        }

        // Paso 1: Obtener todos los registros actuales asociados a la id_persona
        const existingRecords = await pool.query('SELECT id_educacion_superior FROM educacion_superior WHERE id_persona = ?', [id_persona]);

        // Asegurarse de que existingRecords sea un arreglo
        const recordsArray = Array.isArray(existingRecords) ? existingRecords : [existingRecords].filter(Boolean);

        // Convertir los IDs existentes a números
        const existingIds = new Set(
            recordsArray
                .filter(record => record && record.id_educacion_superior)
                .map(record => Number(record.id_educacion_superior)) // Convertir a número
        );


        // Crear un conjunto de IDs de registros enviados por el usuario
        const sentIds = new Set();

        // Paso 2: Procesar los registros enviados por el usuario
        for (const record of records) {
            const { id_educacion_superior, modalidad_academica, semestres_aprobados, graduado, nombre_titulo, mes_terminacion, numero_tarjeta_profesional } = record;

            if (id_educacion_superior) {
                // Si hay un ID, verificar si el registro ya existe
                const [existingRecord] = await pool.query('SELECT 1 FROM educacion_superior WHERE id_educacion_superior = ? AND id_persona = ? LIMIT 1', [id_educacion_superior, id_persona]);

                if (existingRecord.length === 0) {
                    // Si no existe, insertar un nuevo registro con el ID proporcionado
                    await pool.query(
                        `INSERT INTO educacion_superior ( id_persona, modalidad_academica, semestres_aprobados, graduado, nombre_titulo, mes_terminacion, numero_tarjeta_profesional) 
                        VALUES ( ?, ?, ?, ?, ?, ?, ?)`,
                        [id_persona, modalidad_academica, semestres_aprobados, graduado, nombre_titulo, mes_terminacion, numero_tarjeta_profesional]
                    );
                } else {
                    // Si existe, actualizar el registro
                    await pool.query(
                        `UPDATE educacion_superior 
                        SET modalidad_academica = ?, semestres_aprobados = ?, graduado = ?, nombre_titulo = ?, mes_terminacion = ?, numero_tarjeta_profesional = ? 
                        WHERE id_educacion_superior = ? AND id_persona = ?`,
                        [modalidad_academica, semestres_aprobados, graduado, nombre_titulo, mes_terminacion, numero_tarjeta_profesional, id_educacion_superior, id_persona]
                    );
                }

                // Agregar el ID enviado al conjunto de IDs enviados
                sentIds.add(Number(id_educacion_superior));
            } else {
                // Si no hay ID, insertar un nuevo registro (el ID se generará automáticamente)
                await pool.query(
                    `INSERT INTO educacion_superior (id_persona, modalidad_academica, semestres_aprobados, graduado, nombre_titulo, mes_terminacion, numero_tarjeta_profesional) 
                    VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [id_persona, modalidad_academica, semestres_aprobados, graduado, nombre_titulo, mes_terminacion, numero_tarjeta_profesional]
                );

                // Paso 3: Obtener el ID del registro recién insertado
                const [newRecord] = await pool.query(
                    `SELECT id_educacion_superior FROM educacion_superior 
                    WHERE id_persona = ? AND modalidad_academica = ? AND semestres_aprobados = ? AND graduado = ? AND nombre_titulo = ? AND mes_terminacion = ? AND numero_tarjeta_profesional = ? 
                    ORDER BY id_educacion_superior DESC LIMIT 1`,
                    [id_persona, modalidad_academica, semestres_aprobados, graduado, nombre_titulo, mes_terminacion, numero_tarjeta_profesional]
                );

                // Asegurarse de que newRecord sea un arreglo
                const newRecordArray = Array.isArray(newRecord) ? newRecord : [newRecord].filter(Boolean);

                if (newRecordArray.length > 0) {
                    const newId = newRecordArray[0].id_educacion_superior;

                    // Agregar el nuevo ID al conjunto de IDs enviados
                    sentIds.add(newId);
                } else {
                    console.error('No se encontró el registro recién insertado');
                }
            }

        }

        for (let i = 0; i <= 5; i++) {
            if (
                (req.files[`documento_educacion_superior_${i}`]) && (
                    (datos[`modalidad_academica_${i}`] !== undefined && datos[`modalidad_academica_${i}`] != '') ||
                    (datos[`semestres_aprobados_${i}`] !== undefined && datos[`semestres_aprobados_${i}`] != '') ||
                    (datos[`graduado_${i}`] !== undefined && datos[`graduado_${i}`] != '') ||
                    (datos[`nombre_titulo_${i}`] !== undefined && datos[`nombre_titulo_${i}`] != '') ||
                    (datos[`mes_terminacion_${i}`] !== undefined && datos[`mes_terminacion_${i}`] != '') ||
                    (datos[`numero_tarjeta_profesional_${i}`] !== undefined && datos[`numero_tarjeta_profesional_${i}`] != '')
                )) {
                const documentoEducacionSuperiorFile = req.files[`documento_educacion_superior_${i}`][0];
                const nombreOriginalDocumentoEducacionSuperior = documentoEducacionSuperiorFile.originalname; // Nombre original

                let condiciones = [];
                let valores = [nombreOriginalDocumentoEducacionSuperior, id_persona];
                
                const columnas = [
                    'modalidad_academica',
                    'semestres_aprobados',
                    'graduado',
                    'nombre_titulo',
                    'mes_terminacion',
                    'numero_tarjeta_profesional'
                ];
                
                for (let col of columnas) {
                    const valor = datos[`${col}_${i}`];
                    if (valor === null || valor === undefined || valor === '') {
                        condiciones.push(`${col} IS NULL`);
                    } else {
                        condiciones.push(`${col} = ?`);
                        valores.push(valor);
                    }
                }
                
                const sql = `UPDATE educacion_superior SET documento = ? WHERE id_persona = ? AND ${condiciones.join(' AND ')}`;
                
                await pool.query(sql, valores);
                
            }
        }

        // Paso 4: Eliminar los registros que el usuario ha quitado
        const idsToDelete = Array.from(existingIds).filter(id => !sentIds.has(id)); // Convertir el Set a un arreglo
        if (idsToDelete.length > 0) {
            // Crear una cadena de placeholders dinámicamente
            const placeholders = idsToDelete.map(() => '?').join(',');

            // Construir la consulta SQL con la condición adicional
            const query = `DELETE FROM educacion_superior WHERE id_educacion_superior IN (${placeholders}) AND id_persona = ?`;

            // Combinar los valores de idsToDelete y id_persona en un solo array
            const values = [...idsToDelete, id_persona];

            // Ejecutar la consulta con los valores
            await pool.query(query, values);
        }

        const recordsIdiomas = [];
        for (let i = 0; i <= 5; i++) {
            if (
                (datos[`id_idioma_${i}`] !== undefined && datos[`id_idioma_${i}`] != '') ||
                (datos[`idioma_${i}`] !== undefined && datos[`idioma_${i}`] != '') ||
                (datos[`habla_${i}`] !== undefined && datos[`habla_${i}`] != '') ||
                (datos[`lee_${i}`] !== undefined && datos[`lee_${i}`] != '') ||
                (datos[`escribe_${i}`] !== undefined && datos[`escribe_${i}`] != '')
            ) {

                const recordIdiomas = {
                    id_idioma: undefinedToNull(datos[`id_idioma_${i}`]),
                    idioma: undefinedToNull(datos[`idioma_${i}`]),
                    habla: undefinedToNull(datos[`habla_${i}`]),
                    lee: undefinedToNull(datos[`lee_${i}`]),
                    escribe: undefinedToNull(datos[`escribe_${i}`]),
                };

                recordsIdiomas.push(recordIdiomas);
            }
        }


        // Paso 1: Obtener todos los registros actuales asociados a la id_persona
        const existingRecordsIdiomas = await pool.query('SELECT id_idioma FROM idiomas WHERE id_persona = ?', [id_persona]);

        // Asegurarse de que existingRecords sea un arreglo
        const recordsArrayIdiomas = Array.isArray(existingRecordsIdiomas) ? existingRecordsIdiomas : [existingRecordsIdiomas].filter(Boolean);

        // Convertir los IDs existentes a números
        const existingIdsIdiomas = new Set(
            recordsArrayIdiomas
                .filter(recordIdiomas => recordIdiomas && recordIdiomas.id_idioma)
                .map(recordIdiomas => Number(recordIdiomas.id_idioma)) // Convertir a número
        );


        // Crear un conjunto de IDs de registros enviados por el usuario
        const sentIdsIdiomas = new Set();


        // Paso 2: Procesar los registros enviados por el usuario
        for (const recordIdiomas of recordsIdiomas) {
            const { id_idioma, idioma, habla, lee, escribe } = recordIdiomas;

            if (id_idioma) {
                // Si hay un ID, verificar si el registro ya existe
                const [existingRecordIdiomas] = await pool.query('SELECT 1 FROM idiomas WHERE id_idioma = ? LIMIT 1', [id_idioma]);

                if (existingRecordIdiomas.length === 0) {
                    // Si no existe, insertar un nuevo registro con el ID proporcionado
                    await pool.query(
                        `INSERT INTO idiomas ( id_persona, idioma, lo_habla, lo_lee, lo_escribe) 
                        VALUES ( ?, ?, ?, ?, ?)`,
                        [id_persona, idioma, habla, lee, escribe]
                    );
                } else {
                    // Si existe, actualizar el registro
                    await pool.query(
                        `UPDATE idiomas 
                        SET idioma = ?, lo_habla = ?, lo_lee = ?, lo_escribe = ? 
                        WHERE id_idioma = ?`,
                        [idioma, habla, lee, escribe, id_idioma]
                    );
                }

                // Agregar el ID enviado al conjunto de IDs enviados
                sentIdsIdiomas.add(Number(id_idioma));
            } else {
                // Si no hay ID, insertar un nuevo registro (el ID se generará automáticamente)
                await pool.query(
                    `INSERT INTO idiomas (id_persona, idioma, lo_habla, lo_lee, lo_escribe) 
                    VALUES (?, ?, ?, ?, ?)`,
                    [id_persona, idioma, habla, lee, escribe]
                );

                // Paso 3: Obtener el ID del registro recién insertado
                const [newRecordIdiomas] = await pool.query(
                    `SELECT id_idioma FROM idiomas 
                    WHERE id_persona = ? AND idioma = ? AND lo_habla = ? AND lo_lee = ? AND lo_escribe = ? 
                    ORDER BY id_idioma DESC LIMIT 1`,
                    [id_persona, idioma, habla, lee, escribe]
                );

                // Asegurarse de que newRecord sea un arreglo
                const newRecordArrayIdiomas = Array.isArray(newRecordIdiomas) ? newRecordIdiomas : [newRecordIdiomas].filter(Boolean);

                if (newRecordArrayIdiomas.length > 0) {
                    const newId = newRecordArrayIdiomas[0].id_idioma;

                    // Agregar el nuevo ID al conjunto de IDs enviados
                    sentIdsIdiomas.add(newId);
                } else {
                    console.error('No se encontró el registro recién insertado');
                }
            }

        }

        for (let i = 0; i <= 5; i++) {
            if (
                (req.files[`documento_idioma_${i}`]) && (
                    (datos[`idioma_${i}`] !== undefined && datos[`idioma_${i}`] != '') ||
                    (datos[`habla_${i}`] !== undefined && datos[`habla_${i}`] != '') ||
                    (datos[`lee_${i}`] !== undefined && datos[`lee_${i}`] != '') ||
                    (datos[`escribe_${i}`] !== undefined && datos[`escribe_${i}`] != '')
                )) {
                const documentoIdiomaFile = req.files[`documento_idioma_${i}`][0];
                const nombreOriginalDocumentoIdioma = documentoIdiomaFile.originalname; // Nombre original

                let condiciones = [];
                let valores = [nombreOriginalDocumentoIdioma, id_persona];
                
                const columnas = [
                    'idioma',
                    'lo_habla',
                    'lo_lee',
                    'lo_escribe',
                ];
                
                for (let col of columnas) {
                    const valor = datos[`${col}_${i}`];
                    if (valor === null || valor === undefined || valor === '') {
                        condiciones.push(`${col} IS NULL`);
                    } else {
                        condiciones.push(`${col} = ?`);
                        valores.push(valor);
                    }
                }
                
                const sql = `UPDATE idiomas SET documento = ? WHERE id_persona = ? AND ${condiciones.join(' AND ')}`;
                
                await pool.query(sql, valores);
                
            }
        }

        // Paso 4: Eliminar los registros que el usuario ha quitado
        const idsToDeleteIdiomas = Array.from(existingIdsIdiomas).filter(id => !sentIdsIdiomas.has(id)); // Convertir el Set a un arreglo
        if (idsToDeleteIdiomas.length > 0) {

            // Crear una cadena de placeholders dinámicamente
            const placeholders = idsToDeleteIdiomas.map(() => '?').join(',');

            // Construir la consulta SQL
            const query = `DELETE FROM idiomas WHERE id_idioma IN (${placeholders}) AND id_persona = ?`;

            const values = [...idsToDeleteIdiomas, id_persona];

            // Ejecutar la consulta con los valores
            await pool.query(query, values);

        }

        const recordsExperiencia = [];
        for (let i = 0; i <= 5; i++) {
            if (
                (datos[`id_experiencia_${i}`] !== undefined && datos[`id_experiencia_${i}`] != '') ||
                (datos[`empresa_entidad_${i}`] !== undefined && datos[`empresa_entidad_${i}`] != '') ||
                (datos[`tipo_${i}`] !== undefined && datos[`tipo_${i}`] != '') ||
                (datos[`pais_${i}`] !== undefined && datos[`pais_${i}`] != '') ||
                (datos[`departamento_${i}`] !== undefined && datos[`departamento_${i}`] != '') ||
                (datos[`municipio_${i}`] !== undefined && datos[`municipio_${i}`] != '') ||
                (datos[`correo_entidad_${i}`] !== undefined && datos[`correo_entidad_${i}`] != '') ||
                (datos[`telefono_entidad_${i}`] !== undefined && datos[`telefono_entidad_${i}`] != '') ||
                (datos[`fecha_ingreso_${i}`] !== undefined && datos[`fecha_ingreso_${i}`] != '') ||
                (datos[`fecha_retiro_${i}`] !== undefined && datos[`fecha_retiro_${i}`] != '') ||
                (datos[`cargo_actual_${i}`] !== undefined && datos[`cargo_actual_${i}`] != '') ||
                (datos[`dependencia_${i}`] !== undefined && datos[`dependencia_${i}`] != '') ||
                (datos[`direccion_${i}`] !== undefined && datos[`direccion_${i}`] != '')
            ) {
                const recordExperiencia = {
                    id_experiencia: undefinedToNull(datos[`id_experiencia_${i}`]),
                    empleo_actual: undefinedToNull(datos[`empleo_actual_${i}`]),
                    empresa_entidad: undefinedToNull(datos[`empresa_entidad_${i}`]),
                    tipo: undefinedToNull(datos[`tipo_${i}`]),
                    pais: undefinedToNull(datos[`pais_${i}`]),
                    departamento: undefinedToNull(datos[`departamento_${i}`]),
                    municipio: undefinedToNull(datos[`municipio_${i}`]),
                    correo_entidad: undefinedToNull(datos[`correo_entidad_${i}`]),
                    telefono_entidad: undefinedToNull(datos[`telefono_entidad_${i}`]),
                    fecha_ingreso: undefinedToNull(datos[`fecha_ingreso_${i}`]),
                    fecha_retiro: undefinedToNull(datos[`fecha_retiro_${i}`]),
                    cargo_actual: undefinedToNull(datos[`cargo_actual_${i}`]),
                    dependencia: undefinedToNull(datos[`dependencia_${i}`]),
                    direccion: undefinedToNull(datos[`direccion_${i}`]),
                };
                recordsExperiencia.push(recordExperiencia);
            }
        }

        // Paso 1: Obtener todos los registros actuales asociados a la id_persona
        const existingRecordsExperiencia = await pool.query('SELECT id_experiencia FROM experiencia_laboral WHERE id_persona = ?', [id_persona]);

        // Asegurarse de que existingRecords sea un arreglo
        const recordsArrayExperiencia = Array.isArray(existingRecordsExperiencia) ? existingRecordsExperiencia : [existingRecordsExperiencia].filter(Boolean);

        // Convertir los IDs existentes a números
        const existingIdsExperiencia = new Set(
            recordsArrayExperiencia
                .filter(recordExperiencia => recordExperiencia && recordExperiencia.id_experiencia)
                .map(recordExperiencia => Number(recordExperiencia.id_experiencia)) // Convertir a número
        );


        // Crear un conjunto de IDs de registros enviados por el usuario
        const sentIdsExperiencia = new Set();


        // Paso 2: Procesar los registros enviados por el usuario
        for (const recordExperiencia of recordsExperiencia) {
            const { id_experiencia, empleo_actual, empresa_entidad, tipo, pais, departamento, municipio, correo_entidad, telefono_entidad, fecha_ingreso, fecha_retiro, cargo_actual, dependencia, direccion } = recordExperiencia;

            if (id_experiencia) {
                // Si hay un ID, verificar si el registro ya existe
                const [existingRecordExperiencia] = await pool.query('SELECT 1 FROM experiencia_laboral WHERE id_experiencia = ? LIMIT 1', [id_experiencia]);

                if (existingRecordExperiencia.length === 0) {
                    // Si no existe, insertar un nuevo registro con el ID proporcionado
                    await pool.query(
                        `INSERT INTO experiencia_laboral ( id_persona, empleo_actual, empresa_entidad, tipo, pais, departamento, municipio, correo_entidad, telefono_entidad, fecha_ingreso, fecha_retiro, cargo_actual, dependencia, direccion) 
                        VALUES ( ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        [id_persona, empleo_actual, empresa_entidad, tipo, pais, departamento, municipio, correo_entidad, telefono_entidad, fecha_ingreso, fecha_retiro, cargo_actual, dependencia, direccion]
                    );
                } else {
                    // Si existe, actualizar el registro
                    await pool.query(
                        `UPDATE experiencia_laboral
                        SET empleo_actual = ?, empresa_entidad = ?, tipo = ?, pais = ?, departamento = ?, municipio = ?, correo_entidad = ?, telefono_entidad = ?, fecha_ingreso = ?, fecha_retiro = ?, cargo_actual = ?, dependencia = ?, direccion = ?
                        WHERE id_experiencia = ?`,
                        [empleo_actual, empresa_entidad, tipo, pais, departamento, municipio, correo_entidad, telefono_entidad, fecha_ingreso, fecha_retiro, cargo_actual, dependencia, direccion, id_experiencia]
                    );
                }

                // Agregar el ID enviado al conjunto de IDs enviados
                sentIdsExperiencia.add(Number(id_experiencia));
            } else {
                // Si no hay ID, insertar un nuevo registro (el ID se generará automáticamente)
                await pool.query(
                    `INSERT INTO experiencia_laboral (id_persona, empleo_actual, empresa_entidad, tipo, pais, departamento, municipio, correo_entidad, telefono_entidad, fecha_ingreso, fecha_retiro, cargo_actual, dependencia, direccion) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [id_persona, empleo_actual, empresa_entidad, tipo, pais, departamento, municipio, correo_entidad, telefono_entidad, fecha_ingreso, fecha_retiro, cargo_actual, dependencia, direccion]
                );

                // Paso 3: Obtener el ID del registro recién insertado
                const [newRecordExperiencia] = await pool.query(
                    `SELECT id_experiencia FROM experiencia_laboral 
                    WHERE id_persona = ? AND empleo_actual = ? AND empresa_entidad = ? AND tipo = ? AND pais = ? AND departamento = ? AND municipio = ? AND correo_entidad = ? AND telefono_entidad = ? AND fecha_ingreso = ? AND fecha_retiro = ? AND cargo_actual = ? AND dependencia = ? AND direccion = ?
                    ORDER BY id_experiencia DESC LIMIT 1`,
                    [id_persona, empleo_actual, empresa_entidad, tipo, pais, departamento, municipio, correo_entidad, telefono_entidad, fecha_ingreso, fecha_retiro, cargo_actual, dependencia, direccion]
                );

                // Asegurarse de que newRecord sea un arreglo
                const newRecordArrayExperiencia = Array.isArray(newRecordExperiencia) ? newRecordExperiencia : [newRecordExperiencia].filter(Boolean);

                if (newRecordArrayExperiencia.length > 0) {
                    const newId = newRecordArrayExperiencia[0].id_experiencia;

                    // Agregar el nuevo ID al conjunto de IDs enviados
                    sentIdsExperiencia.add(newId);
                } else {
                    console.error('No se encontró el registro recién insertado');
                }
            }
        }

        for (let i = 0; i <= 5; i++) {
            if (
                (req.files[`documento_experiencia_${i}`]) && (
                    (datos[`empleo_actual_${i}`] !== undefined && datos[`empleo_actual_${i}`] != '') ||
                    (datos[`empresa_entidad_${i}`] !== undefined && datos[`empresa_entidad_${i}`] != '') ||
                    (datos[`tipo_${i}`] !== undefined && datos[`tipo_${i}`] != '') ||
                    (datos[`pais_${i}`] !== undefined && datos[`pais_${i}`] != '') ||
                    (datos[`departamento_${i}`] !== undefined && datos[`departamento_${i}`] != '') ||
                    (datos[`municipio_${i}`] !== undefined && datos[`municipio_${i}`] != '') ||
                    (datos[`correo_entidad_${i}`] !== undefined && datos[`correo_entidad_${i}`] != '') ||
                    (datos[`telefono_entidad_${i}`] !== undefined && datos[`telefono_entidad_${i}`] != '') ||
                    (datos[`fecha_ingreso_${i}`] !== undefined && datos[`fecha_ingreso_${i}`] != '') ||
                    (datos[`fecha_retiro_${i}`] !== undefined && datos[`fecha_retiro_${i}`] != '') ||
                    (datos[`cargo_actual_${i}`] !== undefined && datos[`cargo_actual_${i}`] != '') ||
                    (datos[`dependencia_${i}`] !== undefined && datos[`dependencia_${i}`] != '') ||
                    (datos[`direccion_${i}`] !== undefined && datos[`direccion_${i}`] != '')
                )) {

                const documentoIdiomaFile = req.files[`documento_experiencia_${i}`][0];
                const nombreOriginalDocumentoExperiencia = documentoIdiomaFile.originalname; // Nombre original

                let condiciones = [];
                let valores = [nombreOriginalDocumentoExperiencia, id_persona];
                
                const columnas = [
                    'empleo_actual',
                    'empresa_entidad',
                    'tipo',
                    'pais',
                    'departamento',
                    'municipio',
                    'correo_entidad',
                    'telefono_entidad',
                    'fecha_ingreso',
                    'fecha_retiro',
                    'cargo_actual',
                    'dependencia',
                    'direccion'
                ];
                
                for (let col of columnas) {
                    const valor = datos[`${col}_${i}`];
                    if (valor === null || valor === undefined || valor === '') {
                        condiciones.push(`${col} IS NULL`);
                    } else {
                        condiciones.push(`${col} = ?`);
                        valores.push(valor);
                    }
                }
                
                const sql = `UPDATE experiencia_laboral SET documento = ? WHERE id_persona = ? AND ${condiciones.join(' AND ')}`;
                
                await pool.query(sql, valores);
                
            }
        }

        // Paso 4: Eliminar los registros que el usuario ha quitado
        const idsToDeleteExperiencia = Array.from(existingIdsExperiencia).filter(id => !sentIdsExperiencia.has(id)); // Convertir el Set a un arreglo
        if (idsToDeleteExperiencia.length > 0) {

            // Crear una cadena de placeholders dinámicamente
            const placeholders = idsToDeleteExperiencia.map(() => '?').join(',');

            // Construir la consulta SQL
            const query = `DELETE FROM experiencia_laboral WHERE id_experiencia IN (${placeholders}) AND id_persona = ?`;

            const values = [...idsToDeleteExperiencia, id_persona];

            // Ejecutar la consulta con los valores
            await pool.query(query, values);

        }

        const [rows] = await pool.query(`SELECT 1 FROM tiempo_experiencia WHERE id_persona = ? LIMIT 1`, [id_persona]);

        if (!rows || rows.length === 0) {
            await pool.query(
                `INSERT INTO tiempo_experiencia (id_persona, anios_servidor_publico, meses_servidor_publico, anios_sector_privado, meses_sector_privado, anios_trabajador_independiente, meses_trabajador_independiente, anios_total_experiencia, meses_total_experiencia) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    id_persona,
                    datos.anios_servidor_publico,
                    datos.meses_servidor_publico,
                    datos.anios_sector_privado,
                    datos.meses_sector_privado,
                    datos.anios_trabajador_independiente,
                    datos.meses_trabajador_independiente,
                    datos.anios_total_experiencia,
                    datos.meses_total_experiencia,
                ]
            );
        } else {
            await pool.query(
                `UPDATE tiempo_experiencia SET 
                    anios_servidor_publico = ?, 
                    meses_servidor_publico = ?, 
                    anios_sector_privado = ?, 
                    meses_sector_privado = ?, 
                    anios_trabajador_independiente = ?, 
                    meses_trabajador_independiente = ?, 
                    anios_total_experiencia = ?, 
                    meses_total_experiencia = ? 
                    WHERE id_persona = ?`,
                [
                    datos.anios_servidor_publico,
                    datos.meses_servidor_publico,
                    datos.anios_sector_privado,
                    datos.meses_sector_privado,
                    datos.anios_trabajador_independiente,
                    datos.meses_trabajador_independiente,
                    datos.anios_total_experiencia,
                    datos.meses_total_experiencia,
                    id_persona
                ]
            );
        }
        res.redirect('/hoja/add');
    } catch (error) {
        console.error('Error al actualizar datos:', error);
        res.status(500).json({ error: 'Error al actualizar datos' });
    }
});

router.get('/generar-pdf', isLoggedIn, async (req, res) => {
    try {
        // Obtener los datos de la base de datos
        const idiomas = await pool.query('SELECT * FROM idiomas WHERE id_persona = ?', [req.user.id_persona]);
        const educacion_basica_media = (await pool.query('SELECT * FROM educacion_basica_media WHERE id_persona = ?', [req.user.id_persona]))[0] || {};
        const educacion_superior = await pool.query('SELECT * FROM educacion_superior WHERE id_persona = ?', [req.user.id_persona]);
        const tiempo_experiencia = (await pool.query('SELECT * FROM tiempo_experiencia WHERE id_persona = ?', [req.user.id_persona]))[0] || {};
        const empleos = await pool.query('SELECT * FROM experiencia_laboral WHERE id_persona = ?', [req.user.id_persona]);
        const empleoActual = empleos.find(empleo => empleo.empleo_actual === 'SI') || null;
        const empleosAnteriores = empleos.filter(empleo => empleo.empleo_actual === 'NO');

        // Definir el contenido del PDF
        const docDefinition = {
            content: [
                { text: 'Hoja de Vida', style: 'header' },
                { text: '\n' }, // Espacio en blanco
                { text: `${req.user.primer_apellido} ${req.user.segundo_apellido} ${req.user.nombres}`, style: 'subheader' },
                { text: `${req.user.tipo_documento} ${req.user.numero_documento}` },
                { text: '\n' }, // Espacio en blanco

                // Sección de Información Personal
                { text: 'Información Personal', style: 'subheader' },
                { text: [{ text: 'Correo Electrónico: ', bold: true }, `${req.user.email || 'No especificado'}`] },
                { text: [{ text: 'Teléfono: ', bold: true }, `${req.user.telefono || 'No especificado'}`] },
                { text: [{ text: 'Sexo: ', bold: true }, `${req.user.sexo === 'M' ? 'Masculino' : 'Femenino'}`] },
                { text: [{ text: 'Nacionalidad: ', bold: true }, `${req.user.nacionalidad || 'No especificado'}`] },
                { text: [{ text: 'País de Nacimiento: ', bold: true }, `${req.user.pais_nacimiento || 'No especificado'}`] },
                { text: [{ text: 'Departamento de Nacimiento: ', bold: true }, `${req.user.departamento_nacimiento || 'No especificado'}`] },
                { text: [{ text: 'Municipio de Nacimiento: ', bold: true }, `${req.user.municipio_nacimiento || 'No especificado'}`] },
                { text: [{ text: 'Fecha de Nacimiento: ', bold: true }, `${req.user.fecha_nacimiento || 'No especificado'}`] },
                { text: '\n' }, // Espacio en blanco

                // Sección de Lugar de Correspondencia
                { text: 'Lugar de correspondencia', style: 'subheader' },
                { text: [{ text: 'Dirección de Correspondencia: ', bold: true }, `${req.user.direccion_correspondencia || 'No especificado'}`] },
                { text: [{ text: 'País de Correspondencia: ', bold: true }, `${req.user.pais_correspondencia || 'No especificado'}`] },
                { text: [{ text: 'Departamento de Correspondencia: ', bold: true }, `${req.user.departamento_correspondencia || 'No especificado'}`] },
                { text: [{ text: 'Municipio de Correspondencia: ', bold: true }, `${req.user.municipio_correspondencia || 'No especificado'}`] },
                { text: '\n' }, // Espacio en blanco

                // Sección de Libreta Militar
                { text: 'Libreta Militar', style: 'subheader' },
                { text: [{ text: 'Tipo de Libreta Militar: ', bold: true }, `${req.user.tipo_libreta_militar || 'No especificado'}`] },
                { text: [{ text: 'Número de Libreta Militar: ', bold: true }, `${req.user.numero_libreta_militar || 'No especificado'}`] },
                { text: [{ text: 'Distrito Militar: ', bold: true }, `${req.user.dm_libreta_militar || 'No especificado'}`] },
                { text: '\n' }, // Espacio en blanco

                // Sección de Educación Básica/Media
                { text: 'Educación Básica/Media', style: 'subheader' },
                { text: [{ text: 'Título: ', bold: true }, `${educacion_basica_media.titulo_obtenido || 'No especificado'}`] },
                { text: [{ text: 'Último curso aprobado: ', bold: true }, `${educacion_basica_media.educacion_basica || 'No especificado'}`] },
                { text: [{ text: 'Año de Graduación: ', bold: true }, `${educacion_basica_media.fecha_grado || 'No especificado'}`] },
                { text: '\n' }, // Espacio en blanco

                // Sección de Educación Superior
                { text: 'Educación Superior', style: 'subheader' },
                ...educacion_superior.map(edu => ({
                    stack: [
                        { text: [{ text: 'Modalidad Académica: ', bold: true }, `${edu.modalidad_academica || 'No especificado'}`] },
                        { text: [{ text: 'Semestres Aprobados: ', bold: true }, `${edu.semestres_aprobados || 'No especificado'}`] },
                        { text: [{ text: 'Graduado: ', bold: true }, `${edu.graduado === 'SI' ? 'Sí' : 'No'}`] },
                        { text: [{ text: 'Título: ', bold: true }, `${edu.nombre_titulo || 'No especificado'}`] },
                        { text: [{ text: 'Fecha de Terminación: ', bold: true }, `${edu.mes_terminacion || 'No especificado'}`] },
                        { text: [{ text: 'Número de Tarjeta Profesional: ', bold: true }, `${edu.numero_tarjeta_profesional || 'No especificado'}`] },
                        { text: '\n' } // Espacio entre cada bloque de educación
                    ]
                })),

                // Sección de Idiomas
                { text: 'Idiomas', style: 'subheader' },
                ...idiomas.map(idioma => ({
                    stack: [
                        { text: [{ text: 'Idioma: ', bold: true }, `${idioma.idioma}`] },
                        { text: [{ text: 'Lo Habla: ', bold: true }, `${idioma.lo_habla}`] },
                        { text: [{ text: 'Lee: ', bold: true }, `${idioma.lo_lee}`] },
                        { text: [{ text: 'Escribe: ', bold: true }, `${idioma.lo_escribe}`] },
                        { text: '\n' } // Espacio entre cada idioma
                    ]
                })),

                // Sección de Experiencia Laboral
                { text: 'Experiencia Laboral', style: 'subheader' },
                { text: 'Empleo Actual:', style: 'subheader2' },
                empleoActual ? {
                    stack: [
                        { text: [{ text: 'Empresa: ', bold: true }, `${empleoActual.empresa_entidad || 'No especificado'}`] },
                        { text: [{ text: 'Dependencia: ', bold: true }, `${empleoActual.dependencia || 'No especificado'}`] },
                        { text: [{ text: 'Cargo: ', bold: true }, `${empleoActual.cargo_actual || 'No especificado'}`] },
                        { text: [{ text: 'Tipo: ', bold: true }, `${empleoActual.tipo || 'No especificado'}`] },
                        { text: [{ text: 'País: ', bold: true }, `${empleoActual.pais || 'No especificado'}`] },
                        { text: [{ text: 'Departamento: ', bold: true }, `${empleoActual.departamento || 'No especificado'}`] },
                        { text: [{ text: 'Municipio: ', bold: true }, `${empleoActual.municipio || 'No especificado'}`] },
                        { text: [{ text: 'Dirección: ', bold: true }, `${empleoActual.direccion || 'No especificado'}`] },
                        { text: [{ text: 'Correo: ', bold: true }, `${empleoActual.correo_entidad || 'No especificado'}`] },
                        { text: [{ text: 'Teléfono: ', bold: true }, `${empleoActual.telefono_entidad || 'No especificado'}`] },
                        { text: [{ text: 'Fecha de Ingreso: ', bold: true }, `${empleoActual.fecha_ingreso || 'No especificado'}`] },
                        { text: [{ text: 'Fecha de Retiro: ', bold: true }, `${empleoActual.fecha_retiro || 'Presente'}`] },
                        { text: '\n' } // Espacio en blanco
                    ]
                } : { text: 'No hay empleo actual registrado. \n' },

                { text: 'Empleos Anteriores:', style: 'subheader2' },
                ...empleosAnteriores.map(empleo => ({
                    stack: [
                        { text: [{ text: 'Empresa: ', bold: true }, `${empleo.empresa_entidad || 'No especificado'}`] },
                        { text: [{ text: 'Dependencia: ', bold: true }, `${empleo.dependencia || 'No especificado'}`] },
                        { text: [{ text: 'Cargo: ', bold: true }, `${empleo.cargo_actual || 'No especificado'}`] },
                        { text: [{ text: 'Tipo: ', bold: true }, `${empleo.tipo || 'No especificado'}`] },
                        { text: [{ text: 'País: ', bold: true }, `${empleo.pais || 'No especificado'}`] },
                        { text: [{ text: 'Departamento: ', bold: true }, `${empleo.departamento || 'No especificado'}`] },
                        { text: [{ text: 'Municipio: ', bold: true }, `${empleo.municipio || 'No especificado'}`] },
                        { text: [{ text: 'Dirección: ', bold: true }, `${empleo.direccion || 'No especificado'}`] },
                        { text: [{ text: 'Correo: ', bold: true }, `${empleo.correo_entidad || 'No especificado'}`] },
                        { text: [{ text: 'Teléfono: ', bold: true }, `${empleo.telefono_entidad || 'No especificado'}`] },
                        { text: [{ text: 'Fecha de Ingreso: ', bold: true }, `${empleo.fecha_ingreso || 'No especificado'}`] },
                        { text: [{ text: 'Fecha de Retiro: ', bold: true }, `${empleo.fecha_retiro || 'No especificado'}`] },
                        { text: '\n' } // Espacio entre cada empleo
                    ]
                })),

                // Sección de Tiempo de Experiencia
                { text: 'Tiempo de Experiencia', style: 'subheader' },
                { text: [{ text: 'Años de Servidor Público: ', bold: true }, `${tiempo_experiencia.anios_servidor_publico || 'No especificado'}`] },
                { text: [{ text: 'Meses de Servidor Público: ', bold: true }, `${tiempo_experiencia.meses_servidor_publico || 'No especificado'}`] },
                { text: [{ text: 'Años de Sector Privado: ', bold: true }, `${tiempo_experiencia.anios_sector_privado || 'No especificado'}`] },
                { text: [{ text: 'Meses de Sector Privado: ', bold: true }, `${tiempo_experiencia.meses_sector_privado || 'No especificado'}`] },
                { text: [{ text: 'Años de Trabajador Independiente: ', bold: true }, `${tiempo_experiencia.anios_trabajador_independiente || 'No especificado'}`] },
                { text: [{ text: 'Meses de Trabajador Independiente: ', bold: true }, `${tiempo_experiencia.meses_trabajador_independiente || 'No especificado'}`] },
                { text: [{ text: 'Años de Experiencia Total: ', bold: true }, `${tiempo_experiencia.anios_total_experiencia || 'No especificado'}`] },
                { text: [{ text: 'Meses de Experiencia Total: ', bold: true }, `${tiempo_experiencia.meses_total_experiencia || 'No especificado'}`] },
                { text: '\n' }, // Espacio en blanco

            ],
            styles: {
                header: {
                    font: 'Helvetica',
                    fontSize: 50,
                    bold: true,
                    margin: [0, 0, 0, 10]
                },
                subheader: {
                    font: 'Helvetica',
                    fontSize: 20,
                    bold: true,
                    margin: [0, 10, 0, 5]
                },
                subheader2: {
                    font: 'Helvetica',
                    fontSize: 16,
                    bold: true,
                    margin: [0, 5, 0, 5]
                }
            },
            defaultStyle: {
                font: 'Helvetica',
            }
        };

        // Generar el PDF
        const pdfDoc = printer.createPdfKitDocument(docDefinition);
        const nombresSinEspacios = req.user.nombres.replace(/ /g, '_');
        const nombreArchivo = `HOJA_DE_VIDA_${req.user.primer_apellido}_${req.user.segundo_apellido}_${nombresSinEspacios}.pdf`;
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=${nombreArchivo}`);

        pdfDoc.pipe(res);
        pdfDoc.end();
    } catch (error) {
        console.error('Error al generar el PDF:', error);
        res.status(500).send('Error al generar el PDF');
    }
});

router.get('/generar-pdf/:unique_identifier', async (req, res) => {
    const { unique_identifier } = req.params;
    const persona = (await pool.query('SELECT * FROM personas WHERE unique_identifier = ?', [unique_identifier]))[0];
    if (!persona) {
        return res.status(404).send('Persona no encontrada');
    }
    try {
        // Obtener los datos de la base de datos
        const idiomas = await pool.query('SELECT * FROM idiomas WHERE id_persona = ?', [persona.id_persona]);
        const educacion_basica_media = (await pool.query('SELECT * FROM educacion_basica_media WHERE id_persona = ?', [persona.id_persona]))[0] || {};
        const educacion_superior = await pool.query('SELECT * FROM educacion_superior WHERE id_persona = ?', [persona.id_persona]);
        const tiempo_experiencia = (await pool.query('SELECT * FROM tiempo_experiencia WHERE id_persona = ?', [persona.id_persona]))[0] || {};
        const empleos = await pool.query('SELECT * FROM experiencia_laboral WHERE id_persona = ?', [persona.id_persona]);
        const empleoActual = empleos.find(empleo => empleo.empleo_actual === 'SI') || null;
        const empleosAnteriores = empleos.filter(empleo => empleo.empleo_actual === 'NO');

        // Definir el contenido del PDF
        const docDefinition = {
            content: [
                { text: 'Hoja de Vida', style: 'header' },
                { text: '\n' }, // Espacio en blanco
                { text: `${persona.primer_apellido} ${persona.segundo_apellido} ${persona.nombres}`, style: 'subheader' },
                { text: `${persona.tipo_documento} ${persona.numero_documento}` },
                { text: '\n' }, // Espacio en blanco

                // Sección de Información Personal
                { text: 'Información Personal', style: 'subheader' },
                { text: [{ text: 'Correo Electrónico: ', bold: true }, `${persona.email || 'No especificado'}`] },
                { text: [{ text: 'Teléfono: ', bold: true }, `${persona.telefono || 'No especificado'}`] },
                { text: [{ text: 'Sexo: ', bold: true }, `${persona.sexo === 'M' ? 'Masculino' : 'Femenino'}`] },
                { text: [{ text: 'Nacionalidad: ', bold: true }, `${persona.nacionalidad || 'No especificado'}`] },
                { text: [{ text: 'País de Nacimiento: ', bold: true }, `${persona.pais_nacimiento || 'No especificado'}`] },
                { text: [{ text: 'Departamento de Nacimiento: ', bold: true }, `${persona.departamento_nacimiento || 'No especificado'}`] },
                { text: [{ text: 'Municipio de Nacimiento: ', bold: true }, `${persona.municipio_nacimiento || 'No especificado'}`] },
                { text: [{ text: 'Fecha de Nacimiento: ', bold: true }, `${persona.fecha_nacimiento || 'No especificado'}`] },
                { text: '\n' }, // Espacio en blanco

                // Sección de Lugar de Correspondencia
                { text: 'Lugar de correspondencia', style: 'subheader' },
                { text: [{ text: 'Dirección de Correspondencia: ', bold: true }, `${persona.direccion_correspondencia || 'No especificado'}`] },
                { text: [{ text: 'País de Correspondencia: ', bold: true }, `${persona.pais_correspondencia || 'No especificado'}`] },
                { text: [{ text: 'Departamento de Correspondencia: ', bold: true }, `${persona.departamento_correspondencia || 'No especificado'}`] },
                { text: [{ text: 'Municipio de Correspondencia: ', bold: true }, `${persona.municipio_correspondencia || 'No especificado'}`] },
                { text: '\n' }, // Espacio en blanco

                // Sección de Libreta Militar
                { text: 'Libreta Militar', style: 'subheader' },
                { text: [{ text: 'Tipo de Libreta Militar: ', bold: true }, `${persona.tipo_libreta_militar || 'No especificado'}`] },
                { text: [{ text: 'Número de Libreta Militar: ', bold: true }, `${persona.numero_libreta_militar || 'No especificado'}`] },
                { text: [{ text: 'Distrito Militar: ', bold: true }, `${persona.dm_libreta_militar || 'No especificado'}`] },
                { text: '\n' }, // Espacio en blanco

                // Sección de Educación Básica/Media
                { text: 'Educación Básica/Media', style: 'subheader' },
                { text: [{ text: 'Título: ', bold: true }, `${educacion_basica_media.titulo_obtenido || 'No especificado'}`] },
                { text: [{ text: 'Último curso aprobado: ', bold: true }, `${educacion_basica_media.educacion_basica || 'No especificado'}`] },
                { text: [{ text: 'Año de Graduación: ', bold: true }, `${educacion_basica_media.fecha_grado || 'No especificado'}`] },
                { text: '\n' }, // Espacio en blanco

                // Sección de Educación Superior
                { text: 'Educación Superior', style: 'subheader' },
                ...educacion_superior.map(edu => ({
                    stack: [
                        { text: [{ text: 'Modalidad Académica: ', bold: true }, `${edu.modalidad_academica || 'No especificado'}`] },
                        { text: [{ text: 'Semestres Aprobados: ', bold: true }, `${edu.semestres_aprobados || 'No especificado'}`] },
                        { text: [{ text: 'Graduado: ', bold: true }, `${edu.graduado === 'SI' ? 'Sí' : 'No'}`] },
                        { text: [{ text: 'Título: ', bold: true }, `${edu.nombre_titulo || 'No especificado'}`] },
                        { text: [{ text: 'Fecha de Terminación: ', bold: true }, `${edu.mes_terminacion || 'No especificado'}`] },
                        { text: [{ text: 'Número de Tarjeta Profesional: ', bold: true }, `${edu.numero_tarjeta_profesional || 'No especificado'}`] },
                        { text: '\n' } // Espacio entre cada bloque de educación
                    ]
                })),

                // Sección de Idiomas
                { text: 'Idiomas', style: 'subheader' },
                ...idiomas.map(idioma => ({
                    stack: [
                        { text: [{ text: 'Idioma: ', bold: true }, `${idioma.idioma}`] },
                        { text: [{ text: 'Lo Habla: ', bold: true }, `${idioma.lo_habla}`] },
                        { text: [{ text: 'Lee: ', bold: true }, `${idioma.lo_lee}`] },
                        { text: [{ text: 'Escribe: ', bold: true }, `${idioma.lo_escribe}`] },
                        { text: '\n' } // Espacio entre cada idioma
                    ]
                })),

                // Sección de Experiencia Laboral
                { text: 'Experiencia Laboral', style: 'subheader' },
                { text: 'Empleo Actual:', style: 'subheader2' },
                empleoActual ? {
                    stack: [
                        { text: [{ text: 'Empresa: ', bold: true }, `${empleoActual.empresa_entidad || 'No especificado'}`] },
                        { text: [{ text: 'Dependencia: ', bold: true }, `${empleoActual.dependencia || 'No especificado'}`] },
                        { text: [{ text: 'Cargo: ', bold: true }, `${empleoActual.cargo_actual || 'No especificado'}`] },
                        { text: [{ text: 'Tipo: ', bold: true }, `${empleoActual.tipo || 'No especificado'}`] },
                        { text: [{ text: 'País: ', bold: true }, `${empleoActual.pais || 'No especificado'}`] },
                        { text: [{ text: 'Departamento: ', bold: true }, `${empleoActual.departamento || 'No especificado'}`] },
                        { text: [{ text: 'Municipio: ', bold: true }, `${empleoActual.municipio || 'No especificado'}`] },
                        { text: [{ text: 'Dirección: ', bold: true }, `${empleoActual.direccion || 'No especificado'}`] },
                        { text: [{ text: 'Correo: ', bold: true }, `${empleoActual.correo_entidad || 'No especificado'}`] },
                        { text: [{ text: 'Teléfono: ', bold: true }, `${empleoActual.telefono_entidad || 'No especificado'}`] },
                        { text: [{ text: 'Fecha de Ingreso: ', bold: true }, `${empleoActual.fecha_ingreso || 'No especificado'}`] },
                        { text: [{ text: 'Fecha de Retiro: ', bold: true }, `${empleoActual.fecha_retiro || 'Presente'}`] },
                        { text: '\n' } // Espacio en blanco
                    ]
                } : { text: 'No hay empleo actual registrado. \n' },

                { text: 'Empleos Anteriores:', style: 'subheader2' },
                ...empleosAnteriores.map(empleo => ({
                    stack: [
                        { text: [{ text: 'Empresa: ', bold: true }, `${empleo.empresa_entidad || 'No especificado'}`] },
                        { text: [{ text: 'Dependencia: ', bold: true }, `${empleo.dependencia || 'No especificado'}`] },
                        { text: [{ text: 'Cargo: ', bold: true }, `${empleo.cargo_actual || 'No especificado'}`] },
                        { text: [{ text: 'Tipo: ', bold: true }, `${empleo.tipo || 'No especificado'}`] },
                        { text: [{ text: 'País: ', bold: true }, `${empleo.pais || 'No especificado'}`] },
                        { text: [{ text: 'Departamento: ', bold: true }, `${empleo.departamento || 'No especificado'}`] },
                        { text: [{ text: 'Municipio: ', bold: true }, `${empleo.municipio || 'No especificado'}`] },
                        { text: [{ text: 'Dirección: ', bold: true }, `${empleo.direccion || 'No especificado'}`] },
                        { text: [{ text: 'Correo: ', bold: true }, `${empleo.correo_entidad || 'No especificado'}`] },
                        { text: [{ text: 'Teléfono: ', bold: true }, `${empleo.telefono_entidad || 'No especificado'}`] },
                        { text: [{ text: 'Fecha de Ingreso: ', bold: true }, `${empleo.fecha_ingreso || 'No especificado'}`] },
                        { text: [{ text: 'Fecha de Retiro: ', bold: true }, `${empleo.fecha_retiro || 'No especificado'}`] },
                        { text: '\n' } // Espacio entre cada empleo
                    ]
                })),

                // Sección de Tiempo de Experiencia
                { text: 'Tiempo de Experiencia', style: 'subheader' },
                { text: [{ text: 'Años de Servidor Público: ', bold: true }, `${tiempo_experiencia.anios_servidor_publico || 'No especificado'}`] },
                { text: [{ text: 'Meses de Servidor Público: ', bold: true }, `${tiempo_experiencia.meses_servidor_publico || 'No especificado'}`] },
                { text: [{ text: 'Años de Sector Privado: ', bold: true }, `${tiempo_experiencia.anios_sector_privado || 'No especificado'}`] },
                { text: [{ text: 'Meses de Sector Privado: ', bold: true }, `${tiempo_experiencia.meses_sector_privado || 'No especificado'}`] },
                { text: [{ text: 'Años de Trabajador Independiente: ', bold: true }, `${tiempo_experiencia.anios_trabajador_independiente || 'No especificado'}`] },
                { text: [{ text: 'Meses de Trabajador Independiente: ', bold: true }, `${tiempo_experiencia.meses_trabajador_independiente || 'No especificado'}`] },
                { text: [{ text: 'Años de Experiencia Total: ', bold: true }, `${tiempo_experiencia.anios_total_experiencia || 'No especificado'}`] },
                { text: [{ text: 'Meses de Experiencia Total: ', bold: true }, `${tiempo_experiencia.meses_total_experiencia || 'No especificado'}`] },
                { text: '\n' }, // Espacio en blanco

            ],
            styles: {
                header: {
                    font: 'Helvetica',
                    fontSize: 50,
                    bold: true,
                    margin: [0, 0, 0, 10]
                },
                subheader: {
                    font: 'Helvetica',
                    fontSize: 20,
                    bold: true,
                    margin: [0, 10, 0, 5]
                },
                subheader2: {
                    font: 'Helvetica',
                    fontSize: 16,
                    bold: true,
                    margin: [0, 5, 0, 5]
                }
            },
            defaultStyle: {
                font: 'Helvetica',
            }
        };

        // Generar el PDF
        const pdfDoc = printer.createPdfKitDocument(docDefinition);
        const nombresSinEspacios = persona.nombres.replace(/ /g, '_');
        const nombreArchivo = `HOJA_DE_VIDA_${persona.primer_apellido}_${persona.segundo_apellido}_${nombresSinEspacios}.pdf`;
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=${nombreArchivo}`);

        pdfDoc.pipe(res);
        pdfDoc.end();
    } catch (error) {
        console.error('Error al generar el PDF:', error);
        res.status(500).send('Error al generar el PDF');
    }
});

module.exports = router;