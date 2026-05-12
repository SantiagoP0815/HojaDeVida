const db = require('../database');

class HojaRepository {

    async ensureDocumentosTable(conn = db) {
        return conn.query(`CREATE TABLE IF NOT EXISTS documentos (
            id_documento INT AUTO_INCREMENT PRIMARY KEY,
            id_persona INT NOT NULL,
            original_name VARCHAR(255),
            filename VARCHAR(255),
            mimetype VARCHAR(100),
            size INT,
            path VARCHAR(500),
            uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);
    }

    async getIdiomas(idPersona) {
        const [rows] = await db.query('SELECT * FROM idiomas WHERE id_persona = ?', [idPersona]);
        return rows;
    }

    async getEducacionBasicaMedia(idPersona) {
        const [rows] = await db.query('SELECT * FROM educacion_basica_media WHERE id_persona = ?', [idPersona]);
        return rows[0] || {};
    }

    async getEducacionSuperior(idPersona) {
        const [rows] = await db.query('SELECT * FROM educacion_superior WHERE id_persona = ?', [idPersona]);
        return rows;
    }

    async getTiempoExperiencia(idPersona) {
        const [rows] = await db.query('SELECT * FROM tiempo_experiencia WHERE id_persona = ?', [idPersona]);
        return rows[0] || {};
    }

    async getExperienciaLaboral(idPersona) {
        const [rows] = await db.query('SELECT * FROM experiencia_laboral WHERE id_persona = ?', [idPersona]);
        return rows;
    }

    async getDocumentos(idPersona) {
        const [rows] = await db.query('SELECT * FROM documentos WHERE id_persona = ? ORDER BY uploaded_at DESC', [idPersona]);
        return rows;
    }

    async getDocumentoById(idDocumento) {
        const [rows] = await db.query('SELECT * FROM documentos WHERE id_documento = ? LIMIT 1', [idDocumento]);
        return rows[0];
    }

    async getLatestDocumento(idPersona) {
        const [rows] = await db.query('SELECT * FROM documentos WHERE id_persona = ? ORDER BY uploaded_at DESC LIMIT 1', [idPersona]);
        return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
    }

    async getPersonaByUniqueIdentifier(uniqueIdentifier) {
        const [rows] = await db.query('SELECT * FROM personas WHERE unique_identifier = ?', [uniqueIdentifier]);
        return rows[0];
    }

    async getPersonaById(idPersona) {
        const [rows] = await db.query('SELECT * FROM personas WHERE id_persona = ?', [idPersona]);
        return rows[0];
    }

    async getEducacionSuperiorById(id) {
        const [rows] = await db.query('SELECT * FROM educacion_superior WHERE id_educacion_superior = ?', [id]);
        return rows[0];
    }

    async getExperienciaLaboralById(id) {
        const [rows] = await db.query('SELECT * FROM experiencia_laboral WHERE id_experiencia = ?', [id]);
        return rows[0];
    }

    async saveDocumento(conn, data) {
        const { id_persona, original_name, filename, mimetype, size, path } = data;
        return conn.query(
            `INSERT INTO documentos (id_persona, original_name, filename, mimetype, size, path) VALUES (?, ?, ?, ?, ?, ?)`,
            [id_persona, original_name, filename, mimetype, size, path]
        );
    }

    async deleteDocumento(conn, idDocumento) {
        return conn.query('DELETE FROM documentos WHERE id_documento = ?', [idDocumento]);
    }

    async updatePersonaArchivo(conn, idPersona, filename) {
        return conn.query(`UPDATE personas SET nombre_original_archivo = ? WHERE id_persona = ?`, [filename, idPersona]);
    }

    async updatePersonaFoto(conn, idPersona, filename) {
        return conn.query(`UPDATE personas SET foto_perfil = ? WHERE id_persona = ?`, [filename, idPersona]);
    }

    async updatePersona(conn, idPersona, datos) {
        return conn.query(
            `UPDATE personas SET nombres = ?, primer_apellido = ?, segundo_apellido = ?, tipo_documento = ?, numero_documento = ?, sexo = ?, nacionalidad = ?, pais = ?, tipo_libreta_militar = ?, numero_libreta_militar = ?, dm_libreta_militar = ?, fecha_nacimiento = ?, pais_nacimiento = ?, departamento_nacimiento = ?, municipio_nacimiento = ?, direccion_correspondencia = ?, pais_correspondencia = ?, departamento_correspondencia = ?, municipio_correspondencia = ?, telefono = ?, email = ? WHERE id_persona = ?`,
            [datos.nombres, datos.primer_apellido, datos.segundo_apellido, datos.tipo_documento, datos.numero_documento, datos.sexo || null, datos.nacionalidad || null, datos.pais || null, datos.tipo_libreta_militar || null, datos.numero_libreta_militar || null, datos.dm_libreta_militar || null, datos.fecha_nacimiento || null, datos.pais_nacimiento || null, datos.departamento_nacimiento || null, datos.municipio_nacimiento || null, datos.direccion_correspondencia || null, datos.pais_correspondencia || null, datos.departamento_correspondencia || null, datos.municipio_correspondencia || null, datos.telefono || null, datos.email || null, idPersona]
        );
    }

    async saveEducacionBasica(conn, idPersona, datos) {
        const fechaGrado = datos.fecha_grado ? (parseInt(datos.fecha_grado, 10) || null) : null;
        const educacionBasica = datos.educacion_basica || null;
        const [rowsBasica] = await conn.query(`SELECT 1 FROM educacion_basica_media WHERE id_persona = ? LIMIT 1`, [idPersona]);
        if (!rowsBasica || rowsBasica.length === 0) {
            return conn.query(`INSERT INTO educacion_basica_media (id_persona, titulo_obtenido, educacion_basica, fecha_grado) VALUES (?, ?, ?, ?)`, [idPersona, datos.titulo_obtenido || null, educacionBasica, fechaGrado]);
        } else {
            return conn.query(`UPDATE educacion_basica_media SET titulo_obtenido = ?, educacion_basica = ?, fecha_grado = ? WHERE id_persona = ?`, [datos.titulo_obtenido || null, educacionBasica, fechaGrado, idPersona]);
        }
    }

    async saveEducacionSuperior(conn, idPersona, record) {
        if (record.id_educacion_superior) {
            const [exists] = await conn.query('SELECT 1 FROM educacion_superior WHERE id_educacion_superior = ? AND id_persona = ?', [record.id_educacion_superior, idPersona]);
            if (exists && exists.length > 0) {
                await conn.query(
                    `UPDATE educacion_superior SET modalidad_academica=?, semestres_aprobados=?, graduado=?, nombre_titulo=?, mes_terminacion=?, numero_tarjeta_profesional=? WHERE id_educacion_superior=?`,
                    [record.modalidad_academica, record.semestres_aprobados, record.graduado, record.nombre_titulo, record.mes_terminacion, record.numero_tarjeta_profesional, record.id_educacion_superior]
                );
                return record.id_educacion_superior;
            }
        }
        const [resIns] = await conn.query(`INSERT INTO educacion_superior (id_persona, modalidad_academica, semestres_aprobados, graduado, nombre_titulo, mes_terminacion, numero_tarjeta_profesional) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [idPersona, record.modalidad_academica, record.semestres_aprobados, record.graduado, record.nombre_titulo, record.mes_terminacion, record.numero_tarjeta_profesional]);
        return resIns.insertId;
    }

    async updateEducacionSuperiorDocumento(conn, idPersona, nombreTitulo, filename) {
        return conn.query(`UPDATE educacion_superior SET documento = ? WHERE id_persona = ? AND nombre_titulo = ?`, [filename, idPersona, nombreTitulo]);
    }

    async updateEducacionSuperiorDocumentoById(conn, id, filename) {
        return conn.query(`UPDATE educacion_superior SET documento = ? WHERE id_educacion_superior = ?`, [filename, id]);
    }

    async deleteEducacionSuperior(conn, idPersona, idsToDelete) {
        if (idsToDelete.length > 0) {
            return conn.query(`DELETE FROM educacion_superior WHERE id_educacion_superior IN (?) AND id_persona = ?`, [idsToDelete, idPersona]);
        }
    }

    async saveIdioma(conn, idPersona, rec) {
        if (rec.id_idioma) {
            await conn.query(`UPDATE idiomas SET idioma=?, lo_habla=?, lo_lee=?, lo_escribe=? WHERE id_idioma=?`, [rec.idioma, rec.habla, rec.lee, rec.escribe, rec.id_idioma]);
            return rec.id_idioma;
        } else {
            const [resIns] = await conn.query(`INSERT INTO idiomas (id_persona, idioma, lo_habla, lo_lee, lo_escribe) VALUES (?, ?, ?, ?, ?)`, [idPersona, rec.idioma, rec.habla, rec.lee, rec.escribe]);
            return resIns.insertId;
        }
    }

    async updateIdiomaDocumento(conn, idPersona, idiomaNombre, filename) {
        return conn.query(`UPDATE idiomas SET documento = ? WHERE id_persona = ? AND idioma = ?`, [filename, idPersona, idiomaNombre]);
    }

    async updateIdiomaDocumentoById(conn, id, filename) {
        return conn.query(`UPDATE idiomas SET documento = ? WHERE id_idioma = ?`, [filename, id]);
    }

    async deleteIdiomas(conn, idPersona, idsToDelete) {
        if (idsToDelete.length > 0) {
            return conn.query(`DELETE FROM idiomas WHERE id_idioma IN (?) AND id_persona = ?`, [idsToDelete, idPersona]);
        }
    }

    async saveExperienciaLaboral(conn, idPersona, rec) {
        if (rec.id_experiencia) {
            await conn.query(`UPDATE experiencia_laboral SET empleo_actual=?, empresa_entidad=?, tipo=?, pais=?, departamento=?, municipio=?, correo_entidad=?, telefono_entidad=?, fecha_ingreso=?, fecha_retiro=?, cargo_actual=?, dependencia=?, direccion=? WHERE id_experiencia=?`,
                [rec.empleo_actual, rec.empresa_entidad, rec.tipo, rec.pais, rec.departamento, rec.municipio, rec.correo_entidad, rec.telefono_entidad, rec.fecha_ingreso || null, rec.fecha_retiro || null, rec.cargo_actual, rec.dependencia, rec.direccion, rec.id_experiencia]);
            return rec.id_experiencia;
        } else {
            const [resIns] = await conn.query(`INSERT INTO experiencia_laboral (id_persona, empleo_actual, empresa_entidad, tipo, pais, departamento, municipio, correo_entidad, telefono_entidad, fecha_ingreso, fecha_retiro, cargo_actual, dependencia, direccion) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [idPersona, rec.empleo_actual, rec.empresa_entidad, rec.tipo, rec.pais, rec.departamento, rec.municipio, rec.correo_entidad, rec.telefono_entidad, rec.fecha_ingreso || null, rec.fecha_retiro || null, rec.cargo_actual, rec.dependencia, rec.direccion]);
            return resIns.insertId;
        }
    }

    async updateExperienciaLaboralDocumento(conn, idPersona, empresa, filename) {
        return conn.query(`UPDATE experiencia_laboral SET documento = ? WHERE id_persona = ? AND empresa_entidad = ?`, [filename, idPersona, empresa]);
    }

    async updateExperienciaLaboralDocumentoById(conn, id, filename) {
        return conn.query(`UPDATE experiencia_laboral SET documento = ? WHERE id_experiencia = ?`, [filename, id]);
    }

    async deleteExperienciaLaboral(conn, idPersona, idsToDelete) {
        if (idsToDelete.length > 0) {
            return conn.query(`DELETE FROM experiencia_laboral WHERE id_experiencia IN (?) AND id_persona = ?`, [idsToDelete, idPersona]);
        }
    }

    async saveTiempoExperiencia(conn, idPersona, datos) {
        const toInt = (v) => parseInt(v, 10) || 0;
        const vals = [
            toInt(datos.anios_servidor_publico),
            toInt(datos.meses_servidor_publico),
            toInt(datos.anios_sector_privado),
            toInt(datos.meses_sector_privado),
            toInt(datos.anios_trabajador_independiente),
            toInt(datos.meses_trabajador_independiente),
            toInt(datos.anios_total_experiencia),
            toInt(datos.meses_total_experiencia),
        ];
        const [rowsTiempo] = await conn.query(`SELECT 1 FROM tiempo_experiencia WHERE id_persona = ? LIMIT 1`, [idPersona]);
        if (!rowsTiempo || rowsTiempo.length === 0) {
            return conn.query(`INSERT INTO tiempo_experiencia (id_persona, anios_servidor_publico, meses_servidor_publico, anios_sector_privado, meses_sector_privado, anios_trabajador_independiente, meses_trabajador_independiente, anios_total_experiencia, meses_total_experiencia) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [idPersona, ...vals]);
        } else {
            return conn.query(`UPDATE tiempo_experiencia SET anios_servidor_publico=?, meses_servidor_publico=?, anios_sector_privado=?, meses_sector_privado=?, anios_trabajador_independiente=?, meses_trabajador_independiente=?, anios_total_experiencia=?, meses_total_experiencia=? WHERE id_persona=?`,
                [...vals, idPersona]);
        }
    }

    async searchPersonas(term) {
        let query = `
            SELECT DISTINCT p.* FROM personas p 
            LEFT JOIN educacion_superior es ON p.id_persona = es.id_persona 
            LEFT JOIN idiomas i ON p.id_persona = i.id_persona 
            WHERE 1=1
        `;
        const params = [];

        if (term) {
            const searchTerm = `%${term}%`;
            query += ` AND (
                   p.nombres LIKE ? 
                OR p.primer_apellido LIKE ? 
                OR p.segundo_apellido LIKE ?
                OR p.numero_documento LIKE ?
                OR p.email LIKE ?
                OR es.nombre_titulo LIKE ?
                OR i.idioma LIKE ?
            )`;
            params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
        }

        query += ' ORDER BY p.nombres ASC';

        const [rows] = await db.query(query, params);
        return rows;
    }
}

module.exports = new HojaRepository();
