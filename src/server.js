const https = require('https');
const { constants: cryptoConstants } = require('crypto');
const { HTTPS_TYPE } = require('./utils');

function extractHttpsConfigFromConfig(config) {
  let httpsConfig = {};
  if(config.https.type === HTTPS_TYPE.KEY_CERT || config.https.type === HTTPS_TYPE.KEYRING) {
    httpsConfig = {
      key: config.https.key,
      cert: config.https.cert
    };
  } else if(config.https.type === HTTPS_TYPE.PFX_PASS) {
    httpsConfig = {
      pfx: config.https.pfx,
      passphrase: config.https.passphrase
    };
  }
  return httpsConfig;
}

function createHttpsServer (config, requestHandler) {
  if (!config.https ||
    !((config.https.cert && config.https.key) || (config.https.pfx && config.https.passphrase))) {
    throw new Error('https configuration is missing');
  }
  if (!config.port) {
    throw new Error('port configuration is missing');
  }
  if (config.paths.length === 0) {
    throw new Error('paths configuration is missing');
  }

  config.https.secureOptions = cryptoConstants.SSL_OP_NO_TLSv1 | cryptoConstants.SSL_OP_NO_TLSv1_1;
  config.https.ciphers = [
    'ECDHE-RSA-AES256-GCM-SHA384',
    'ECDHE-RSA-AES128-GCM-SHA256',
    'ECDHE-RSA-AES128-SHA256',
    'ECDHE-ECDSA-AES128-GCM-SHA256',
    'ECDHE-ECDSA-AES256-GCM-SHA384',
    'ECDHE-ECDSA-AES128-SHA256',
    'ECDHE-ECDSA-AES256-SHA384'].join(':');

  const httpsConfig = extractHttpsConfigFromConfig(config);
  const httpsServer = https.createServer(httpsConfig, requestHandler);
  return httpsServer;
}

module.exports = (config, requestHandler) => {
  const httpsServer = createHttpsServer(config, requestHandler);
  return httpsServer;
};
