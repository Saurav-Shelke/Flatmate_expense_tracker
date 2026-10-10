'use strict';

let app = null;
let loadError = null;

try {
  app = require('../app');
} catch (err) {
  loadError = {
    name: err.name,
    message: err.message,
    stack: err.stack,
  };
  console.error('[CRITICAL MODULE LOAD ERROR]', err);
}

module.exports = (req, res) => {
  if (loadError) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({
      error: 'Backend failed to initialize on Vercel',
      details: loadError,
      env: {
        hasDatabaseUrl: !!process.env.DATABASE_URL,
        hasSessionSecret: !!process.env.SESSION_SECRET,
        nodeVersion: process.version,
      }
    }, null, 2));
  }

  try {
    return app(req, res);
  } catch (err) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({
      error: 'Error during request execution',
      message: err.message,
      stack: err.stack,
    }));
  }
};
