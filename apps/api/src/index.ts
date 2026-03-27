import { env } from './config/env.js';
import { buildApp } from './app.js';
import { runMigrations } from './db/migrate.js';

async function main() {
  await runMigrations();

  const app = await buildApp();

  try {
    await app.listen({ port: env.PORT, host: env.HOST });
    console.log(`Server running at http://${env.HOST}:${env.PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();
