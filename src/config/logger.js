const env = require('./env');

const LEVELS = { silent: -1, error: 0, warn: 1, info: 2, debug: 3 };

function log(level, message, meta = {}) {
  if (LEVELS[level] > LEVELS[env.logLevel]) return;
  const line = JSON.stringify({ time: new Date().toISOString(), level, message, ...meta });
  if (level === 'error') console.error(line);
  else console.log(line);
}

module.exports = {
  error: (message, meta) => log('error', message, meta),
  warn: (message, meta) => log('warn', message, meta),
  info: (message, meta) => log('info', message, meta),
  debug: (message, meta) => log('debug', message, meta),
};
