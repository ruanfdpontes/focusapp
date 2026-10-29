'use strict';

const config = require('./config');
const { openDb } = require('./db');
const migrate = require('./migrate');
const seed = require('./seed');
const createApp = require('./app');

function main() {
  const db = openDb(config.DB_PATH);
  migrate(db);
  seed(db);

  const app = createApp(db);
  // Bind em 0.0.0.0 (todas as interfaces) é exigido pelo Render; em LAN local
  // continua acessível normalmente.
  app.listen(config.PORT, '0.0.0.0', () => {
    // eslint-disable-next-line no-console
    console.log(`Focus server escutando na porta ${config.PORT}`);
  });
}

main();
