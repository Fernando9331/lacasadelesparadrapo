'use strict';

const { loadConfig } = require('./config');
const { openDb } = require('./db');
const { createMuxClient } = require('./mux');
const { createApp } = require('./app');
const { log } = require('./logger');

const config = loadConfig();
const db = openDb(config.dbPath);
const mux = createMuxClient(config.mux);
const app = createApp({ config, db, mux });

app.listen(config.port, () => {
  log('info', 'Servidor de transmisión iniciado', { port: config.port });
});
