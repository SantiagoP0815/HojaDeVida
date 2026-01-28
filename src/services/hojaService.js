const hojaRepository = require('../repositories/hojaRepository');
const db = require('../database');
const path = require('path');
const fs = require('fs');
const PdfPrinter = require('pdfmake');

const fonts = { Helvetica: { normal: 'Helvetica', bold: 'Helvetica-Bold', italics: 'Helvetica-Oblique', bolditalics: 'Helvetica-BoldOblique' } };
const printer = new PdfPrinter(fonts);

class HojaService {

    async getHojaDeVidaData(idPersona) {
        const [idiomas, educacion_basica_media, educacion_superior, tiempo_experiencia, empleos, documentos] = await Promise.all([
            hojaRepository.getIdiomas(idPersona),
            hojaRepository.getEducacionBasicaMedia(idPersona),
            hojaRepository.getEducacionSuperior(idPersona),
            hojaRepository.getTiempoExperiencia(idPersona),
            hojaRepository.getExperienciaLaboral(idPersona),
            hojaRepository.getDocumentos(idPersona)
        ]);

        const empleoActual = empleos.find(empleo => empleo.empleo_actual === 'SI') || null;
        const empleosAnteriores = empleos.filter(empleo => empleo.empleo_actual === 'NO');

        return {
            idiomas,
            educacion_basica_media,
            educacion_superior,
            tiempo_experiencia,
            empleoActual,
            empleosAnteriores,
            documentos
        };
    }

    async getDataForEdit(idPersona) {
        const persona = await hojaRepository.getPersonaById(idPersona);
        if (!persona) return null;

        const data = await this.getHojaDeVidaData(idPersona);

        // Helper to format date as YYYY-MM-DD
        const formatDate = (date) => {
            if (!date) return '';
            const d = new Date(date);
            if (isNaN(d.getTime())) return '';
            return d.toISOString().split('T')[0];
        };

        // Helper to format date as YYYY-MM
        const formatMonth = (date) => {
            if (!date) return '';
            const d = new Date(date);
            if (isNaN(d.getTime())) return '';
            return d.toISOString().slice(0, 7);
        };

        // Format Persona dates
        if (persona.fecha_nacimiento) persona.fecha_nacimiento = formatDate(persona.fecha_nacimiento);

        // Format Educacion Basica dates
        if (data.educacion_basica_media && data.educacion_basica_media.fecha_grado) {
            data.educacion_basica_media.fecha_grado = formatMonth(data.educacion_basica_media.fecha_grado);
        }

        // Format Educacion Superior dates
        if (data.educacion_superior) {
            data.educacion_superior.forEach(estudio => {
                if (estudio.mes_terminacion) estudio.mes_terminacion = formatMonth(estudio.mes_terminacion);
            });
        }

        // Format Experience dates
        if (data.empleoActual) {
            if (data.empleoActual.fecha_ingreso) data.empleoActual.fecha_ingreso = formatDate(data.empleoActual.fecha_ingreso);
            if (data.empleoActual.fecha_retiro) data.empleoActual.fecha_retiro = formatDate(data.empleoActual.fecha_retiro);
        }

        if (data.empleosAnteriores) {
            data.empleosAnteriores.forEach(empleo => {
                if (empleo.fecha_ingreso) empleo.fecha_ingreso = formatDate(empleo.fecha_ingreso);
                if (empleo.fecha_retiro) empleo.fecha_retiro = formatDate(empleo.fecha_retiro);
            });
        }

        return { user: persona, ...data };
    }

    async getPersonDataForView(uniqueIdentifier) {
        const persona = await hojaRepository.getPersonaByUniqueIdentifier(uniqueIdentifier);
        if (!persona) return null;

        const data = await this.getHojaDeVidaData(persona.id_persona);
        return { persona, ...data };
    }

    async getPersonDataForPdf(idPersona) {
        const persona = await hojaRepository.getPersonaById(idPersona);
        if (!persona) return null;
        const data = await this.getHojaDeVidaData(idPersona);
        return { persona, ...data };
    }

    async getPersonDataForPdfByUniqueId(uniqueIdentifier) {
        const persona = await hojaRepository.getPersonaByUniqueIdentifier(uniqueIdentifier);
        if (!persona) return null;
        const data = await this.getHojaDeVidaData(persona.id_persona);
        return { persona, ...data };
    }

    async updateHojaDeVida(idPersona, datos, files) {
        return db.withTransaction(async (conn) => {
            await hojaRepository.ensureDocumentosTable(conn);

            // 1. Handle Main Document Upload
            if (files && files['documento_id']) {
                const file = files['documento_id'][0];
                const relativePath = path.join('src', 'docs', file.filename);
                await hojaRepository.saveDocumento(conn, {
                    id_persona: idPersona,
                    original_name: file.originalname,
                    filename: file.filename,
                    mimetype: file.mimetype,
                    size: file.size,
                    path: relativePath
                });
                await hojaRepository.updatePersonaArchivo(conn, idPersona, file.filename);
            }

            // 1.1 Handle Profile Photo Upload
            if (files && files['foto_perfil']) {
                const file = files['foto_perfil'][0];
                // Save photo info to persona table (assuming column exists)
                await hojaRepository.updatePersonaFoto(conn, idPersona, file.filename);
            }

            // 2. Update Persona
            await hojaRepository.updatePersona(conn, idPersona, datos);

            // 3. Update Educacion Basica
            await hojaRepository.saveEducacionBasica(conn, idPersona, datos);

            // 4. Update Educacion Superior
            const undefinedToNull = (value) => value === "" || value === "0" || value === undefined ? null : value;
            const records = [];
            for (let i = 0; i <= 5; i++) {
                if ((datos[`id_educacion_superior_${i}`] || datos[`modalidad_academica_${i}`] || datos[`semestres_aprobados_${i}`])) {
                    records.push({
                        id_educacion_superior: undefinedToNull(datos[`id_educacion_superior_${i}`]),
                        modalidad_academica: undefinedToNull(datos[`modalidad_academica_${i}`]),
                        semestres_aprobados: undefinedToNull(datos[`semestres_aprobados_${i}`]),
                        graduado: undefinedToNull(datos[`graduado_${i}`]),
                        nombre_titulo: undefinedToNull(datos[`nombre_titulo_${i}`]),
                        mes_terminacion: undefinedToNull(datos[`mes_terminacion_${i}`]),
                        numero_tarjeta_profesional: undefinedToNull(datos[`numero_tarjeta_profesional_${i}`]),
                    });
                }
            }

            const existingRecords = await hojaRepository.getEducacionSuperior(idPersona);
            const existingIds = new Set((Array.isArray(existingRecords) ? existingRecords : []).map(r => Number(r.id_educacion_superior)));
            const sentIds = new Set();

            for (const record of records) {
                const id = await hojaRepository.saveEducacionSuperior(conn, idPersona, record);
                sentIds.add(Number(id));
            }

            // Files for Educacion Superior
            for (let i = 0; i <= 5; i++) {
                if (files && files[`documento_educacion_superior_${i}`]) {
                    const file = files[`documento_educacion_superior_${i}`][0];
                    const nombreTitulo = datos[`nombre_titulo_${i}`];
                    if (nombreTitulo) {
                        await hojaRepository.updateEducacionSuperiorDocumento(conn, idPersona, nombreTitulo, file.filename);
                    }
                }
            }

            const idsToDelete = Array.from(existingIds).filter(id => !sentIds.has(id));
            await hojaRepository.deleteEducacionSuperior(conn, idPersona, idsToDelete);


            // 5. Update Idiomas
            const recordsIdiomas = [];
            for (let i = 0; i <= 5; i++) {
                if ((datos[`id_idioma_${i}`] || datos[`idioma_${i}`])) {
                    recordsIdiomas.push({
                        id_idioma: undefinedToNull(datos[`id_idioma_${i}`]),
                        idioma: undefinedToNull(datos[`idioma_${i}`]),
                        habla: undefinedToNull(datos[`habla_${i}`]),
                        lee: undefinedToNull(datos[`lee_${i}`]),
                        escribe: undefinedToNull(datos[`escribe_${i}`])
                    });
                }
            }
            const existingRecIdsIdiomas = await hojaRepository.getIdiomas(idPersona);
            const existingIdsIdiomas = new Set((Array.isArray(existingRecIdsIdiomas) ? existingRecIdsIdiomas : []).map(r => Number(r.id_idioma)));
            const sentIdsIdiomas = new Set();

            for (const rec of recordsIdiomas) {
                const id = await hojaRepository.saveIdioma(conn, idPersona, rec);
                sentIdsIdiomas.add(Number(id));
            }

            // Files for Idiomas
            for (let i = 0; i <= 5; i++) {
                if (files && files[`documento_idioma_${i}`]) {
                    const file = files[`documento_idioma_${i}`][0];
                    const idiomaNombre = datos[`idioma_${i}`];
                    if (idiomaNombre) await hojaRepository.updateIdiomaDocumento(conn, idPersona, idiomaNombre, file.filename);
                }
            }

            const idsDelIdiomas = Array.from(existingIdsIdiomas).filter(id => !sentIdsIdiomas.has(id));
            await hojaRepository.deleteIdiomas(conn, idPersona, idsDelIdiomas);

            // 6. Update Experiencia Laboral
            const recordsExp = [];
            for (let i = 0; i <= 5; i++) {
                if ((datos[`id_experiencia_${i}`] || datos[`empresa_entidad_${i}`] || datos[`cargo_actual_${i}`])) {
                    recordsExp.push({
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
                    });
                }
            }

            const existingRecExp = await hojaRepository.getExperienciaLaboral(idPersona);
            const existingIdsExp = new Set((Array.isArray(existingRecExp) ? existingRecExp : []).map(r => Number(r.id_experiencia)));
            const sentIdsExp = new Set();

            for (const rec of recordsExp) {
                const id = await hojaRepository.saveExperienciaLaboral(conn, idPersona, rec);
                sentIdsExp.add(Number(id));
            }

            // Files for Experiencia
            for (let i = 0; i <= 5; i++) {
                if (files && files[`documento_experiencia_${i}`]) {
                    const file = files[`documento_experiencia_${i}`][0];
                    const empresa = datos[`empresa_entidad_${i}`];
                    if (empresa) await hojaRepository.updateExperienciaLaboralDocumento(conn, idPersona, empresa, file.filename);
                }
            }

            const idsDelExp = Array.from(existingIdsExp).filter(id => !sentIdsExp.has(id));
            await hojaRepository.deleteExperienciaLaboral(conn, idPersona, idsDelExp);

            // 7. Update Tiempo Experiencia
            await hojaRepository.saveTiempoExperiencia(conn, idPersona, datos);
        });
    }

    async deleteDocumento(idDocumento, idPersona, isAdmin, docsDir) {
        return db.withTransaction(async (conn) => {
            const doc = await hojaRepository.getDocumentoById(idDocumento);
            if (!doc) throw new Error('Documento no encontrado');
            if (doc.id_persona !== idPersona && isAdmin !== 'SI') throw new Error('No autorizado');

            const filePath = path.join(docsDir, doc.filename);
            try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch (e) { }

            await hojaRepository.deleteDocumento(conn, idDocumento);
            await hojaRepository.updatePersonaArchivo(conn, doc.id_persona, null); // Only if it matches? Logic in original was specific.
            // Original logic: UPDATE personas SET nombre_original_archivo = NULL WHERE id_persona = ? AND nombre_original_archivo = ?
            // Let's replicate that safely.
            await conn.query('UPDATE personas SET nombre_original_archivo = NULL WHERE id_persona = ? AND nombre_original_archivo = ?', [doc.id_persona, doc.filename]);
        });
    }

    generatePdfDocDefinition(data) {
        const { persona, idiomas, educacion_basica_media, educacion_superior, tiempo_experiencia, empleoActual, empleosAnteriores } = data;
        const docsDir = path.join(__dirname, '..', 'docs');
        const imgDir = path.join(__dirname, '..', 'public', 'img');

        // Helper to get image as base64
        const getImageBase64 = (filePath) => {
            try {
                if (fs.existsSync(filePath)) {
                    return 'data:image/jpeg;base64,' + fs.readFileSync(filePath).toString('base64');
                }
            } catch (e) {
                console.error('Error reading image for PDF:', e);
            }
            return null;
        };

        // Helper to format date
        const formatDate = (dateVal) => {
            if (!dateVal) return 'N/A';
            const date = new Date(dateVal);
            if (isNaN(date.getTime())) return dateVal;
            const day = String(date.getUTCDate()).padStart(2, '0');
            const month = String(date.getUTCMonth() + 1).padStart(2, '0');
            const year = date.getUTCFullYear();
            return `${day}/${month}/${year}`;
        };

        const bgImage = getImageBase64(path.join(imgDir, 'IGLESIA.jpg'));
        const profilePhoto = data.persona.foto_perfil ? getImageBase64(path.join(docsDir, data.persona.foto_perfil)) : null;

        // Helper for Sections (Cleaner, no box)
        const createSection = (title, content) => {
            return {
                stack: [
                    { text: title.toUpperCase(), style: 'sectionTitle' },
                    { canvas: [{ type: 'line', x1: 0, y1: 2, x2: 515, y2: 2, lineWidth: 1, lineColor: '#dee2e6' }] },
                    { text: ' ', fontSize: 8 }, // Spacing after line
                    content
                ],
                margin: [0, 0, 0, 20]
            };
        };

        // Helper for Key-Value pairs (Cleaner)
        const createField = (label, value) => {
            return {
                stack: [
                    { text: label.toUpperCase(), style: 'label' },
                    { text: value || 'N/A', style: 'value' }
                ],
                margin: [0, 0, 0, 8]
            };
        };

        return {
            background: bgImage ? function (currentPage, pageSize) {
                return {
                    image: bgImage,
                    width: pageSize.width,
                    height: pageSize.height,
                    opacity: 0.05 // Very subtle
                };
            } : null,
            content: [
                // Header (Clean Layout)
                {
                    columns: [
                        {
                            width: 110,
                            stack: [
                                profilePhoto ? {
                                    image: profilePhoto,
                                    width: 100,
                                    height: 100,
                                    alignment: 'center',
                                    style: 'profilePhoto'
                                } : {
                                    text: 'Sin Foto',
                                    alignment: 'center',
                                    margin: [0, 35, 0, 0],
                                    color: '#adb5bd',
                                    fontSize: 9
                                }
                            ]
                        },
                        {
                            width: '*',
                            margin: [20, 5, 0, 0],
                            stack: [
                                { text: `${persona.nombres} ${persona.primer_apellido} ${persona.segundo_apellido || ''}`, style: 'headerName' },
                                { text: `${persona.tipo_documento} ${persona.numero_documento}`, style: 'headerId' },
                                { text: ' ', fontSize: 5 },
                                {
                                    columns: [
                                        {
                                            width: 'auto',
                                            text: [
                                                { text: 'Email: ', style: 'headerLabel' },
                                                { text: persona.email, style: 'headerValue' }
                                            ],
                                            margin: [0, 0, 20, 0]
                                        },
                                        {
                                            width: 'auto',
                                            text: [
                                                { text: 'Tel: ', style: 'headerLabel' },
                                                { text: persona.telefono, style: 'headerValue' }
                                            ]
                                        }
                                    ]
                                },
                                {
                                    columns: [
                                        {
                                            width: 'auto',
                                            text: [
                                                { text: 'Dirección: ', style: 'headerLabel' },
                                                { text: `${persona.direccion_correspondencia}, ${persona.municipio_correspondencia}`, style: 'headerValue' }
                                            ]
                                        }
                                    ],
                                    margin: [0, 2, 0, 0]
                                }
                            ]
                        }
                    ],
                    margin: [0, 0, 0, 25]
                },

                // 1. Datos Personales
                createSection('1. Datos Personales', {
                    columns: [
                        {
                            width: '33%',
                            stack: [
                                createField('Nacionalidad', persona.nacionalidad),
                                createField('Lugar Nacimiento', `${persona.municipio_nacimiento}, ${persona.departamento_nacimiento}`)
                            ]
                        },
                        {
                            width: '33%',
                            stack: [
                                createField('Sexo', persona.sexo === 'M' ? 'Masculino' : 'Femenino'),
                                createField('Fecha Nacimiento', formatDate(persona.fecha_nacimiento))
                            ]
                        },
                        {
                            width: '33%',
                            stack: [
                                createField('Libreta Militar', `${persona.tipo_libreta_militar} - ${persona.numero_libreta_militar || 'N/A'}`),
                                createField('País', persona.pais_correspondencia)
                            ]
                        }
                    ]
                }),

                // 2. Formación Académica
                createSection('2. Formación Académica', {
                    stack: [
                        { text: 'Educación Básica y Media', style: 'subSectionTitle' },
                        {
                            ul: [
                                {
                                    text: [
                                        { text: educacion_basica_media.titulo_obtenido || 'Bachiller', style: 'itemTitle' },
                                        { text: `\nGrado ${educacion_basica_media.educacion_basica}° - ${formatDate(educacion_basica_media.fecha_grado) || ''}`, style: 'itemSubtitle' }
                                    ],
                                    margin: [0, 0, 0, 10]
                                }
                            ],
                            margin: [0, 0, 0, 15]
                        },
                        { text: 'Educación Superior', style: 'subSectionTitle' },
                        educacion_superior.length > 0 ? {
                            ul: educacion_superior.map(est => ({
                                text: [
                                    { text: est.nombre_titulo, style: 'itemTitle' },
                                    { text: `\n${est.modalidad_academica} - ${est.semestres_aprobados} Semestres`, style: 'itemSubtitle' },
                                    est.graduado === 'SI' ? { text: '\nGRADUADO', style: 'badgeSuccess' } : { text: '\nEN CURSO', style: 'badge' }
                                ],
                                margin: [0, 0, 0, 10]
                            }))
                        } : { text: 'No registrada', style: 'itemSubtitle', margin: [0, 0, 0, 10] },
                        { text: 'Idiomas', style: 'subSectionTitle', margin: [0, 10, 0, 5] },
                        idiomas.length > 0 ? {
                            ul: idiomas.map(idioma => ({
                                text: [
                                    { text: idioma.idioma, style: 'itemTitle' },
                                    { text: `\nHabla: ${idioma.lo_habla} | Lee: ${idioma.lo_lee} | Escribe: ${idioma.lo_escribe}`, style: 'itemSubtitle' }
                                ],
                                margin: [0, 0, 0, 5]
                            }))
                        } : { text: 'No registrados', style: 'itemSubtitle' }
                    ]
                }),

                // 3. Experiencia Laboral
                createSection('3. Experiencia Laboral', {
                    stack: [
                        empleoActual && empleoActual.empresa_entidad ? {
                            stack: [
                                { text: 'EMPLEO ACTUAL', style: 'badgeSuccess', alignment: 'left', margin: [0, 0, 0, 5] },
                                {
                                    columns: [
                                        { width: '*', text: empleoActual.cargo_actual, style: 'jobTitle' },
                                        { width: 'auto', text: 'Presente', style: 'jobDate', alignment: 'right' }
                                    ]
                                },
                                { text: empleoActual.empresa_entidad, style: 'jobCompany' },
                                { text: `${empleoActual.municipio}, ${empleoActual.departamento}`, style: 'jobLocation' },
                                { text: `Dependencia: ${empleoActual.dependencia || 'N/A'}`, style: 'jobMeta', margin: [0, 2, 0, 15] }
                            ]
                        } : null,
                        empleosAnteriores.length > 0 ? {
                            stack: empleosAnteriores.map(emp => ({
                                stack: [
                                    {
                                        columns: [
                                            { width: '*', text: emp.cargo_actual, style: 'jobTitle' },
                                            { width: 'auto', text: `${formatDate(emp.fecha_ingreso)} - ${formatDate(emp.fecha_retiro)}`, style: 'jobDate', alignment: 'right' }
                                        ]
                                    },
                                    { text: emp.empresa_entidad, style: 'jobCompany' },
                                    { text: `${emp.municipio}, ${emp.departamento}`, style: 'jobLocation' },
                                    { text: `Dependencia: ${emp.dependencia || 'N/A'}`, style: 'jobMeta', margin: [0, 2, 0, 15] }
                                ]
                            }))
                        } : { text: 'No hay empleos anteriores registrados.', style: 'itemSubtitle' }
                    ]
                }),

                // 4. Tiempo Total
                createSection('4. Tiempo Total de Experiencia', {
                    table: {
                        headerRows: 1,
                        widths: ['*', 'auto', 'auto'],
                        body: [
                            [
                                { text: 'TIPO DE EXPERIENCIA', style: 'tableHeader' },
                                { text: 'AÑOS', style: 'tableHeader', alignment: 'center' },
                                { text: 'MESES', style: 'tableHeader', alignment: 'center' }
                            ],
                            ['Servidor Público', { text: tiempo_experiencia.anios_servidor_publico || 0, alignment: 'center', style: 'value' }, { text: tiempo_experiencia.meses_servidor_publico || 0, alignment: 'center', style: 'value' }],
                            ['Sector Privado', { text: tiempo_experiencia.anios_sector_privado || 0, alignment: 'center', style: 'value' }, { text: tiempo_experiencia.meses_sector_privado || 0, alignment: 'center', style: 'value' }],
                            ['Trabajador Independiente', { text: tiempo_experiencia.anios_trabajador_independiente || 0, alignment: 'center', style: 'value' }, { text: tiempo_experiencia.meses_trabajador_independiente || 0, alignment: 'center', style: 'value' }],
                            [
                                { text: 'TOTAL', bold: true, color: '#0d6efd' },
                                { text: tiempo_experiencia.anios_total_experiencia || 0, bold: true, alignment: 'center', color: '#0d6efd' },
                                { text: tiempo_experiencia.meses_total_experiencia || 0, bold: true, alignment: 'center', color: '#0d6efd' }
                            ]
                        ]
                    },
                    layout: 'lightHorizontalLines'
                })
            ],
            styles: {
                headerName: {
                    fontSize: 22,
                    bold: true,
                    color: '#212529'
                },
                headerId: {
                    fontSize: 11,
                    color: '#6c757d',
                    margin: [0, 0, 0, 5]
                },
                headerLabel: {
                    fontSize: 9,
                    bold: true,
                    color: '#495057'
                },
                headerValue: {
                    fontSize: 9,
                    color: '#212529'
                },
                sectionTitle: {
                    fontSize: 14,
                    bold: true,
                    color: '#0d6efd',
                    margin: [0, 0, 0, 2]
                },
                subSectionTitle: {
                    fontSize: 10,
                    bold: true,
                    color: '#6c757d',
                    margin: [0, 0, 0, 5]
                },
                label: {
                    fontSize: 8,
                    bold: true,
                    color: '#868e96',
                    margin: [0, 0, 0, 1]
                },
                value: {
                    fontSize: 10,
                    color: '#212529'
                },
                itemTitle: {
                    fontSize: 11,
                    bold: true,
                    color: '#212529'
                },
                itemSubtitle: {
                    fontSize: 10,
                    color: '#495057'
                },
                jobTitle: {
                    fontSize: 12,
                    bold: true,
                    color: '#212529'
                },
                jobCompany: {
                    fontSize: 11,
                    bold: true,
                    color: '#495057'
                },
                jobLocation: {
                    fontSize: 9,
                    color: '#868e96',
                    italics: true
                },
                jobDate: {
                    fontSize: 9,
                    color: '#495057',
                    bold: true
                },
                jobMeta: {
                    fontSize: 9,
                    color: '#868e96'
                },
                badge: {
                    fontSize: 8,
                    color: '#ffffff',
                    background: '#6c757d',
                    bold: true,
                    padding: [4, 2],
                    borderRadius: 2
                },
                badgeSuccess: {
                    fontSize: 8,
                    color: '#ffffff',
                    background: '#198754',
                    bold: true,
                    padding: [4, 2],
                    borderRadius: 2
                },
                tableHeader: {
                    bold: true,
                    fontSize: 8,
                    color: '#868e96',
                    margin: [0, 0, 0, 5]
                }
            },
            defaultStyle: {
                font: 'Helvetica',
                fontSize: 10,
                lineHeight: 1.4
            },
            pageMargins: [40, 40, 40, 40]
        };
    }

    createPdf(docDefinition) {
        return printer.createPdfKitDocument(docDefinition);
    }
}

module.exports = new HojaService();
