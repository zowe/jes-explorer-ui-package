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
const fs = require('fs');
const https = require('https');

// load package meta
const pkg = require('../package.json');
const version = pkg && pkg.version;
const name = pkg && pkg.name;
const rootDir = path.resolve(__dirname, '..');

// define args
var argv = require('yargs')
  .version(version)
  .scriptName(name)
  .usage('Usage: $0 [options]')
  .option('C', {
    alias: 'config',
    default: 'config-default.json',
    description: 'config JSON file',
  })
  .option('v', {
    alias: 'verbose',
    default: false,
    description: 'show request logs',
    type: 'boolean'
  })
  .help('h')
  .alias('h', 'help')
  .argv;

// load config
const configFile = path.resolve(rootDir, 'configs', argv.config);
const config = require('./config')(configFile);
const serviceFor = config['service-for'] || name;

// mime
const mimeList = {
  js: 'text/javascript',
  css: 'text/css',
  json: 'application/json',
  png: 'image/png',
  jpg: 'image/jpg',
  svg: 'image/svg+xml'
};
const mimeDefault = 'text/html';

// server static folder
process.stdout.write(`[${serviceFor}] config file ${configFile}:\n`);
process.stdout.write(`[${serviceFor}] paths will be served:\n`);
const paths = [];
for (let one of config.paths) {
  const baseDir = path.resolve(rootDir, one.dir);
  process.stdout.write(`[${serviceFor}]   - ${one.uri} => ${baseDir}\n`);
  paths.push({ uri: one.uri, dir: baseDir });
}

// define app
const requestHandler = (request, response) => {
  let url = request.url;
  if (url.substr(-1) === '/') {
    url = url + 'index.html';
  }

  // write log
  const writeLog = (url, code, file) => {
    if (!argv.verbose) {
      return;
    }

    const ts = new Date();
    const tss = ts.toUTCString();
    process.stdout.write(`[${serviceFor}][${tss}] ${request.url} ${code} ${file}\n`);
  };

  // locate dir based on path
  let baseuri = null;
  let basedir = null;
  let file = null;
  for (let one of paths) {
    if (url.substr(0, one.uri.length) === one.uri) {
      baseuri = one.uri;
      basedir = one.dir;
      break;
    }
  };
  if (baseuri) {
    file = path.resolve(basedir, url.substr(baseuri.length + 1));
  }

  // decide content type
  let ext = path.extname(url).toLowerCase();
  let contentType = mimeDefault;
  if (mimeList[`.${ext}`]) {
    contentType = mimeList[`.${ext}`];
  }

  if (file) {
    // read file
    fs.readFile(file, (error, content) => {
      if (error) {
        if (error.code == 'ENOENT') {
          writeLog(request.url, 404, file);
          response.writeHead(404, { 'Content-Type': 'text/plain' });
          response.end('File not found');
        } else {
          writeLog(request.url, 500, `error#${error.code}`);
          response.writeHead(500, { 'Content-Type': 'text/plain' });
          response.end('Read file failed with error: ' + error.code + ' ..\n');
          response.end();
        }
      } else {
        writeLog(request.url, 200, file);
        response.writeHead(200, { 'Content-Type': contentType });
        response.end(content);
      }
    });
  } else {
    writeLog(request.url, 404, `error#`);
    response.writeHead(404, { 'Content-Type': 'text/plain' });
    response.end('File not found');
  }
};

// start server
https.createServer(config.https, requestHandler)
  .listen(config.port, '0.0.0.0', () => {
    process.stdout.write(`[${serviceFor}] is started and listening on ${config.port}...\n\n`);
  });
