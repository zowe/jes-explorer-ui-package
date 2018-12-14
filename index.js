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
const fs = require('fs');

process.env.NODE_ENV = 'production';

let app = express();
const port = 3000;

const options = {
  key: fs.readFileSync('/u/jcain/zowe/0.9.5/api-mediation/keystore/localhost/localhost.keystore.key'),
  cert: fs.readFileSync('/u/jcain/zowe/0.9.5/api-mediation/keystore/localhost/localhost.keystore.cer-ebcdic'),
  ca: fs.readFileSync('/u/jcain/zowe/0.9.5/api-mediation/keystore/local_ca/localca.cer-ebcdic'),
  secureProtocol: "TLSv1_2_method",
  rejectUnauthorized: false
};

app.use('/ui/v1/jes-explorer', express.static('public'));
https.createServer(options, app).listen(port, '0.0.0.0', () => console.log(`JES Explorer listening on ${port}`));