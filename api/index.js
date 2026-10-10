/**
 * Entrada serverless de Vercel para el backend Express.
 *
 * Vercel trata cada archivo dentro de `api/` como una función independiente.
 * Este módulo importa la app Express definida en `../src/app.js`
 * y la expone como manejador (req, res).
 */
const app = require('../src/app');

module.exports = (req, res) => app(req, res);