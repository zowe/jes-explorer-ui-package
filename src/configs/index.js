const fs = require('fs');
const path = require('path');

let config = require('./config');

if (config && config.https) {
  ['key', 'cert', 'pfx'].forEach(key => {
    if (config.https[key]) {
      let file = config.https[key];
      if (!file.match(/^\//)) {
        file = path.join(__dirname, file);
      }
      config.https[key] = fs.readFileSync(file);
    }
  });
}

// NOTE: config.https configuration should be updated during Zowe installation

module.exports = config;
