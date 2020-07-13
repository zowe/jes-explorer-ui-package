const HTTPS_TYPE = {
  KEY_CERT: 1,
  PFX_PASS: 2,
  KEYRING: 3
};

const httpTypeToString = (type) => {
  if(type === HTTPS_TYPE.KEY_CERT) {
    return 'KEY_CERT';
  }
  if(type === HTTPS_TYPE.PFX_PASS) {
    return 'PFX_PASS';
  }
  if(type === HTTPS_TYPE.KEYRING) {
    return 'KEYRING';
  }
};

module.exports = {
  HTTPS_TYPE,
  httpTypeToString
};