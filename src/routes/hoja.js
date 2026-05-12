const express = require('express');
const router = express.Router();
const { isLoggedIn } = require('../lib/auth');
const upload = require('../lib/upload');
const hojaController = require('../controllers/hojaController');
const { insertarDatosValidators } = require('../validators/hojaValidator');

// Render Forms
router.get('/add', isLoggedIn, hojaController.renderAdd);
router.get('/view/:unique_identifier', isLoggedIn, hojaController.renderView);

// Insert/Update Data
router.post('/insertar-datos',
    isLoggedIn,
    upload.fields([
        { name: 'documento_id', maxCount: 1 },
        { name: 'foto_perfil', maxCount: 1 },
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
    ]),
    insertarDatosValidators,
    hojaController.insertarDatos
);

// PDF Generation
router.get('/generar-pdf', isLoggedIn, hojaController.generarPdf);
router.get('/generar-pdf/:unique_identifier', isLoggedIn, hojaController.generarPdfById);

// Document Management
router.get('/documento/:id/preview', isLoggedIn, hojaController.previewDocument);
router.post('/documento/:id/delete', isLoggedIn, hojaController.deleteDocument);
router.get('/documento/:id', isLoggedIn, hojaController.downloadDocument);
router.get('/soporte/educacion/:id', isLoggedIn, hojaController.downloadEducacionSoporte);
router.get('/soporte/experiencia/:id', isLoggedIn, hojaController.downloadExperienciaSoporte);

// List (Admin)
router.get("/list", isLoggedIn, hojaController.listPersonas);

module.exports = router;