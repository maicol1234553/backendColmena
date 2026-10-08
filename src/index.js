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
app.use(cors({ origin: process.env.CLIENT_ORIGIN?.split(',') ?? '*', credentials: true }));
app.use(express.json({ limit: '256kb' }));
app.use(morgan('dev'));

app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'evieland-api' }));

app.use('/api/auth', authRoutes);
app.use('/api/hives', hiveRoutes);
app.use('/api/records', recordRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🐝 Evieland API escuchando en http://localhost:${PORT}`));
