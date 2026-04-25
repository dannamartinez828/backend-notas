require('dotenv').config();

const express = require('express');
const cors = require('cors');
const pool = require('./db');

const app = express();

app.use(cors());
app.use(express.json());

/* =========================
   INICIO
========================= */
app.get('/', (req, res) => {
  res.send("API NOTAS funcionando");
});

/* =========================
   VER TODOS ESTUDIANTES
========================= */
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
app.post('/notas', async (req, res) => {
  try {
    const { cedula, materia, nota1, nota2, nota3, nota4 } = req.body;

    // buscar estudiante
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