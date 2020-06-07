const https = require('https');
const { constants: cryptoConstants } = require('crypto');

function createHttpsServer (config, app) {
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

  const httpsServer = https.createServer(config.https, app);
  return httpsServer;
}


module.exports = (config, app) => {
  const httpsServer = createHttpsServer(config, app);
  return httpsServer;
};
