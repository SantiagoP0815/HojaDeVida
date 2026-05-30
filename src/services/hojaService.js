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

        const formatDate = (date) => {
            if (!date) return '';
            const d = new Date(date);
            if (isNaN(d.getTime())) return '';
            return d.toISOString().split('T')[0];
        };

        const formatMonth = (date) => {
            if (!date) return '';
            const d = new Date(date);
            if (isNaN(d.getTime())) return '';
            return d.toISOString().slice(0, 7);
        };

        if (persona.fecha_nacimiento) persona.fecha_nacimiento = formatDate(persona.fecha_nacimiento);

        if (data.educacion_basica_media && data.educacion_basica_media.fecha_grado) {
            data.educacion_basica_media.fecha_grado = formatMonth(data.educacion_basica_media.fecha_grado);
        }

        if (data.educacion_superior) {
            data.educacion_superior.forEach(estudio => {
                if (estudio.mes_terminacion) estudio.mes_terminacion = formatMonth(estudio.mes_terminacion);
            });
        }

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

            if (files && files['foto_perfil']) {
                const file = files['foto_perfil'][0];
                await hojaRepository.updatePersonaFoto(conn, idPersona, file.filename);
            }

            await hojaRepository.updatePersona(conn, idPersona, datos);
            await hojaRepository.saveEducacionBasica(conn, idPersona, datos);

            const undefinedToNull = (value) => value === "" || value === "0" || value === undefined ? null : value;

            const existingRecords = await hojaRepository.getEducacionSuperior(idPersona);
            const existingIds = new Set((Array.isArray(existingRecords) ? existingRecords : []).map(r => Number(r.id_educacion_superior)));
            const sentIds = new Set();
            const educacionIndexToId = new Map();

            for (let i = 0; i <= 5; i++) {
                if ((datos[`id_educacion_superior_${i}`] || datos[`modalidad_academica_${i}`] || datos[`semestres_aprobados_${i}`])) {
                    const record = {
                        id_educacion_superior: undefinedToNull(datos[`id_educacion_superior_${i}`]),
                        modalidad_academica: undefinedToNull(datos[`modalidad_academica_${i}`]),
                        semestres_aprobados: undefinedToNull(datos[`semestres_aprobados_${i}`]),
                        graduado: undefinedToNull(datos[`graduado_${i}`]),
                        nombre_titulo: undefinedToNull(datos[`nombre_titulo_${i}`]),
                        mes_terminacion: undefinedToNull(datos[`mes_terminacion_${i}`]),
                        numero_tarjeta_profesional: undefinedToNull(datos[`numero_tarjeta_profesional_${i}`]),
                    };
                    const id = await hojaRepository.saveEducacionSuperior(conn, idPersona, record);
                    sentIds.add(Number(id));
                    educacionIndexToId.set(i, Number(id));
                }
            }

            for (let i = 0; i <= 5; i++) {
                if (files && files[`documento_educacion_superior_${i}`]) {
                    const file = files[`documento_educacion_superior_${i}`][0];
                    const id = educacionIndexToId.get(i);
                    if (id) await hojaRepository.updateEducacionSuperiorDocumentoById(conn, id, file.filename);
                }
            }

            const idsToDelete = Array.from(existingIds).filter(id => !sentIds.has(id));
            await hojaRepository.deleteEducacionSuperior(conn, idPersona, idsToDelete);

            const existingRecIdsIdiomas = await hojaRepository.getIdiomas(idPersona);
            const existingIdsIdiomas = new Set((Array.isArray(existingRecIdsIdiomas) ? existingRecIdsIdiomas : []).map(r => Number(r.id_idioma)));
            const sentIdsIdiomas = new Set();
            const idiomaIndexToId = new Map();

            for (let i = 0; i <= 5; i++) {
                if ((datos[`id_idioma_${i}`] || datos[`idioma_${i}`])) {
                    const rec = {
                        id_idioma: undefinedToNull(datos[`id_idioma_${i}`]),
                        idioma: undefinedToNull(datos[`idioma_${i}`]),
                        habla: undefinedToNull(datos[`habla_${i}`]),
                        lee: undefinedToNull(datos[`lee_${i}`]),
                        escribe: undefinedToNull(datos[`escribe_${i}`])
                    };
                    const id = await hojaRepository.saveIdioma(conn, idPersona, rec);
                    sentIdsIdiomas.add(Number(id));
                    idiomaIndexToId.set(i, Number(id));
                }
            }

            for (let i = 0; i <= 5; i++) {
                if (files && files[`documento_idioma_${i}`]) {
                    const file = files[`documento_idioma_${i}`][0];
                    const id = idiomaIndexToId.get(i);
                    if (id) await hojaRepository.updateIdiomaDocumentoById(conn, id, file.filename);
                }
            }

            const idsDelIdiomas = Array.from(existingIdsIdiomas).filter(id => !sentIdsIdiomas.has(id));
            await hojaRepository.deleteIdiomas(conn, idPersona, idsDelIdiomas);

            const existingRecExp = await hojaRepository.getExperienciaLaboral(idPersona);
            const existingIdsExp = new Set((Array.isArray(existingRecExp) ? existingRecExp : []).map(r => Number(r.id_experiencia)));
            const sentIdsExp = new Set();
            const expIndexToId = new Map();

            for (let i = 0; i <= 5; i++) {
                if ((datos[`id_experiencia_${i}`] || datos[`empresa_entidad_${i}`] || datos[`cargo_actual_${i}`])) {
                    const rec = {
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
                    const id = await hojaRepository.saveExperienciaLaboral(conn, idPersona, rec);
                    sentIdsExp.add(Number(id));
                    expIndexToId.set(i, Number(id));
                }
            }

            for (let i = 0; i <= 5; i++) {
                if (files && files[`documento_experiencia_${i}`]) {
                    const file = files[`documento_experiencia_${i}`][0];
                    const id = expIndexToId.get(i);
                    if (id) await hojaRepository.updateExperienciaLaboralDocumentoById(conn, id, file.filename);
                }
            }

            const idsDelExp = Array.from(existingIdsExp).filter(id => !sentIdsExp.has(id));
            await hojaRepository.deleteExperienciaLaboral(conn, idPersona, idsDelExp);

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
            await conn.query('UPDATE personas SET nombre_original_archivo = NULL WHERE id_persona = ? AND nombre_original_archivo = ?', [doc.id_persona, doc.filename]);
        });
    }

    generatePdfDocDefinition(data) {
        const { persona, idiomas, educacion_basica_media, educacion_superior, tiempo_experiencia, empleoActual, empleosAnteriores } = data;
        const docsDir = path.join(__dirname, '..', 'docs');

        const PRIMARY      = '#2563eb';
        const PRIMARY_DARK = '#1d4ed8';
        const PRIMARY_LIGHT= '#eff6ff';
        const TEXT_MAIN    = '#1e293b';
        const TEXT_MUTED   = '#64748b';
        const BORDER       = '#e2e8f0';

        const getImageBase64 = (filePath) => {
            try {
                if (fs.existsSync(filePath)) {
                    const ext = path.extname(filePath).toLowerCase();
                    const mime = ext === '.png' ? 'image/png' : 'image/jpeg';
                    return `data:${mime};base64,` + fs.readFileSync(filePath).toString('base64');
                }
            } catch (e) { }
            return null;
        };

        const fmtDate = (dateVal) => {
            if (!dateVal) return '';
            const d = new Date(dateVal);
            if (isNaN(d.getTime())) return String(dateVal);
            return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
        };

        const profilePhoto = persona.foto_perfil ? getImageBase64(path.join(docsDir, persona.foto_perfil)) : null;

        // ── SECTION TITLE ────────────────────────────────────────────
        const sectionTitle = (title) => ({
            stack: [
                { text: title.toUpperCase(), fontSize: 9.5, bold: true, color: PRIMARY, margin: [0, 0, 0, 3] },
                { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1.5, lineColor: PRIMARY }] }
            ],
            margin: [0, 18, 0, 10]
        });

        const subLabel = (text) => ({
            text: text.toUpperCase(),
            fontSize: 7.5, bold: true, color: TEXT_MUTED,
            margin: [0, 6, 0, 6]
        });

        const field = (label, value) => {
            if (!value) return { text: '' };
            return {
                stack: [
                    { text: label.toUpperCase(), fontSize: 7, bold: true, color: TEXT_MUTED, margin: [0, 0, 0, 1] },
                    { text: String(value), fontSize: 9.5, color: TEXT_MAIN }
                ],
                margin: [0, 0, 0, 7]
            };
        };

        // ── HEADER ───────────────────────────────────────────────────
        const cargoLine = (empleoActual && empleoActual.cargo_actual)
            ? `${empleoActual.cargo_actual}  ·  ${empleoActual.empresa_entidad || ''}`
            : '';

        const contactParts = [
            persona.email,
            persona.telefono,
            persona.municipio_correspondencia ? `${persona.municipio_correspondencia}, ${persona.departamento_correspondencia || ''}` : null
        ].filter(Boolean);

        const headerInfoStack = {
            width: '*',
            margin: profilePhoto ? [16, 6, 0, 6] : [0, 6, 0, 6],
            stack: [
                { text: `${persona.nombres || ''} ${persona.primer_apellido || ''} ${persona.segundo_apellido || ''}`.trim(), fontSize: 20, bold: true, color: '#ffffff' },
                cargoLine ? { text: cargoLine, fontSize: 9.5, color: 'rgba(255,255,255,0.82)', margin: [0, 3, 0, 0] } : { text: '' },
                contactParts.length ? { text: contactParts.join('   ·   '), fontSize: 8.5, color: 'rgba(255,255,255,0.75)', margin: [0, 7, 0, 0] } : { text: '' },
                { text: `${persona.tipo_documento || ''} ${persona.numero_documento || ''}`, fontSize: 7.5, color: 'rgba(255,255,255,0.45)', margin: [0, 5, 0, 0] }
            ]
        };

        const headerCols = profilePhoto
            ? [{ width: 88, stack: [{ image: profilePhoto, width: 78, height: 78, margin: [0, 8, 0, 8] }] }, headerInfoStack]
            : [headerInfoStack];

        const headerBlock = {
            table: {
                widths: ['100%'],
                body: [[{
                    fillColor: PRIMARY,
                    border: [false, false, false, false],
                    stack: [{ columns: headerCols }],
                    margin: [20, 14, 20, 14]
                }]]
            },
            layout: 'noBorders'
        };

        // ── PERFIL PROFESIONAL ────────────────────────────────────────
        const perfilBlock = persona.perfil_profesional ? {
            table: {
                widths: ['100%'],
                body: [[{
                    fillColor: PRIMARY_LIGHT,
                    border: [false, false, false, false],
                    stack: [
                        { text: 'PERFIL PROFESIONAL', fontSize: 7, bold: true, color: PRIMARY, margin: [0, 0, 0, 4] },
                        { text: persona.perfil_profesional, fontSize: 9.5, color: TEXT_MAIN, lineHeight: 1.5 }
                    ],
                    margin: [12, 10, 12, 10]
                }]]
            },
            layout: {
                hLineWidth: () => 0,
                vLineWidth: (i) => i === 0 ? 3 : 0,
                vLineColor: () => PRIMARY
            },
            margin: [0, 10, 0, 0]
        } : { text: '' };

        // ── HABILIDADES ───────────────────────────────────────────────
        const habilidadesBlock = persona.habilidades ? (() => {
            const skills = persona.habilidades.split(',').map(s => s.trim()).filter(Boolean);
            return {
                stack: [
                    sectionTitle('Habilidades'),
                    {
                        columns: skills.map(skill => ({
                            width: 'auto',
                            table: {
                                body: [[{
                                    text: skill, fontSize: 8, bold: true, color: PRIMARY,
                                    fillColor: PRIMARY_LIGHT,
                                    border: [false, false, false, false],
                                    margin: [7, 3, 7, 3]
                                }]]
                            },
                            layout: 'noBorders',
                            margin: [0, 0, 6, 0]
                        })),
                        columnGap: 0
                    }
                ]
            };
        })() : { text: '' };

        // ── DATOS PERSONALES ──────────────────────────────────────────
        const dpFields = [];
        if (persona.nacionalidad) dpFields.push(field('Nacionalidad', persona.nacionalidad === 'COLOMBIANO' ? 'Colombiano' : `Extranjero${persona.pais ? ` (${persona.pais})` : ''}`));
        if (persona.sexo)         dpFields.push(field('Sexo', persona.sexo === 'M' ? 'Masculino' : 'Femenino'));
        if (persona.fecha_nacimiento) dpFields.push(field('Fecha de Nacimiento', fmtDate(persona.fecha_nacimiento)));
        if (persona.municipio_nacimiento) dpFields.push(field('Lugar de Nacimiento', `${persona.municipio_nacimiento}, ${persona.departamento_nacimiento || ''}`));
        if (persona.tipo_libreta_militar) dpFields.push(field('Libreta Militar', `${persona.tipo_libreta_militar} — Nro. ${persona.numero_libreta_militar || ''} — D.M. ${persona.dm_libreta_militar || ''}`));
        if (persona.direccion_correspondencia) dpFields.push(field('Dirección', `${persona.direccion_correspondencia}, ${persona.municipio_correspondencia || ''}`));

        const half = Math.ceil(dpFields.length / 2);
        const datosPersonalesBlock = dpFields.length ? {
            stack: [
                sectionTitle('Datos Personales'),
                { columns: [{ width: '50%', stack: dpFields.slice(0, half) }, { width: '50%', stack: dpFields.slice(half) }] }
            ]
        } : { text: '' };

        // ── FORMACIÓN ACADÉMICA ───────────────────────────────────────
        const educacionStack = [sectionTitle('Formación Académica')];

        if (educacion_basica_media && educacion_basica_media.titulo_obtenido) {
            educacionStack.push(subLabel('Educación Básica y Media'));
            educacionStack.push({
                columns: [
                    { width: '*', text: educacion_basica_media.titulo_obtenido, bold: true, fontSize: 9.5, color: TEXT_MAIN },
                    educacion_basica_media.educacion_basica ? { width: 'auto', text: `Grado ${educacion_basica_media.educacion_basica}°`, fontSize: 8.5, color: TEXT_MUTED } : { text: '' }
                ],
                margin: [0, 0, 0, 8]
            });
        }

        if (educacion_superior && educacion_superior.length > 0) {
            educacionStack.push(subLabel('Educación Superior'));
            educacion_superior.forEach(est => {
                educacionStack.push({
                    stack: [
                        {
                            columns: [
                                { width: '*', text: est.nombre_titulo || '', bold: true, fontSize: 10, color: TEXT_MAIN },
                                { width: 'auto', text: est.mes_terminacion || '', fontSize: 8, color: TEXT_MUTED }
                            ]
                        },
                        { text: est.modalidad_academica || '', fontSize: 9, color: PRIMARY, margin: [0, 1, 0, 0] },
                        {
                            text: [
                                est.graduado === 'SI' ? 'Graduado' : 'En Curso',
                                est.semestres_aprobados ? `  ·  ${est.semestres_aprobados} semestres` : '',
                                est.numero_tarjeta_profesional ? `  ·  T.P: ${est.numero_tarjeta_profesional}` : ''
                            ].join(''),
                            fontSize: 8, color: TEXT_MUTED, margin: [0, 1, 0, 0]
                        }
                    ],
                    margin: [0, 0, 0, 8]
                });
            });
        }

        if (idiomas && idiomas.length > 0) {
            educacionStack.push(subLabel('Idiomas'));
            educacionStack.push({
                columns: idiomas.map(idioma => ({
                    width: '*',
                    stack: [
                        { text: idioma.idioma, bold: true, fontSize: 9.5, color: TEXT_MAIN },
                        { text: `Habla: ${idioma.lo_habla || '—'}`, fontSize: 8, color: TEXT_MUTED },
                        { text: `Lee: ${idioma.lo_lee || '—'}`, fontSize: 8, color: TEXT_MUTED },
                        { text: `Escribe: ${idioma.lo_escribe || '—'}`, fontSize: 8, color: TEXT_MUTED }
                    ],
                    margin: [0, 0, 10, 0]
                }))
            });
        }

        // ── EXPERIENCIA LABORAL ───────────────────────────────────────
        const expStack = [sectionTitle('Experiencia Laboral')];

        if (empleoActual && empleoActual.empresa_entidad) {
            expStack.push({
                table: {
                    widths: ['100%'],
                    body: [[{
                        fillColor: PRIMARY_LIGHT,
                        border: [false, false, false, false],
                        stack: [
                            { text: 'EMPLEO ACTUAL', fontSize: 7, bold: true, color: '#16a34a', margin: [0, 0, 0, 4] },
                            {
                                columns: [
                                    { width: '*', text: empleoActual.cargo_actual || '', bold: true, fontSize: 11, color: TEXT_MAIN },
                                    { width: 'auto', text: `Desde ${fmtDate(empleoActual.fecha_ingreso)}`, fontSize: 8, color: TEXT_MUTED, alignment: 'right' }
                                ]
                            },
                            { text: empleoActual.empresa_entidad, fontSize: 10, color: PRIMARY, bold: true, margin: [0, 2, 0, 0] },
                            empleoActual.municipio ? { text: `${empleoActual.municipio}, ${empleoActual.departamento || ''}`, fontSize: 8, color: TEXT_MUTED, italics: true, margin: [0, 2, 0, 0] } : { text: '' },
                            empleoActual.dependencia ? { text: `Dependencia: ${empleoActual.dependencia}`, fontSize: 8, color: TEXT_MUTED, margin: [0, 2, 0, 0] } : { text: '' }
                        ],
                        margin: [12, 10, 12, 10]
                    }]]
                },
                layout: 'noBorders',
                margin: [0, 0, 0, 10]
            });
        }

        if (empleosAnteriores && empleosAnteriores.length > 0) {
            expStack.push(subLabel('Historial Laboral'));
            empleosAnteriores.forEach(emp => {
                expStack.push({
                    stack: [
                        {
                            columns: [
                                { width: '*', text: emp.cargo_actual || '', bold: true, fontSize: 10, color: TEXT_MAIN },
                                { width: 'auto', text: `${fmtDate(emp.fecha_ingreso)} — ${emp.fecha_retiro ? fmtDate(emp.fecha_retiro) : 'Presente'}`, fontSize: 8, color: TEXT_MUTED, alignment: 'right' }
                            ]
                        },
                        { text: emp.empresa_entidad || '', fontSize: 9.5, color: PRIMARY, bold: true, margin: [0, 1, 0, 0] },
                        emp.municipio ? { text: `${emp.municipio}, ${emp.departamento || ''}`, fontSize: 8, color: TEXT_MUTED, italics: true, margin: [0, 1, 0, 0] } : { text: '' },
                        emp.dependencia ? { text: `Dependencia: ${emp.dependencia}`, fontSize: 8, color: TEXT_MUTED, margin: [0, 1, 0, 0] } : { text: '' }
                    ],
                    margin: [0, 0, 0, 8]
                });
            });
        }

        // ── TIEMPO TOTAL ──────────────────────────────────────────────
        const te = tiempo_experiencia || {};
        const tiempoBlock = {
            stack: [
                sectionTitle('Tiempo Total de Experiencia'),
                {
                    table: {
                        widths: ['*', 60, 60],
                        body: [
                            [
                                { text: 'TIPO DE EXPERIENCIA', fontSize: 7.5, bold: true, color: TEXT_MUTED, border: [false, false, false, true], borderColor: [null, null, null, BORDER] },
                                { text: 'AÑOS', fontSize: 7.5, bold: true, color: TEXT_MUTED, alignment: 'center', border: [false, false, false, true], borderColor: [null, null, null, BORDER] },
                                { text: 'MESES', fontSize: 7.5, bold: true, color: TEXT_MUTED, alignment: 'center', border: [false, false, false, true], borderColor: [null, null, null, BORDER] }
                            ],
                            [
                                { text: 'Servidor Público', fontSize: 9, color: TEXT_MAIN, border: [false, false, false, true], borderColor: [null, null, null, BORDER] },
                                { text: String(te.anios_servidor_publico || 0), fontSize: 9, alignment: 'center', border: [false, false, false, true], borderColor: [null, null, null, BORDER] },
                                { text: String(te.meses_servidor_publico || 0), fontSize: 9, alignment: 'center', border: [false, false, false, true], borderColor: [null, null, null, BORDER] }
                            ],
                            [
                                { text: 'Sector Privado', fontSize: 9, color: TEXT_MAIN, border: [false, false, false, true], borderColor: [null, null, null, BORDER] },
                                { text: String(te.anios_sector_privado || 0), fontSize: 9, alignment: 'center', border: [false, false, false, true], borderColor: [null, null, null, BORDER] },
                                { text: String(te.meses_sector_privado || 0), fontSize: 9, alignment: 'center', border: [false, false, false, true], borderColor: [null, null, null, BORDER] }
                            ],
                            [
                                { text: 'Trabajador Independiente', fontSize: 9, color: TEXT_MAIN, border: [false, false, false, true], borderColor: [null, null, null, BORDER] },
                                { text: String(te.anios_trabajador_independiente || 0), fontSize: 9, alignment: 'center', border: [false, false, false, true], borderColor: [null, null, null, BORDER] },
                                { text: String(te.meses_trabajador_independiente || 0), fontSize: 9, alignment: 'center', border: [false, false, false, true], borderColor: [null, null, null, BORDER] }
                            ],
                            [
                                { text: 'TOTAL', fontSize: 9, bold: true, color: PRIMARY, border: [false, false, false, false] },
                                { text: String(te.anios_total_experiencia || 0), fontSize: 10, bold: true, color: PRIMARY, alignment: 'center', border: [false, false, false, false] },
                                { text: String(te.meses_total_experiencia || 0), fontSize: 10, bold: true, color: PRIMARY, alignment: 'center', border: [false, false, false, false] }
                            ]
                        ]
                    },
                    layout: {
                        hLineWidth: () => 0,
                        vLineWidth: () => 0,
                        paddingTop: () => 5,
                        paddingBottom: () => 5
                    }
                }
            ]
        };

        return {
            content: [
                headerBlock,
                perfilBlock,
                habilidadesBlock,
                datosPersonalesBlock,
                { stack: educacionStack },
                { stack: expStack },
                tiempoBlock
            ],
            styles: {
                sectionTitle: { fontSize: 9.5, bold: true, color: PRIMARY }
            },
            defaultStyle: {
                font: 'Helvetica',
                fontSize: 9.5,
                lineHeight: 1.4,
                color: TEXT_MAIN
            },
            pageMargins: [40, 40, 40, 40]
        };
    }

    createPdf(docDefinition) {
        return printer.createPdfKitDocument(docDefinition);
    }
}

module.exports = new HojaService();
