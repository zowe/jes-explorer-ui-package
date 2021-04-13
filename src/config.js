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
const { HTTPS_TYPE } = require('./utils');

const { Logger } = require('../../zlux-shared/src/logging/logger.js');
let logger = new Logger();
logger.addDestination(logger.makeDefaultDestination(true,true,true,true,true,'ZWEU'));
var clusterLogger = logger.makeComponentLogger('_zsf.cluster');

const os = require('os');
let keyring_js;
try {
  if (os.platform() == 'os390') {
    keyring_js = require('keyring_js');
  }
} catch (e) {
  clusterLogger.warn('Could not load zcrypto library, SAF keyrings will be unavailable\n');
}


function validateParams (params) {

  let isValid = true;

  const serviceFor=params.service;

  if((params.path==='' || !params.path) && isValid) {
    isValid = false;
    clusterLogger.critical(`[${serviceFor}] paths configuration is missing\n`);
  }

  if((params.port==='' || !params.port) && isValid) {
    isValid = false;
    clusterLogger.critical(`[${serviceFor}] port configuration is missing\n`);
  }

  if( (params.key==='' && params.cert==='' && params.pfx==='' && params.pass==='' && params['keyring'] ==='' && params['keyring-owner']==='' && params['keyring-label']==='') && isValid) {
    isValid = false;
    clusterLogger.critical(`[${serviceFor}] https configuration is missing\n`);
  }

  if( whichHttpsType(params)===0 && isValid) {
    isValid = false;
    clusterLogger.critical(`[${serviceFor}] https configuration is missing\n`);
  }

  if(!isValid) {
    clusterLogger.critical(`[${serviceFor}] is failed to start, error:\n`);
    params.printHelp();
    process.exit(1);
    return false;
  }

  return true;
}

function whichHttpsType(params) {
  if(params.key>'' && params.cert>'' && typeof params.key === 'string' && typeof params.cert === 'string') {
    return HTTPS_TYPE.KEY_CERT;
  }

  if(params.pfx>'' && params.pass>'' && typeof params.pfx === 'string' && typeof params.pass === 'string') {
    return HTTPS_TYPE.PFX_PASS;
  }

  if(params.keyring>'' && params['keyring-owner']>'' && params['keyring-label']>'') {
    return HTTPS_TYPE.KEYRING;
  }

  return 0;
}

function parseCsp(config) {
  if(config && config.csp && config.csp['frame-ancestors']) {
    const frames=config.csp['frame-ancestors'];
    if(frames.length>0 && frames[0]>'') {
      config.csp['frame-ancestors'] = frames[0].split(',');
    } else {
      config.csp['frame-ancestors'] = [];
    }
  }
  return config;
}

function loadHttpsCerts(config) {
  // load https type
  if (config && config.https) {
    if(config.https.type === HTTPS_TYPE.KEY_CERT) {
      config = loadKeyCerts(config);
    } else if(config.https.type === HTTPS_TYPE.PFX_PASS) {
      config = loadPfx(config);
    } else if(config.https.type === HTTPS_TYPE.KEYRING) {
      config = loadKeyringCerts(config);
    }
  }
  return config;
}

function loadKeyCerts(config) {
  const serviceFor = config.serviceFor;
  try {
    ['key', 'cert'].forEach(key => {
      let filePath = config.https[key];
      config.https[key] = fs.readFileSync(filePath);
    });
  } catch(err) {
    clusterLogger.critical(`[${serviceFor}] exception thrown when reading key cert files no such file or directory\n`);
    process.exit(1);
  }
  return config;
}

function loadPfx(config) {
  const serviceFor = config.serviceFor;
  try {
    let filePath = config.https['pfx'];
    config.https['pfx'] = fs.readFileSync(filePath);
  } catch(err) {
    clusterLogger.critical(`[${serviceFor}] exception thrown when reading pfx no such file or directory\n`);
    process.exit(1);
  }
  return config;
}

function loadKeyringCerts(config) {
  const serviceFor = config.serviceFor;

  if (keyring_js) {
    try {
      const keyringData = keyring_js.getPemEncodedData(config.https['keyring-owner'], config.https['keyring'], config.https['keyring-label']);
      config.https.cert = keyringData.certificate;
      config.https.key = keyringData.key;
    } catch (err) {
      clusterLogger.critical(`[${serviceFor}] exception thrown when reading SAF keyring\n`);
      clusterLogger.critical(`${err}\n\n`);
      process.exit(1);
    }
  } else {
    clusterLogger.critical(`[${serviceFor}] cannot load SAF keyring due to missing keyring_js library\n`);
    process.exit(1);
  }

  if(config.https.key === '' && config.https.cert === ''){
    clusterLogger.critical(`[${serviceFor}] failed to process keyring\n`);
    process.exit(1);
  }
  return config;
}

function loadPaths(config) {
  const paths = [];
  for (let one of config.paths) {
    const baseDir = path.resolve(rootDir, one.dir);
    clusterLogger.info(`[${config.serviceFor}]   - ${one.uri} => ${baseDir}\n`);
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
    clusterLogger.info(`[${params.service}]: args ${JSON.stringify(params)}\n`);
  }

  validateParams(params);

  const httpType = whichHttpsType(params);

  const paramConfig = {
    'service-for': params.service,
    'paths': [{
      'uri': params.path,
      'dir': params.dir
    }],
    'port': params.port,
    'https': {
      'type': httpType,
      'key': params.key,
      'cert': params.cert,
      'pfx': params.pfx,
      'passphrase': params.pass,
      'keyring': params.keyring,
      'keyring-owner': params['keyring-owner'],
      'keyring-label': params['keyring-label']
    },
    'csp': {
      'frame-ancestors': [params.csp]
    },
    'verbose': params.verbose,
  };

  return paramConfig;

}



module.exports = (params) => {
  let config = loadParams(params);
  config=loadPackageMeta(config);
  config=parseCsp(config);
  config=loadHttpsCerts(config);
  config=loadPaths(config);
  return config;
};
