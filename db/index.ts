import { neon, types } from '@neondatabase/serverless';

// Ensure PostgreSQL DATE columns (OID 1082) return exact YYYY-MM-DD strings without timezone shifting
if (types && typeof (types as any).setTypeParser === 'function') {
  (types as any).setTypeParser(1082, (val: string) => val);
}

let sqlInstance: any = null;

function getSql() {
  if (!sqlInstance) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is required');
    }
    sqlInstance = neon(process.env.DATABASE_URL);
  }
  return sqlInstance;
}

export const sql: any = new Proxy(function () {}, {
  apply(target, thisArg, argumentsList) {
    const client = getSql();
    return Reflect.apply(client, thisArg, argumentsList);
  },
  get(target, prop) {
    const client = getSql();
    return client[prop];
  },
});

export default sql;
