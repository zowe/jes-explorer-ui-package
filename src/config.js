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
const path = require('path');
const rootDir = path.resolve(__dirname, '..');
const pkg = require('../package.json');

const os = require('os');
let keyring_js;
try {
  if (os.platform() == 'os390') {
    keyring_js = require('keyring_js');
  }
} catch (e) {
  process.stdout.write('Could not load zcrypto library, SAF keyrings will be unavailable\n');
}

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

  if( (param.key==='' && param.cert==='' && param.pfx==='' && param.pass==='' && param['keyring-owner']==='' && param['keyring'] ==='' && param['keyring-label']==='') && isValid) {
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

function loadKeyringCerts(param, config) {
  const serviceFor=param.service;
  if (config.https.key === '' && config.https.cert === '') {
    process.stdout.write(`[${serviceFor}] key and certificate not found, attempting to load from keyring\n`);
    if ((param['keyring-owner'] > '' || param['keyring-owner'] ) && (param['keyring'] > '' || param['keyring'] ) && ( param['keyring-label'] > '' || param['keyring-label'])){
      if (keyring_js) {
        try {
          const keyringData = keyring_js.getPemEncodedData(param['keyring-owner'], param['keyring'], param['keyring-label']);
          config.https.cert = keyringData.certificate;
          config.https.key = keyringData.key;
        } catch (err) {
          process.stderr.write(`[${serviceFor}] exception thrown when reading SAF keyring\n`);
          process.stderr.write(`${err}\n\n`);
          process.exit(1);
        }
      } else {
        process.stderr.write(`[${serviceFor}] cannot load SAF keyring due to missing keyring_js library\n`);
        process.exit(1);
      }
    }else{
      process.stderr.write(`[${serviceFor}] keyring configuration is missing\n`);
      process.exit(1);
    }

    if(config.https.key === '' && config.https.cert === ''){
      process.stderr.write(`[${serviceFor}] failed to process keyring\n`);
      process.exit(1);
    }
  }
  return config;
}

function loadPaths(config) {
  const paths = [];
  for (let one of config.paths) {
    const baseDir = path.resolve(rootDir, one.dir);
    process.stdout.write(`[${config.serviceFor}]   - ${one.uri} => ${baseDir}\n`);
    paths.push({ uri: one.uri, dir: baseDir });
  }
  config.paths = paths;
  return config;
}

function loadPackageMeta(config) {
  config.version = pkg && pkg.version;
  config.scriptName = pkg && pkg.name;
  config.serviceFor = config['service-for'] || config.scriptName;
  config.rootDir = rootDir;
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
  config=loadPackageMeta(config);
  config=parseCsp(config);
  config=loadHttpsCerts(config);
  config=loadKeyringCerts(params, config);
  config=loadPaths(config);
  return config;
};
