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
      description:
        'Microservicios para registrar estudiantes, registrar notas y consultar información académica'
    },
    servers: [
      {
        url: 'https://backend-notas-production.up.railway.app',
        description: 'Servidor Producción Railway'
      },
      {
        url: 'http://localhost:3000',
        description: 'Servidor Local'
      }
    ],
    components: {
      schemas: {
        Estudiante: {
          type: 'object',
          required: ['cedula', 'nombre', 'correo'],
          properties: {
            cedula: {
              type: 'string',
              example: '123456789'
            },
            nombre: {
              type: 'string',
              example: 'Ana Lopez'
            },
            correo: {
              type: 'string',
              example: 'ana@gmail.com'
            },
            celular: {
              type: 'string',
              example: '3001234567'
            }
          }
        },

        Nota: {
          type: 'object',
          required: ['cedula', 'materia'],
          properties: {
            cedula: {
              type: 'string',
              example: '123456789'
            },
            materia: {
              type: 'string',
              example: 'Matematicas'
            },
            nota1: {
              type: 'number',
              example: 4.5
            },
            nota2: {
              type: 'number',
              example: 3.8
            },
            nota3: {
              type: 'number',
              example: 4.2
            },
            nota4: {
              type: 'number',
              example: 5.0
            }
          }
        }
      }
    }
  },
  apis: ['./app.js']
};

const swaggerSpec = swaggerJsdoc(options);

/* Swagger Visual */
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

/* Swagger JSON */
app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

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
 *         description: API funcionando correctamente
 */
app.get('/', (req, res) => {
  res.send('API NOTAS funcionando');
});

/* =========================
   VER TODOS ESTUDIANTES
========================= */
/**
 * @swagger
 * /estudiantes:
 *   get:
 *     summary: Obtener todos los estudiantes
 *     tags: [Estudiantes]
 *     responses:
 *       200:
 *         description: Lista de estudiantes
 */
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

    // 🔴 DUPLICADO CONTROLADO
    if (existe.rows.length > 0) {
      return res.status(409).json({
        error: 'ESTUDIANTE_EXISTE',
        message: 'La cédula ya está registrada'
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
 *         description: Datos del estudiante con notas
 *       404:
 *         description: No encontrado
 */
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
    console.log(error);

    res.status(500).json({
      error: error.message
    });
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
 *             $ref: '#/components/schemas/Estudiante'
 *     responses:
 *       200:
 *         description: Estudiante registrado
 */
app.post('/estudiantes', async (req, res) => {
  try {
    const { cedula, nombre, correo, celular } = req.body;

    if (!cedula || !nombre || !correo) {
      return res.status(400).json({
        error: 'Faltan datos obligatorios'
      });
    }

    const existe = await pool.query(
      'SELECT * FROM estudiantes WHERE cedula=$1',
      [cedula]
    );

    if (existe.rows.length > 0) {
      return res.status(409).json({
        error: 'La cédula ya existe'
      });
    }

    const result = await pool.query(
      `INSERT INTO estudiantes
      (cedula,nombre,correo,celular)
      VALUES($1,$2,$3,$4)
      RETURNING *`,
      [cedula, nombre, correo, celular]
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
   REGISTRAR NOTAS
========================= */
/**
 * @swagger
 * /notas:
 *   post:
 *     summary: Registrar notas de estudiante
 *     tags: [Notas]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Nota'
 *     responses:
 *       200:
 *         description: Nota registrada
 */
app.post('/notas', async (req, res) => {
  try {
    const {
      cedula,
      materia,
      nota1,
      nota2,
      nota3,
      nota4
    } = req.body;

    if (!cedula || !materia) {
      return res.status(400).json({
        error: 'Faltan datos'
      });
    }

    const estudiante = await pool.query(
      'SELECT * FROM estudiantes WHERE cedula=$1',
      [cedula]
    );

    if (estudiante.rows.length === 0) {
      return res.status(404).json({
        error: 'Estudiante no existe'
      });
    }

    const estudiante_id = estudiante.rows[0].id;

    const definitiva =
      (
        Number(nota1 || 0) +
        Number(nota2 || 0) +
        Number(nota3 || 0) +
        Number(nota4 || 0)
      ) / 4;

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
  console.log('Servidor corriendo en puerto ' + PORT);
});