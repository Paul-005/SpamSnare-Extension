const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { conn } = require('../config/database');
require('dotenv').config();

const authRouter = express.Router();

// Register
authRouter.post('/register', async (req, res) => {
  console.log(req.body);

  const { email, password, name } = req.body;
  if (!email || !password || !name) return res.status(400).json({ message: 'Email and password required' });
  const hashedPassword = await bcrypt.hash(password, 10);
  try {
    const query = `INSERT INTO USERS (EMAIL, PASSWORD, NAME) VALUES (?, ?, ?)`;
    conn.prepare(query, (err, statement) => {
      if (err) return res.status(500).json({ message: 'DB error', error: err.message });
      statement.exec([email, hashedPassword, name], (err) => {
        statement.drop();
        if (err) return res.status(400).json({ message: 'User may already exist', error: err.message });
        res.status(201).json({ message: 'User registered' });
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
authRouter.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'Email and password required' });
  try {
    const query = `SELECT PASSWORD FROM USERS WHERE EMAIL = ?`;
    conn.prepare(query, (err, statement) => {
      if (err) return res.status(500).json({ message: 'DB error', error: err.message });
      statement.exec([email], async (err, rows) => {
        statement.drop();
        if (err || !rows || rows.length === 0) return res.status(401).json({ message: 'Invalid credentials' });
        const valid = await bcrypt.compare(password, rows[0].PASSWORD);
        if (!valid) return res.status(401).json({ message: 'Invalid credentials' });
        const token = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.json({ token });
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

// JWT Middleware
function authenticateToken(req, res, next) {
  const token = req.headers.token;
  if (!token) return res.sendStatus(401);
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    console.log(req.user);
    next();
  });
}

module.exports = { authRouter, authenticateToken };
