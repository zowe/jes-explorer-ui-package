const fs = require('fs');
const path = require('path');
const cache = new Map();

const { Logger } = require('../../zlux/zlux-shared/src/logging/logger.js');
let logger = new Logger();
logger.addDestination(logger.makeDefaultDestination(true,true,true,true,true,"ZWEU"));
var clusterLogger = logger.makeComponentLogger("_zsf.cluster");


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
const writeLog =  (url, code, error, file) => { 
  let writeMessage;
  if (!config.verbose) {
    return;
  }

  if (error.code) {
    writeMessage = `Request ${url} ended with code ${code} and error ${error.code} for file ${file}`;
  }
  else {
    writeMessage = `Request ${url} ended with code ${code} for file ${file}`; 
  }  
  clusterLogger.info(writeMessage);
  
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

const send404 = (request, response, error, file) => {
  writeLog(request.url, 404, error, file);

  response.writeHead(404, { 'Content-Type': mimeError });
  response.end('File not found');
};

const send301 = (request, response, error, file) => {
  writeLog(request.url, 301, error, file);

  response.writeHead(301, {
    'Content-Type': mimeError,
    'Location': `${request.url}/`
  });
  response.end('Moved Permanently');
};

const send500 = (request, response, error, file) => {
  writeLog(request.url, 500, error, file);

  response.writeHead(500, { 'Content-Type': mimeError });
  response.end(`Read file failed with error: ${error.code} ..\n`);
};

const handleFileReadError = (request, response, file, error) => {
  if (error.code == 'ENOENT') {
    send404(request,response,error,file);
  } else if (error.code == 'EISDIR') {
    send301(request,response,error,file);
  } else {
    send500(request,response,error,file);
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
  writeLog(request.url, 200, {error: null}, file);
  let headers = {'Content-Type': contentType};
  if(contentEncoding>'') {
    headers['Content-Encoding'] = contentEncoding;
  }
  response.writeHead(200, headers);
  response.end(content);
};

const readFile = (request, response, file) => new Promise((resolve, reject) => {
  const absPath = path.resolve(file);

  // Read File from cache
  if (cache.has(absPath)) {
    response.setHeader('X-ZOWE-UI-SERVER-CACHE', 'true');
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
  clusterLogger.debug(`[request]:${request.url}\n`);

  const targetUrl = mapRequestToUrl(request);
  const targetFile = mapUrlToFile(targetUrl);

  clusterLogger.debug(`[targetUrl]:${targetUrl}\n`);
  clusterLogger.debug(`[targetFile]:${targetFile}\n`);


  if(targetFile === null) {
    clusterLogger.debug(`[targetFile]:${targetFile} not found\n`);
    send404(request, response, {code:'ENOFILE'});
    return;
  }

  //read file
  const fileContent = readFile(request, response, targetFile);
  
  // file read success
  fileContent.then((content)=>{
    clusterLogger.debug(`[targetFile]:${targetFile} success\n`);
    handleFileReadSuccess(request, response, targetUrl, targetFile, content);
  });

  // file read error
  fileContent.catch((error)=> {
    clusterLogger.debug(`[targetFile]:${targetFile} error\n`);
    handleFileReadError(request, response, targetFile, error);
    return;
  });
};

module.exports = (config) => {
  initHandler(config);
  return requestHandler;
};