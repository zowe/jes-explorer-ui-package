/**
 * This program and the accompanying materials are made available under the terms of the
 * Eclipse Public License v2.0 which accompanies this distribution, and is available at
 * https://www.eclipse.org/legal/epl-v20.html
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Copyright IBM Corporation 2018, 2019
 */

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

const startTestServer = (config, verbose = false) => {
  let params = ['src/index.js'];
  if (config) {
    params.push('-C');
    params.push(config);
  }
  if (verbose) {
    params.push('-v');
  }

  const child = child_process.spawn('node', params);
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
  debug(`${tagTestServer} killing testing server ...`);
  // Send SIGHUP to process
  pid.kill('SIGHUP');

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

const request = async (testcase, url, port = 8080, maxRedirects = 0) => {
  const REQ = axios.create({
    baseURL: `https://localhost:${port}`,
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

module.exports = {
  sleep,
  waitUntil,

  startTestServer,
  stopTestServer,

  request,
};
