-- Inicialización de la base de datos para HojaDeVida
-- Cambia el nombre de la base de datos si lo deseas
CREATE DATABASE IF NOT EXISTS `hoja_de_vida` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `hoja_de_vida`;

-- Tabla personas
CREATE TABLE IF NOT EXISTS `personas` (
  `id_persona` INT AUTO_INCREMENT PRIMARY KEY,
  `nombres` VARCHAR(255) DEFAULT NULL,
  `primer_apellido` VARCHAR(255) DEFAULT NULL,
  `segundo_apellido` VARCHAR(255) DEFAULT NULL,
  `tipo_documento` VARCHAR(50) DEFAULT NULL,
  `numero_documento` VARCHAR(100) UNIQUE,
  `password` VARCHAR(255) DEFAULT NULL,
  `unique_identifier` VARCHAR(100) DEFAULT NULL,
  `vereda` VARCHAR(255) DEFAULT NULL,
  `email` VARCHAR(255) DEFAULT NULL,
  `telefono` VARCHAR(100) DEFAULT NULL,
  `sexo` CHAR(1) DEFAULT NULL,
  `nacionalidad` VARCHAR(100) DEFAULT NULL,
  `pais` VARCHAR(100) DEFAULT NULL,
  `pais_nacimiento` VARCHAR(100) DEFAULT NULL,
  `departamento_nacimiento` VARCHAR(100) DEFAULT NULL,
  `municipio_nacimiento` VARCHAR(100) DEFAULT NULL,
  `direccion_correspondencia` VARCHAR(500) DEFAULT NULL,
  `pais_correspondencia` VARCHAR(100) DEFAULT NULL,
  `departamento_correspondencia` VARCHAR(100) DEFAULT NULL,
  `municipio_correspondencia` VARCHAR(100) DEFAULT NULL,
  `tipo_libreta_militar` VARCHAR(100) DEFAULT NULL,
  `numero_libreta_militar` VARCHAR(100) DEFAULT NULL,
  `dm_libreta_militar` VARCHAR(100) DEFAULT NULL,
  `fecha_nacimiento` DATE DEFAULT NULL,
  `nombre_original_archivo` VARCHAR(255) DEFAULT NULL,
  `admin` ENUM('SI','NO') NOT NULL DEFAULT 'NO',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tabla idiomas
CREATE TABLE IF NOT EXISTS `idiomas` (
  `id_idioma` INT AUTO_INCREMENT PRIMARY KEY,
  `id_persona` INT NOT NULL,
  `idioma` VARCHAR(200) DEFAULT NULL,
  `lo_habla` VARCHAR(50) DEFAULT NULL,
  `lo_lee` VARCHAR(50) DEFAULT NULL,
  `lo_escribe` VARCHAR(50) DEFAULT NULL,
  `documento` VARCHAR(255) DEFAULT NULL,
  FOREIGN KEY (`id_persona`) REFERENCES personas(`id_persona`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tabla educacion_basica_media
CREATE TABLE IF NOT EXISTS `educacion_basica_media` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `id_persona` INT NOT NULL,
  `titulo_obtenido` VARCHAR(255) DEFAULT NULL,
  `educacion_basica` VARCHAR(255) DEFAULT NULL,
  `fecha_grado` YEAR DEFAULT NULL,
  `documento` VARCHAR(255) DEFAULT NULL,
  FOREIGN KEY (`id_persona`) REFERENCES personas(`id_persona`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tabla educacion_superior
CREATE TABLE IF NOT EXISTS `educacion_superior` (
  `id_educacion_superior` INT AUTO_INCREMENT PRIMARY KEY,
  `id_persona` INT NOT NULL,
  `modalidad_academica` VARCHAR(255) DEFAULT NULL,
  `semestres_aprobados` INT DEFAULT NULL,
  `graduado` ENUM('SI','NO') DEFAULT 'NO',
  `nombre_titulo` VARCHAR(255) DEFAULT NULL,
  `mes_terminacion` VARCHAR(50) DEFAULT NULL,
  `numero_tarjeta_profesional` VARCHAR(100) DEFAULT NULL,
  `documento` VARCHAR(255) DEFAULT NULL,
  FOREIGN KEY (`id_persona`) REFERENCES personas(`id_persona`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tabla experiencia_laboral
CREATE TABLE IF NOT EXISTS `experiencia_laboral` (
  `id_experiencia` INT AUTO_INCREMENT PRIMARY KEY,
  `id_persona` INT NOT NULL,
  `empleo_actual` ENUM('SI','NO') DEFAULT 'NO',
  `empresa_entidad` VARCHAR(255) DEFAULT NULL,
  `tipo` VARCHAR(100) DEFAULT NULL,
  `pais` VARCHAR(100) DEFAULT NULL,
  `departamento` VARCHAR(100) DEFAULT NULL,
  `municipio` VARCHAR(100) DEFAULT NULL,
  `correo_entidad` VARCHAR(255) DEFAULT NULL,
  `telefono_entidad` VARCHAR(100) DEFAULT NULL,
  `fecha_ingreso` DATE DEFAULT NULL,
  `fecha_retiro` DATE DEFAULT NULL,
  `cargo_actual` VARCHAR(255) DEFAULT NULL,
  `dependencia` VARCHAR(255) DEFAULT NULL,
  `direccion` VARCHAR(500) DEFAULT NULL,
  `documento` VARCHAR(255) DEFAULT NULL,
  FOREIGN KEY (`id_persona`) REFERENCES personas(`id_persona`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tabla tiempo_experiencia
CREATE TABLE IF NOT EXISTS `tiempo_experiencia` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `id_persona` INT NOT NULL,
  `anios_servidor_publico` INT DEFAULT 0,
  `meses_servidor_publico` INT DEFAULT 0,
  `anios_sector_privado` INT DEFAULT 0,
  `meses_sector_privado` INT DEFAULT 0,
  `anios_trabajador_independiente` INT DEFAULT 0,
  `meses_trabajador_independiente` INT DEFAULT 0,
  `anios_total_experiencia` INT DEFAULT 0,
  `meses_total_experiencia` INT DEFAULT 0,
  FOREIGN KEY (`id_persona`) REFERENCES personas(`id_persona`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tabla documentos (metadatos de archivos subidos)
CREATE TABLE IF NOT EXISTS `documentos` (
  `id_documento` INT AUTO_INCREMENT PRIMARY KEY,
  `id_persona` INT NOT NULL,
  `original_name` VARCHAR(255) DEFAULT NULL,
  `filename` VARCHAR(255) DEFAULT NULL,
  `mimetype` VARCHAR(100) DEFAULT NULL,
  `size` INT DEFAULT NULL,
  `path` VARCHAR(500) DEFAULT NULL,
  `uploaded_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`id_persona`) REFERENCES personas(`id_persona`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tabla junta_presidentes (usada en registro)
CREATE TABLE IF NOT EXISTS `junta_presidentes` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `vereda` VARCHAR(255) UNIQUE,
  `nombre_presidente` VARCHAR(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Índices útiles
CREATE INDEX IF NOT EXISTS idx_personas_numdoc ON personas (numero_documento(50));
CREATE INDEX IF NOT EXISTS idx_documentos_persona ON documentos (id_persona);

-- Datos de ejemplo (opcional)
INSERT IGNORE INTO junta_presidentes (vereda, nombre_presidente) VALUES
('Vereda1', 'Juan Perez'),
('Vereda2', 'María García');

-- Nota: Si usas express-mysql-session, la tabla de sesiones se crea automáticamente por la librería.
