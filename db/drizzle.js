'use strict';

const { drizzle } = require('drizzle-orm/neon-http');
const { neon } = require('@neondatabase/serverless');
const schema = require('./schema');

let db = null;

function getDb() {
  if (!db) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is required');
    }
    const client = neon(process.env.DATABASE_URL);
    db = drizzle(client, { schema });
  }
  return db;
}

module.exports = {
  getDb,
  schema,
};
