/**
 * This program and the accompanying materials are made available under the terms of the
 * Eclipse Public License v2.0 which accompanies this distribution, and is available at
 * https://www.eclipse.org/legal/epl-v20.html
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Copyright IBM Corporation 2018
 */

const express = require('express');
const https = require('https');
const path = require('path');

const config = require('./configs');

// define app
const app = express();

// server static folder
app.use(`/ui/${config.apiVersion}`, express.static(path.join('..', 'public')));

// start server
https.createServer(config.https, app)
  .listen(config.port, '0.0.0.0', () => {
    console.log(`Explorer UI Server is started and listening on ${config.port}`)
  });
