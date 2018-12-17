const fs = require('fs');
const path = require('path');

module.exports = (configFile) => {
  let config = require(path.resolve(configFile));

  // load https certs file content
  if (config && config.https) {
    ['key', 'cert', 'pfx'].forEach(key => {
      if (config.https[key]) {
        let file = path.resolve(config.https[key]);
        config.https[key] = fs.readFileSync(file);
      }
    });
  }

  return config;
};
