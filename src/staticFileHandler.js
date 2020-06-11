const fs = require('fs');
const path = require('path');
const cache = new Map();


// mime
const mimeList = {
  js: 'text/javascript',
  css: 'text/css',
  json: 'application/json',
  png: 'image/png',
  jpg: 'image/jpg',
  svg: 'image/svg+xml'
};
const mimeDefault = 'text/html';
const mimeError = 'text/plain';

let config;
const initHandler = (initConfig) => {
  config = initConfig;
};

// write log
const writeLog =  (request, response, code, file) => {
  if (!config.verbose) {
    return;
  }

  const ts = new Date();
  const tss = ts.toUTCString();
  process.stdout.write(`[${config.serviceFor}][${tss}] ${request.url} ${code} ${file}\n`);
};

const mapRequestToUrl = (request) => { 
  let url = request.url;
  if (url.substr(-1) === '/') {
    url = url + 'index.html';
  }
  return url;
};

const mapUrlToFile = (url) => { 
  // locate dir based on path
  let baseuri = null;
  let basedir = null;
  let file = null;
  for (let one of config.paths) {
    if (url.substr(0, one.uri.length) === one.uri) {
      baseuri = one.uri;
      basedir = one.dir;
      break;
    }
  }

  if (baseuri) {
    file = path.resolve(basedir, url.substr(
      baseuri.substr(-1) === '/' ? baseuri.length : baseuri.length + 1
    ));

    if(file !==null && file.endsWith('min.js')) {
      const gzpath = path.resolve(file+'.gz');
      if(fs.existsSync(gzpath)) {
        file = gzpath;
      }
    }
  }

  return file;
};

const mapUrlToContentType = (url) => { 
  const ext = url.split(/\./).slice(-1)[0].toLowerCase();
  let contentType = (ext && mimeList[ext]) || mimeDefault;
  return contentType;
};

const mapFileToContentEncoding = (file) => { 
  return (file !== null && file.endsWith('.gz')) ? 'gzip' : '';
};

const buildCSPHeader = () => { 
  // check CSP settings
  if (config.csp) {
    // check frame-ancestors settings
    if (config.csp['frame-ancestors']) {
      const frameAncestors = config.csp['frame-ancestors'].join(' ').trim().toLowerCase();
      if (frameAncestors) {
        return `frame-ancestors ${frameAncestors}`;
      }
    }
  }
  return '';
};

const send404 = (request, response, error) => {
  writeLog(request.url, 404, `error#${error.code}`);

  response.writeHead(404, { 'Content-Type': mimeError });
  response.end('File not found');
};

const send301 = (request, response, error) => {
  writeLog(request.url, 301, error.code);

  response.writeHead(301, {
    'Content-Type': mimeError,
    'Location': `${request.url}/`
  });
  response.end('Moved Permanently');
};

const send500 = (request, response, error) => {
  writeLog(request.url, 500, `error#${error.code}`);

  response.writeHead(500, { 'Content-Type': mimeError });
  response.end(`Read file failed with error: ${error.code} ..\n`);
};

const handleFileReadError = (request, response, file, error) => {
  if (error.code == 'ENOENT') {
    send404(request,response,{code: file});
  } else if (error.code == 'EISDIR') {
    send301(request,response,{code: file});
  } else {
    send500(request,response,error);
  }
};

const attachCSPHeader = (response) => {
  const cspHeader = buildCSPHeader();
  if(cspHeader>'') {
    response.setHeader('Content-Security-Policy', cspHeader);
  }
  return response;
};

const handleFileReadSuccess = (request, response, url, file, content) => {
  
  // TODO: it can be its own handler/middleware
  response = attachCSPHeader(response);

  // set content headers
  const contentType = mapUrlToContentType(url);
  const contentEncoding = mapFileToContentEncoding(file);
  
  // send file content
  writeLog(request.url, 200, file);
  let headers = {'Content-Type': contentType};
  if(contentEncoding>'') {
    headers['Content-Encoding'] = contentEncoding;
  }
  response.writeHead(200, headers);
  response.end(content);
};

const readFile = (request, file) => new Promise((resolve, reject) => {
  const absPath = path.resolve(file);

  // Read File from cache
  if (cache.has(absPath)) {
    resolve(cache.get(absPath));
    return;
  }

  // update cache
  updateCache(request, absPath).then((data) => {
    resolve(data);
  }).catch((error)=>{
    reject(error);
  });

});

const updateCache = (request, file) => new Promise((resolve, reject) => {
  const absPath = path.resolve(file);
  // Read File from disk
  fs.readFile(absPath, (error, data) => {
    if (error) {
      reject(error);
      return;
    }
    cache.set(absPath, data);
    resolve(data);
  });
});

// define app
const requestHandler = (request, response) => {
  // process.stdout.write(`[request]:${request.url}\n`);

  const targetUrl = mapRequestToUrl(request);
  const targetFile = mapUrlToFile(targetUrl);

  // process.stdout.write(`[targetUrl]:${targetUrl}\n`);
  // process.stdout.write(`[targetFile]:${targetFile}\n`);


  if(targetFile === null) {
    // process.stdout.write(`[targetFile]:${targetFile} not found\n`);
    send404(request, response, {code:'ENOFILE'});
    return;
  }

  //read file
  const fileContent = readFile(request, targetFile);
  
  // file read success
  fileContent.then((content)=>{
    // process.stdout.write(`[targetFile]:${targetFile} success\n`);
    handleFileReadSuccess(request, response, targetUrl, targetFile, content);
  });

  // file read error
  fileContent.catch((error)=> {
    // process.stdout.write(`[targetFile]:${targetFile} error\n`);
    handleFileReadError(request, response, targetFile, error);
    return;
  });
};

module.exports = (config) => {
  initHandler(config);
  return requestHandler;
};