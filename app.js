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

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup({
  openapi: "3.0.0",
  info: {
    title: "API Notas",
    version: "1.0.0"
  }
}));

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