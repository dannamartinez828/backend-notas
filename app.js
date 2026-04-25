require('dotenv').config();
console.log("ENV cargado:", process.env.DATABASE_URL);
const express = require('express');
const cors = require('cors');
const pool = require('./db');
const swaggerUi = require('swagger-ui-express');

const app = express();
app.use(cors());
app.use(express.json());

/* ========================
   TEST CONEXIÓN DB
======================== */
pool.query('SELECT NOW()')
  .then(res => console.log("✅ DB conectada:", res.rows))
  .catch(err => console.error("❌ Error DB:", err));
  console.log("URL:", process.env.DATABASE_URL);

/* ========================
   SWAGGER
======================== */
const swaggerUi = require('swagger-ui-express');

const swaggerDoc = {
  openapi: "3.0.0",
  info: {
    title: "API Notas",
    version: "1.0.0",
    description: "API para gestionar estudiantes y notas"
  },
  servers: [
    {
      url: "https://backend-notas-production.up.railway.app"
    }
  ],
  paths: {
    "/estudiantes": {
      get: {
        summary: "Obtener todos los estudiantes",
        responses: {
          200: {
            description: "Lista de estudiantes"
          }
        }
      },
      post: {
        summary: "Crear estudiante",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  cedula: { type: "string" },
                  nombre: { type: "string" },
                  correo: { type: "string" },
                  celular: { type: "string" }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: "Estudiante creado"
          }
        }
      }
    },
    "/estudiantes/{cedula}": {
      get: {
        summary: "Consultar estudiante con notas",
        parameters: [
          {
            name: "cedula",
            in: "path",
            required: true,
            schema: { type: "string" }
          }
        ],
        responses: {
          200: {
            description: "Datos del estudiante"
          }
        }
      }
    },
    "/notas": {
      post: {
        summary: "Registrar notas",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  cedula: { type: "string" },
                  materia: { type: "string" },
                  nota1: { type: "number" },
                  nota2: { type: "number" },
                  nota3: { type: "number" },
                  nota4: { type: "number" }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: "Notas registradas"
          }
        }
      }
    }
  }
};

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDoc));

/* ========================
   REGISTRAR ESTUDIANTE
======================== */
app.post('/estudiantes', async (req, res) => {
  try {
    const { cedula, nombre, correo, celular } = req.body;

    if (!cedula || !nombre) {
      return res.status(400).json({ error: "Cedula y nombre son obligatorios" });
    }

    const result = await pool.query(
      'INSERT INTO estudiantes (cedula, nombre, correo, celular) VALUES ($1,$2,$3,$4) RETURNING *',
      [cedula, nombre, correo, celular]
    );

    res.json(result.rows[0]);

  } catch (err) {
    console.error("❌ ERROR POST /estudiantes:", err);
    res.status(500).json({ error: err.message || err });
  }
});

/* ========================
   CONSULTAR ESTUDIANTE + NOTAS
======================== */
app.get('/estudiantes/:cedula', async (req, res) => {
  try {
    const { cedula } = req.params;

    const estudiante = await pool.query(
      'SELECT * FROM estudiantes WHERE cedula=$1',
      [cedula]
    );

    if (estudiante.rows.length === 0) {
      return res.status(404).json({ message: "No encontrado" });
    }

    const notas = await pool.query(
      'SELECT * FROM notas WHERE estudiante_id=$1',
      [estudiante.rows[0].id]
    );

    res.json({
      estudiante: estudiante.rows[0],
      notas: notas.rows
    });

  } catch (err) {
    console.error("❌ ERROR GET /estudiantes:", err);
    res.status(500).json({ error: err.message || err });
  }
});

/* ========================
   REGISTRAR NOTAS
======================== */
app.post('/notas', async (req, res) => {
  try {
    const { cedula, materia, nota1, nota2, nota3, nota4 } = req.body;

    const estudiante = await pool.query(
      'SELECT * FROM estudiantes WHERE cedula=$1',
      [cedula]
    );

    if (estudiante.rows.length === 0) {
      return res.status(404).json({ message: "Estudiante no existe" });
    }

    const estudiante_id = estudiante.rows[0].id;

    const definitiva =
      (Number(nota1) + Number(nota2) + Number(nota3) + Number(nota4)) / 4;

    const result = await pool.query(
      `INSERT INTO notas 
      (estudiante_id, materia, nota1, nota2, nota3, nota4, definitiva)
      VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [estudiante_id, materia, nota1, nota2, nota3, nota4, definitiva]
    );

    res.json(result.rows[0]);

  } catch (err) {
    console.error("❌ ERROR POST /notas:", err);
    res.status(500).json({ error: err.message || err });
  }
});

/* ========================
   EXTRA (VER TODOS)
======================== */
app.get('/estudiantes', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM estudiantes');
    res.json(result.rows);
  } catch (err) {
    console.error("❌ ERROR GET /estudiantes:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ========================
   SERVIDOR
======================== */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
});