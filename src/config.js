/**
 * This program and the accompanying materials are made available under the terms of the
 * Eclipse Public License v2.0 which accompanies this distribution, and is available at
 * https://www.eclipse.org/legal/epl-v20.html
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Copyright IBM Corporation 2019
 */

const fs = require('fs');

function validateParams (param) {

  let isValid = true;

  const serviceFor=param.service;

  if((param.path==='' || !param.path) && isValid) {
    isValid = false;
    process.stderr.write(`[${serviceFor}] paths configuration is missing\n`);
  }

  if((param.port==='' || !param.port) && isValid) {
    isValid = false;
    process.stderr.write(`[${serviceFor}] port configuration is missing\n`);
  }

  if( (param.key==='' && param.cert==='' && param.pfx==='' && param.pass==='') && isValid) {
    isValid = false;
    process.stderr.write(`[${serviceFor}] https configuration is missing\n`);
  }

  if( ( (param.key==='' && param.cert>'') || (param.key>'' && param.cert==='')
      || (param.pfx==='' && param.pass>'' && param.key==='' && param.cert==='')
      || (param.pfx==='' && param.pass>'' && !(param.key>'' && param.cert>'')) 
      || (param.pfx>'' && param.pass==='') ) && isValid) {
    isValid = false;
    process.stderr.write(`[${serviceFor}] https configuration is missing\n`);
  }

  if(!isValid) {
    process.stderr.write(`[${serviceFor}] is failed to start, error:\n`);
    param.printHelp();
    process.exit(1);
    return false;
  }

  return true;
}

function parseCsp(config) {
  if(config && config.csp && config.csp['frame-ancestors']) {
    const frames=config.csp['frame-ancestors'];
    if(frames.length>0 && frames[0]>'') {
      config.csp['frame-ancestors'] = config.csp['frame-ancestors'][0].split(',');
    } else {
      config.csp['frame-ancestors'] = [];
    }
  }
  return config;
}

function loadHttpsCerts(config) {
  // load https certs file content
  if (config && config.https) {
    ['key', 'cert', 'pfx'].forEach(key => {
      if (config.https[key]) {
        let file = config.https[key];
        config.https[key] = fs.readFileSync(file);
      }
    });
  }
  return config;
}

function loadParams(params) {

  if(params.verbose) {
    process.stdout.write(`[args]:${JSON.stringify(params)}\n`);
  }

  validateParams(params);

  const paramConfig = {
    'service-for': params.service,
    'paths': [{
      'uri': params.path,
      'dir': params.dir
    }],
    'port': params.port,
    'https': {
      'key': params.key,
      'cert': params.cert,
      'pfx': params.pfx,
      'passphrase': params.pass,
    },
    'csp': {
      'frame-ancestors': [params.csp]
    }
  };

  return paramConfig;

}



module.exports = (params) => {
  let config = loadParams(params);
  config=parseCsp(config);
  config=loadHttpsCerts(config);
  return config;
};
