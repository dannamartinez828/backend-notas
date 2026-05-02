require('dotenv').config();

const express = require('express');
const cors = require('cors');
const pool = require('./db');

const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

const app = express();

/* =========================
   CONFIG GENERAL
========================= */
app.use(cors());
app.use(express.json());
app.set('trust proxy', 1);

/* =========================
   SWAGGER CONFIG
========================= */
const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'API Sistema de Notas',
      version: '1.0.0',
      description: 'API de estudiantes y notas'
    }
  },
  apis: ['./app.js']
};

const swaggerSpec = swaggerJsdoc(options);

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

/* =========================
   HOME
========================= */
app.get('/', (req, res) => {
  res.send('API NOTAS funcionando');
});

/* =========================
   OBTENER ESTUDIANTES
========================= */
app.get('/estudiantes', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM estudiantes ORDER BY id ASC'
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/* =========================
   REGISTRAR ESTUDIANTE (CORREGIDO)
========================= */
app.post('/estudiantes', async (req, res) => {
  try {
    const { cedula, nombre, correo, celular } = req.body;

    if (!cedula || !nombre || !correo) {
      return res.status(400).json({
        error: 'FALTAN_DATOS'
      });
    }

    const existe = await pool.query(
      'SELECT * FROM estudiantes WHERE cedula=$1',
      [cedula]
    );

    // 🔴 SI YA EXISTE
    if (existe.rows.length > 0) {
      return res.status(409).json({
        error: 'ESTUDIANTE_EXISTE',
        message: 'Este estudiante ya está registrado'
      });
    }

    const result = await pool.query(
      `INSERT INTO estudiantes (cedula, nombre, correo, celular)
       VALUES ($1,$2,$3,$4)
       RETURNING *`,
      [cedula, nombre, correo, celular]
    );

    res.json(result.rows[0]);

  } catch (error) {
    console.log(error);
    res.status(500).json({
      error: 'ERROR_SERVER',
      message: error.message
    });
  }
});

/* =========================
   CONSULTAR ESTUDIANTE
========================= */
app.get('/estudiantes/:cedula', async (req, res) => {
  try {
    const { cedula } = req.params;

    const estudiante = await pool.query(
      'SELECT * FROM estudiantes WHERE cedula=$1',
      [cedula]
    );

    if (estudiante.rows.length === 0) {
      return res.status(404).json({
        mensaje: 'Estudiante no existe'
      });
    }

    const notas = await pool.query(
      'SELECT * FROM notas WHERE estudiante_id=$1',
      [estudiante.rows[0].id]
    );

    res.json({
      estudiante: estudiante.rows[0],
      notas: notas.rows
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/* =========================
   REGISTRAR NOTAS
========================= */
app.post('/notas', async (req, res) => {
  try {
    const { cedula, materia, nota1, nota2, nota3, nota4 } = req.body;

    const estudiante = await pool.query(
      'SELECT * FROM estudiantes WHERE cedula=$1',
      [cedula]
    );

    if (estudiante.rows.length === 0) {
      return res.status(404).json({
        error: 'ESTUDIANTE_NO_EXISTE'
      });
    }

    const id = estudiante.rows[0].id;

    const definitiva =
      (Number(nota1 || 0) +
        Number(nota2 || 0) +
        Number(nota3 || 0) +
        Number(nota4 || 0)) / 4;

    const result = await pool.query(
      `INSERT INTO notas
      (estudiante_id,materia,nota1,nota2,nota3,nota4,definitiva)
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      RETURNING *`,
      [id, materia, nota1, nota2, nota3, nota4, definitiva]
    );

    res.json(result.rows[0]);

  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});

/* =========================
   PUERTO
========================= */
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log('Servidor en puerto ' + PORT);
});