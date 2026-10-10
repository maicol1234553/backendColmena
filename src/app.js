/**
 * Configuración de la app Express.
 * No llama `listen()`: así puede usarse tanto en local (src/index.js)
 * como función serverless en Vercel (api/index.js).
 */
require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');

const authRoutes = require('./routes/auth.routes');
const hiveRoutes = require('./routes/hive.routes');
const recordRoutes = require('./routes/record.routes');
const { notFound, errorHandler } = require('./middleware/error');

const app = express();

app.use(helmet());
const allowedOrigins = (process.env.CLIENT_ORIGIN ?? '*')
  .split(',')
  .map((o) => o.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '256kb' }));
app.use(morgan('dev'));

app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'evieland-api' }));

app.use('/api/auth', authRoutes);
app.use('/api/hives', hiveRoutes);
app.use('/api/records', recordRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
