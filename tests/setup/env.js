// Se ejecuta antes de cada archivo de pruebas: garantiza el modo test
// (src/config/env.js apunta entonces a la base DB_NAME_TEST, nunca a la de desarrollo).
process.env.NODE_ENV = 'test';
