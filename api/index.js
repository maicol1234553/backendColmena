/**
 * Entrada serverless de Vercel para el backend Express.
 *
 * Vercel trata cada archivo dentro de `api/` como una función independiente.
 * Este módulo importa la app Express definida en `./backend/app.js`
 * y la expone como manejador (req, res).
 */
const app = require('./backend/app');

module.exports = (req, res) => app(req, res);