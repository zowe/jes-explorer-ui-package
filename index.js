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

//the path here should become relative 
//we should know we're in zowe_install_dir so should be able to construct a path such as ../api-mediation/keystore/localhost/localhost.keystore.p12
const options = {
	pfx: fs.readFile('/u/jcain/zowe/0.9.4/api-mediation/keystore/localhost/localhost.keystore.p12'),
	passphrase: 'password'
};

app.use('/ui/v1/express', express.static('public'));
https.createServer(options, app).listen(port, '0.0.0.0', () => console.log(`JES Explorer listening on ${port}`));
//http.createServer(app).listen(port, '0.0.0.0', () => console.log(`JES Explorer listening on ${port}`));
