#!/usr/bin/env node

/**
 * This program and the accompanying materials are made available under the terms of the
 * Eclipse Public License v2.0 which accompanies this distribution, and is available at
 * https://www.eclipse.org/legal/epl-v20.html
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Copyright IBM Corporation 2018, 2019
 */

// load command line params
const stdio = require('stdio');
const params = stdio.getopt({
  'service': {key: 's',  args:1, description: 'service-for path', default:'', type: 'string'},
  'path': {key: 'b', args:1,    description: 'base path uri', default:''},
  'dir': {key: 'd',  args:1, description: 'base dir', default: '../app'},
  'port': {key: 'p',  args:1, description: 'listening port'},
  'key': {key: 'k',  args:1,description: 'server key', default:'' },
  'cert': {key: 'c', args:1, description: 'server cert', default:''},
  'pfx': {key: 'x', args:1, description: 'server pfx', default:''},
  'pass': {key: 'w', args:1, description: 'server pfx passphrase', default:''},
  'csp': {key: 'f', args:1, description: 'csp whitelist ancestors frames', default:''},
  'verbose': {key: 'v', default:false}
});

// load config
let config;
try {
  config = require('./config')(params);
  process.stdout.write(`[rootDir]:${config.rootDir}\n`);
  process.stdout.write(`[version]:${config.version}\n`);
  process.stdout.write(`[script name]:${config.name}\n`);
  process.stdout.write(`[serviceFor]:${config.serviceFor}\n`);
  process.stdout.write(`[paths]:${JSON.stringify(config.paths)}\n`);
} catch (err) {
  process.stderr.write('failed to process config\n');
  process.stderr.write(`${err}\n\n`);
  process.exit(1);
}

// start server
try {
  
  const express = require('express');
  const expressStaticGzip = require('express-static-gzip');
  const app = express();
  const csp = require('helmet-csp');
  app.disable('x-powered-by');
  if(config.csp['frame-ancestors'].length>0) {
    app.use(csp({directives: {frameAncestors:config.csp['frame-ancestors']}}));
  }
  app.use(config.paths[0].uri,expressStaticGzip(config.paths[0].dir));

  const httpsServer =require('./server')(config,app);
  httpsServer.listen(config.port, '0.0.0.0', () => { process.stdout.write(`[${config.serviceFor}] is started and listening on ${config.port}...\n\n`);});

} catch (err) {
  process.stderr.write(`[${config.serviceFor}] is failed to start, error:\n`);
  process.stderr.write(`[${config.serviceFor}] ${err}\n\n`);
  process.exit(1);
}
