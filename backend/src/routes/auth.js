const express = require('express');
const { conn } = require('../config/database');
require('dotenv').config();

const authRouter = express.Router();

// Register
authRouter.post('/register', async (req, res) => {
  console.log(req.body);

  const { id, name } = req.body;
  if (!id || !name) return res.status(400).json({ message: 'ID and name required' });
  try {
    const query = `INSERT INTO USERS ("id", "name") VALUES (?, ?);`;
    conn.prepare(query, (err, statement) => {
      if (err) {
        console.log(err);
        return res.status(500).json({ message: 'DB error', error: err.message });
      }
      statement.exec([id, name], (err) => {
        statement.drop();
        if (err) {
          console.log(err);
          return res.status(400).json({ message: 'User may already exist', error: err.message });
        }
        res.status(201).json({ message: 'User registered', id, name });
      });
    });
  } catch (err) {
    console.error("[HANA DB] Preparation error:", err.message);
    res.status(500).json({
      error: "Internal server error",
      details: err.messages,
    });
  }
});

// Login
// authRouter.post('/login', async (req, res) => {
//   const { code } = req.body;
//   if (!code) return res.status(400).json({ message: 'Code required' });
//   try {
//     const query = `SELECT CODE FROM USERS WHERE CODE = ?`;
//     conn.prepare(query, (err, statement) => {
//       if (err) return res.status(500).json({ message: 'DB error', error: err.message });
//       statement.exec([code], async (err, rows) => {
//         statement.drop();
//         if (err || !rows || rows.length === 0) return res.status(401).json({ message: 'Invalid credentials' });
//         res.json({ code });
//       });
//     });
//   } catch (err) {
//     console.error("[HANA DB] Preparation error:", err.message);
//     res.status(500).json({
//       error: "Internal server error",
//       details: err.messages,
//     });
//   }
// });

// JWT Middleware
// function authenticateToken(req, res, next) {
//   const token = req.headers.token;
//   if (!token) return res.sendStatus(401);
//   jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
//     if (err) return res.sendStatus(403);
//     req.user = user;
//     console.log(req.user);
//     next();
//   });
// }

module.exports = { authRouter };
