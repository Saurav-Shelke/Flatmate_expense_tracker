'use strict';

const { neon } = require('@neondatabase/serverless');

let sqlInstance = null;

function getSql() {
  if (!sqlInstance) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is required');
    }
    sqlInstance = neon(process.env.DATABASE_URL);
  }
  return sqlInstance;
}

const sqlProxy = new Proxy(function () {}, {
  apply(target, thisArg, argumentsList) {
    const client = getSql();
    return Reflect.apply(client, thisArg, argumentsList);
  },
  get(target, prop) {
    const client = getSql();
    return client[prop];
  },
});

module.exports = sqlProxy;

