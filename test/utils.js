/**
 * This program and the accompanying materials are made available under the terms of the
 * Eclipse Public License v2.0 which accompanies this distribution, and is available at
 * https://www.eclipse.org/legal/epl-v20.html
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Copyright IBM Corporation 2018, 2019
 */
const fetch = require('node-fetch');
const AbortController = require('abort-controller');
const child_process = require('child_process');
const debug = require('debug')('test:utils');
const _ = require('lodash');
const axios = require('axios');
const addContext = require('mochawesome/addContext');

const tagTestServer = '[TESTSERVER]';

const sleep = seconds => {
  return new Promise((resolve) => {
    setTimeout(resolve, seconds);
  });
};

const waitUntil = (escapeFunction, interval = 50, timeout = 10000) => {
  // Run the function once without setting up any listeners in case it's already true
  try {
    const result = escapeFunction();

    if (result) {
      return Promise.resolve(result);
    }
  } catch (e) {
    return Promise.reject(e);
  }

  return new Promise((resolve, reject) => {
    let timoutId;

    const intervalId = setInterval(() => {
      try {
        const result = escapeFunction();

        if (result) {
          timoutId && clearTimeout(timoutId);
          intervalId && clearInterval(intervalId);

          resolve(result);
        }
      } catch (e) {
        timoutId && clearTimeout(timoutId);
        intervalId && clearInterval(intervalId);

        reject(e);
      }
    }, interval);

    timoutId = setTimeout(() => {
      timoutId && clearTimeout(timoutId);
      intervalId && clearInterval(intervalId);

      // Try to reject with a TimeoutError, like Bluebird has
      if (Promise.TimeoutError) {
        reject(new Promise.TimeoutError('Wait until promise timed out'));
      } else {
        reject(new Error('Wait until promise timed out'));
      }
    }, timeout);
  });
};


const buildParams = (configPath) => {
  const config = require(configPath);
  let params = [];

  if(config['service-for']) {
    params.push('-s');
    params.push(config['service-for']);
  }

  if(config['paths'] && config['paths'].length>0 ) {
    if(config['paths'][0]['uri']) {
      params.push('-b');
      params.push(config['paths'][0]['uri']);
    }

    if(config['paths'][0]['dir']) {
      params.push('-d');
      params.push(config['paths'][0]['dir']);
    }
  }

  if(config['port']) {
    params.push('-p');
    params.push(process.env.UI_SERVER_PORT || config['port']);
  }

  if(config['csp'] && config['csp']['frame-ancestors'] && config['csp']['frame-ancestors'].length>0) {
    params.push('-f');
    params.push(config['csp']['frame-ancestors'][0]);
  }

  if(config['https']) {
    let httpsConfig = config['https'];
    if(httpsConfig['key']) {
      params.push('-k');
      params.push(config['https']['key']);
    }

    if(httpsConfig['cert']) {
      params.push('-c');
      params.push(config['https']['cert']);
    }

    if(httpsConfig['pfx']) {
      params.push('-x');
      params.push(config['https']['pfx']);
    }

    if(httpsConfig['passphrase']) {
      params.push('-w');
      params.push(config['https']['passphrase']);
    }

    if(httpsConfig['keyring']) {
      params.push('-n');
      params.push(config['https']['keyring']);
    }

    if(httpsConfig['keyring-owner']) {
      params.push('-o');
      params.push(config['https']['keyring-owner']);
    }

    if(httpsConfig['keyring-label']) {
      params.push('-l');
      params.push(config['https']['keyring-label']);
    }

  }
  return params;
};


const startTestServer = (config, verbose = false) => {
  console.log('startTestServer:', config);
  let params = ['src/index.js'];
  if (config) {
    params=params.concat(buildParams(config));
  }

  if (verbose) {
    params.push('-v');
  }

  let child;
  child = child_process.spawn('node', params);
  
  let serverStarted = 0;
  let output = {
    stdout: '',
    stderr: '',
  };

  child.stdout.on('data', (data) => {
    debug(`${tagTestServer} ${data}`);
    output.stdout += data;

    if (!serverStarted &&
      data.indexOf('[explorer-ui-server] is started and listening on') > -1) {
      debug(`${tagTestServer} testing server is started.`);
      serverStarted = 1;
    }
  });

  child.stderr.on('data', (data) => {
    debug(`${tagTestServer}[ERROR] ${data}`);
    output.stderr += data;
  });

  child.on('close', (code) => {
    debug(`${tagTestServer} test server exited with code ${code}`);
    serverStarted = -1;
  });

  return new Promise((resolve, reject) => {
    waitUntil(() => {
      if (serverStarted === -1) {
        throw new Error('test server exited prematurely');
      } else {
        return serverStarted === 1;
      }
    })
      .then(() => {
        resolve(child);
      })
      .catch(err => {
        err.output = output;
        reject(err);
      });
  });
};

const stopTestServer = async pid => {
  if (!pid) {
    debug('unable to stop undefined pid, server is not running');
    return;
  }

  debug(`${tagTestServer} killing testing server ...`);
  // Send SIGHUP to process
  pid.kill();

  return new Promise((resolve, reject) => {
    waitUntil(() => pid.killed)
      .then(() => {
        debug(`${tagTestServer} testing server is killed.`);
        resolve();
      })
      .catch(err => {
        reject(err);
      });
  });
};

const request = async (testcase, url, port = 9090, maxRedirects = 0) => {
  const baseURL = process.env.UI_SERVER_BASE_URL || `https://localhost:${port}`;
  console.log('baseUrl:',baseURL);

  const REQ = axios.create({
    baseURL,
    timeout: 5000,
  });

  const req = {
    method: 'get',
    url: url,
    maxRedirects: maxRedirects,
  };
  debug('[request] request', req);

  let res;
  try {
    res = await REQ.request(req);
  } catch (err) {
    res = err && err.response;
  }
  debug('[request] response', _.pick(res, ['status', 'statusText', 'headers', 'data']));
  addContext(testcase, {
    title: 'http response',
    value: res && res.data
  });

  return res;
};


const request2 = async (testcase, url, port = 9090, maxRedirects = 0) => {
  const baseURL = process.env.UI_SERVER_BASE_URL || `https://localhost:${port}`;
  console.log('baseUrl:',baseURL);
  const REQ = {
    baseURL,
    timeout: 5000,
  };

  const req = {
    method: 'get',
    url: url,
    maxRedirects: maxRedirects,
  };
  debug('[request] request', req);

  const controller = new AbortController();
  const timeoutObj = setTimeout(() => {
    controller.abort();
  }, REQ.timeout);

  let res, data;
  try {
    res = await fetch(`${REQ.baseURL}${url}`, {
      method: 'GET',
      redirect: 'follow',
      follow: maxRedirects,
      signal: controller.signal
    });
    if (res.ok) {
      data = await res.text();
    }
  } catch (err) {
    res = err && err.response;
    if (err.name === 'AbortError') {
      debug('request was aborted');
    } 
  } finally {
    clearTimeout(timeoutObj);
  }
  
  debug('[request] response', _.pick(res, ['status', 'statusText', 'headers'], data));
  addContext(testcase, {
    title: 'http response',
    value: data
  });

  return {res, data};
};

module.exports = {
  sleep,
  waitUntil,

  startTestServer,
  stopTestServer,

  request,
  request2
};
