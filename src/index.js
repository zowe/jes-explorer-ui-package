#!/usr/bin/env node

/**
 * This program and the accompanying materials are made available under the terms of the
 * Eclipse Public License v2.0 which accompanies this distribution, and is available at
 * https://www.eclipse.org/legal/epl-v20.html
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Copyright IBM Corporation 2018
 */

const path = require('path');
const express = require('express');
const https = require('https');

// load package meta
const pkg = require('../package.json');
const version = pkg && pkg.version;
const name = pkg && pkg.name;

// define args
var argv = require('yargs')
  .version(version)
  .scriptName(name)
  .usage('Usage: $0 [options]')
  .option('C', {
    alias: 'config',
    default: 'default-configs/config-default.json',
    description: 'config JSON file',
  })
  .help('h')
  .alias('h', 'help')
  .argv;

// load config
const config = require('./config')(argv.config);
const serviceFor = config['service-for'] || name;

// define app
const app = express();

// server static folder
process.stdout.write(`[${serviceFor}] paths will be served:\n`);
for (let one of config.paths) {
  const baseDir = path.resolve(one.dir);
  process.stdout.write(`[${serviceFor}]   - ${one.uri} => ${baseDir}\n`);
  app.use(one.uri, express.static(baseDir));
}

// start server
https.createServer(config.https, app)
  .listen(config.port, '0.0.0.0', () => {
    process.stdout.write(`[${serviceFor}] is started and listening on ${config.port}...\n`);
  });
