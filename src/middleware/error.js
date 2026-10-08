function notFound(req, res) {
  res.status(404).json({ error: `Ruta no encontrada: ${req.method} ${req.originalUrl}` });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, _next) {
  console.error('✖', err);
  const status = err.status || 500;
  res.status(status).json({ error: err.message || 'Error interno del servidor' });
}

/** Envuelve controladores async para propagar errores a errorHandler */
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

module.exports = { notFound, errorHandler, asyncHandler };
