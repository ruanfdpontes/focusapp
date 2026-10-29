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
  app.listen(config.PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`Focus server escutando em http://localhost:${config.PORT}`);
  });
}

main();
