require('dotenv').config();

const express = require('express');
const cors = require('cors');
const pool = require('./db');

const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

const app = express();

app.use(cors());
app.use(express.json());

/* =========================
   SWAGGER CONFIG
========================= */
const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'API Sistema de Notas',
      version: '1.0.0',
      description: 'Backend para registrar estudiantes y notas'
    },
    servers: [
      {
        url: 'https://backend-notas-production.up.railway.app'
      }
    ]
  },
  apis: ['./app.js']
};

const swaggerSpec = swaggerJsdoc(options);

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

/* =========================
   INICIO
========================= */
/**
 * @swagger
 * /
 *   get:
 *     summary: Ruta principal
 *     tags: [Inicio]
 *     responses:
 *       200:
 *         description: API funcionando
 */
app.get('/', (req, res) => {
  res.send("API NOTAS funcionando");
});

/* =========================
   VER TODOS ESTUDIANTES
========================= */
/**
 * @swagger
 * /estudiantes:
 *   get:
 *     summary: Ver todos los estudiantes
 *     tags: [Estudiantes]
 *     responses:
 *       200:
 *         description: Lista estudiantes
 */
app.get('/estudiantes', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM estudiantes');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json(error);
  }
});

/* =========================
   CONSULTAR ESTUDIANTE
========================= */
/**
 * @swagger
 * /estudiantes/{cedula}:
 *   get:
 *     summary: Consultar estudiante por cédula
 *     tags: [Estudiantes]
 *     parameters:
 *       - in: path
 *         name: cedula
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Datos estudiante y notas
 */
app.get('/estudiantes/:cedula', async (req, res) => {
  try {
    const { cedula } = req.params;

    const estudiante = await pool.query(
      'SELECT * FROM estudiantes WHERE cedula=$1',
      [cedula]
    );

    if (estudiante.rows.length === 0) {
      return res.status(404).json({ mensaje: 'No existe' });
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
    res.status(500).json(error);
  }
});

/* =========================
   REGISTRAR ESTUDIANTE
========================= */
/**
 * @swagger
 * /estudiantes:
 *   post:
 *     summary: Registrar estudiante
 *     tags: [Estudiantes]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               cedula:
 *                 type: string
 *               nombre:
 *                 type: string
 *               correo:
 *                 type: string
 *               celular:
 *                 type: string
 *     responses:
 *       200:
 *         description: Estudiante creado
 */
app.post('/estudiantes', async (req, res) => {
  try {
    const { cedula, nombre, correo, celular } = req.body;

    const result = await pool.query(
      `INSERT INTO estudiantes
      (cedula,nombre,correo,celular)
      VALUES($1,$2,$3,$4)
      RETURNING *`,
      [cedula, nombre, correo, celular]
    );

    res.json(result.rows[0]);

  } catch (error) {
    res.status(500).json(error);
  }
});

/* =========================
   REGISTRAR NOTAS
========================= */
/**
 * @swagger
 * /notas:
 *   post:
 *     summary: Registrar notas
 *     tags: [Notas]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               cedula:
 *                 type: string
 *               materia:
 *                 type: string
 *               nota1:
 *                 type: number
 *               nota2:
 *                 type: number
 *               nota3:
 *                 type: number
 *               nota4:
 *                 type: number
 *     responses:
 *       200:
 *         description: Notas registradas
 */
app.post('/notas', async (req, res) => {
  try {
    const { cedula, materia, nota1, nota2, nota3, nota4 } = req.body;

    const estudiante = await pool.query(
      'SELECT * FROM estudiantes WHERE cedula=$1',
      [cedula]
    );

    if (estudiante.rows.length === 0) {
      return res.status(404).json({
        mensaje: "Estudiante no existe"
      });
    }

    const estudiante_id = estudiante.rows[0].id;

    const definitiva =
      (Number(nota1) +
       Number(nota2) +
       Number(nota3) +
       Number(nota4)) / 4;

    const result = await pool.query(
      `INSERT INTO notas
      (estudiante_id,materia,nota1,nota2,nota3,nota4,definitiva)
      VALUES($1,$2,$3,$4,$5,$6,$7)
      RETURNING *`,
      [
        estudiante_id,
        materia,
        nota1,
        nota2,
        nota3,
        nota4,
        definitiva
      ]
    );

    res.json(result.rows[0]);

  } catch (error) {
    console.log(error);
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
  console.log("Servidor corriendo");
});