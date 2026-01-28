const hojaService = require('../services/hojaService');
const { validationResult } = require('express-validator');
const path = require('path');

class HojaController {

    async renderAdd(req, res) {
        try {
            const data = await hojaService.getDataForEdit(req.user.id_persona);
            res.render('hoja/add', data);
        } catch (error) {
            console.error('Error rendering add view:', error);
            req.flash('message', 'Error al cargar la información.');
            res.redirect('/hoja/add');
        }
    }

    async renderView(req, res) {
        try {
            const { unique_identifier } = req.params;
            const data = await hojaService.getPersonDataForView(unique_identifier);

            if (!data) {
                return res.status(404).send('Persona no encontrada');
            }

            // Get latest document for view
            const documento = data.documentos && data.documentos.length > 0 ? data.documentos[0] : null;

            res.render('hoja/view', { ...data, documento });
        } catch (error) {
            console.error('Error rendering view:', error);
            res.status(500).send('Error interno del servidor');
        }
    }

    async insertarDatos(req, res) {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            const mensajes = errors.array().map(e => e.msg).join(' | ');
            req.flash('message', mensajes);
            return res.redirect('/hoja/add');
        }

        try {
            await hojaService.updateHojaDeVida(req.user.id_persona, req.body, req.files);
            req.flash('success', 'Información actualizada correctamente');
            res.redirect('/hoja/add');
        } catch (error) {
            console.error('Error al actualizar datos:', error);
            req.flash('message', 'Error al guardar en la base de datos: ' + error.message);
            res.redirect('/hoja/add');
        }
    }

    async generarPdf(req, res) {
        try {
            const data = await hojaService.getPersonDataForPdf(req.user.id_persona);
            if (!data) return res.status(404).send('Datos no encontrados');

            const docDefinition = hojaService.generatePdfDocDefinition(data);
            const pdfDoc = hojaService.createPdf(docDefinition);

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
    }

    async generarPdfById(req, res) {
        try {
            const { unique_identifier } = req.params;
            const data = await hojaService.getPersonDataForPdfByUniqueId(unique_identifier);

            if (!data) {
                return res.status(404).send('Persona no encontrada');
            }

            const docDefinition = hojaService.generatePdfDocDefinition(data);
            const pdfDoc = hojaService.createPdf(docDefinition);

            const nombresSinEspacios = data.persona.nombres.replace(/ /g, '_');
            const nombreArchivo = `HOJA_DE_VIDA_${data.persona.primer_apellido}_${data.persona.segundo_apellido}_${nombresSinEspacios}.pdf`;

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=${nombreArchivo}`);

            pdfDoc.pipe(res);
            pdfDoc.end();
        } catch (error) {
            console.error('Error al generar el PDF:', error);
            res.status(500).send('Error al generar el PDF');
        }
    }

    async previewDocument(req, res) {
        try {
            const { id } = req.params;
            const hojaRepository = require('../repositories/hojaRepository');
            const CONSTANTS = require('../config/constants');

            // Obtener documento
            const doc = await hojaRepository.getDocumentoById(id);

            if (!doc) {
                return res.status(404).send('Documento no encontrado');
            }

            // Verificar permisos: solo propietario o admin
            const isOwner = doc.id_persona === req.user.id_persona;
            const isAdmin = req.user.admin === CONSTANTS.ROLE_ADMIN;

            if (!isOwner && !isAdmin) {
                console.warn(`Intento de acceso no autorizado al documento ${id} por usuario ${req.user.id_persona}`);
                return res.status(403).send('No tiene permisos para acceder a este documento');
            }

            const filePath = path.join(__dirname, '..', 'docs', doc.filename);
            const fs = require('fs');

            // Verificar que el archivo existe
            if (!fs.existsSync(filePath)) {
                console.error(`Archivo no encontrado en disco: ${filePath}`);
                return res.status(404).send('Archivo no encontrado en el servidor');
            }

            const stat = fs.statSync(filePath);

            res.setHeader('Content-Type', doc.mimetype || 'application/octet-stream');
            res.setHeader('Content-Length', stat.size);
            res.setHeader('Content-Disposition', `inline; filename="${doc.original_name}"`);
            res.setHeader('X-Content-Type-Options', 'nosniff');

            const stream = fs.createReadStream(filePath);
            stream.on('error', (err) => {
                console.error('Error al leer archivo:', err);
                if (!res.headersSent) {
                    res.status(500).send('Error al leer el archivo');
                }
            });
            stream.pipe(res);

        } catch (err) {
            console.error('Error previewing document:', err);
            res.status(500).send('Error al previsualizar documento');
        }
    }

    async deleteDocument(req, res) {
        try {
            const { id } = req.params;
            const docsDir = path.join(__dirname, '..', 'docs');
            await hojaService.deleteDocumento(id, req.user.id_persona, req.user.admin, docsDir);
            req.flash('success', 'Documento eliminado correctamente');
            res.redirect('/hoja/add');
        } catch (err) {
            console.error('Error deleting document:', err);
            req.flash('message', 'Error al eliminar documento');
            res.redirect('/hoja/add');
        }
    }

    async downloadDocument(req, res) {
        try {
            const { id } = req.params;
            const hojaRepository = require('../repositories/hojaRepository');
            const CONSTANTS = require('../config/constants');

            // Obtener documento
            const doc = await hojaRepository.getDocumentoById(id);

            if (!doc) {
                return res.status(404).send('Documento no encontrado');
            }

            // Verificar permisos: solo propietario o admin
            const isOwner = doc.id_persona === req.user.id_persona;
            const isAdmin = req.user.admin === CONSTANTS.ROLE_ADMIN;

            if (!isOwner && !isAdmin) {
                console.warn(`Intento de descarga no autorizada del documento ${id} por usuario ${req.user.id_persona}`);
                return res.status(403).send('No tiene permisos para descargar este documento');
            }

            const filePath = path.join(__dirname, '..', 'docs', doc.filename);
            const fs = require('fs');

            // Verificar que el archivo existe
            if (!fs.existsSync(filePath)) {
                console.error(`Archivo no encontrado en disco: ${filePath}`);
                return res.status(404).send('Archivo no encontrado en el servidor');
            }

            res.download(filePath, doc.original_name, (err) => {
                if (err) {
                    console.error('Error al descargar archivo:', err);
                    if (!res.headersSent) {
                        res.status(500).send('Error al descargar el archivo');
                    }
                }
            });
        } catch (err) {
            console.error('Error downloading document:', err);
            res.status(500).send('Error al descargar documento');
        }
    }

    async downloadEducacionSoporte(req, res) {
        try {
            const { id } = req.params;
            const hojaRepository = require('../repositories/hojaRepository');
            const CONSTANTS = require('../config/constants');

            const item = await hojaRepository.getEducacionSuperiorById(id);
            if (!item || !item.documento) {
                return res.status(404).send('Documento no encontrado');
            }

            // Verificar permisos
            const isOwner = item.id_persona === req.user.id_persona;
            const isAdmin = req.user.admin === CONSTANTS.ROLE_ADMIN;

            if (!isOwner && !isAdmin) {
                return res.status(403).send('No tiene permisos');
            }

            const filePath = path.join(__dirname, '..', 'docs', item.documento);
            const fs = require('fs');

            if (!fs.existsSync(filePath)) {
                return res.status(404).send('Archivo no encontrado en el servidor');
            }

            // Usar el nombre del título como nombre de archivo, o el filename
            const downloadName = `Soporte_${item.nombre_titulo || 'Educacion'}.pdf`; // Asumimos PDF o genérico

            res.download(filePath, downloadName);
        } catch (err) {
            console.error('Error downloading education support:', err);
            res.status(500).send('Error al descargar documento');
        }
    }

    async downloadExperienciaSoporte(req, res) {
        try {
            const { id } = req.params;
            const hojaRepository = require('../repositories/hojaRepository');
            const CONSTANTS = require('../config/constants');

            const item = await hojaRepository.getExperienciaLaboralById(id);
            if (!item || !item.documento) {
                return res.status(404).send('Documento no encontrado');
            }

            // Verificar permisos
            const isOwner = item.id_persona === req.user.id_persona;
            const isAdmin = req.user.admin === CONSTANTS.ROLE_ADMIN;

            if (!isOwner && !isAdmin) {
                return res.status(403).send('No tiene permisos');
            }

            const filePath = path.join(__dirname, '..', 'docs', item.documento);
            const fs = require('fs');

            if (!fs.existsSync(filePath)) {
                return res.status(404).send('Archivo no encontrado en el servidor');
            }

            const downloadName = `Soporte_${item.empresa_entidad || 'Experiencia'}.pdf`;

            res.download(filePath, downloadName);
        } catch (err) {
            console.error('Error downloading experience support:', err);
            res.status(500).send('Error al descargar documento');
        }
    }

    async listPersonas(req, res) {
        try {
            const hojaRepository = require('../repositories/hojaRepository');
            // Check admin
            const adminUser = await hojaRepository.getPersonaById(req.user.id_persona);
            if (adminUser.admin !== 'SI') {
                req.flash('message', 'No tienes permisos de administrador.');
                return res.redirect('/hoja/add');
            }

            const search = (req.query.search || '').toString().trim();
            const personas = await hojaRepository.searchPersonas(search);

            res.render('hoja/list', { personas, search });
        } catch (error) {
            console.error('Error listing personas:', error);
            req.flash('message', 'Error al cargar la lista.');
            res.redirect('/hoja/add');
        }
    }
}

module.exports = new HojaController();
