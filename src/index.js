/**
 * Arranque en local.  En Vercel esto no se usa: la entrada es api/index.js.
 */
const app = require('./app');

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🐝 Evieland API escuchando en http://localhost:${PORT}`));
