/**
 * This program and the accompanying materials are made available under the terms of the
 * Eclipse Public License v2.0 which accompanies this distribution, and is available at
 * https://www.eclipse.org/legal/epl-v20.html
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Copyright IBM Corporation 2019
 */

const expect = require('chai').expect;
const debug = require('debug')('test:explorer-ui-server:multiple');

const U = require('../utils');
const TEST_SERVER_PORT = 9090;

let serverPid;

// allow self signed certs
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function initTest(configName) {
  serverPid = await U.startTestServer(`../test/https-combos/${configName}`, true);
  debug(`testing server is started as PID #${serverPid.pid}`);
}

async function testSuccessResponse() {
  const res = await U.request(this, '/', TEST_SERVER_PORT, 1);
  expect(res).to.have.property('status');
  expect(res.status).to.equal(200);
  expect(res.data).to.be.a('string');
  expect(res.data).to.include('index page');
  expect(res.headers).to.include({ 'content-type': U.CONTENT_TYPE.TEXT_HTML });
}

async function testFailedResponse(configName) {
  try {
    serverPid = await U.startTestServer(`../test/https-combos/${configName}`, true);
    debug(`testing server is started as PID #${serverPid.pid}`);
    expect(serverPid).to.be.null();
  } catch (e) {
    debug('Server starting failed:', e);
    expect(e).to.be.an('error');
    expect(e.output).to.be.an('object');
    expect(e.output.stderr).to.include('https configuration is missing');
  }
}

describe('test https combos', function() {
 
  afterEach('shutdown test server', async function() {
    await U.stopTestServer(serverPid);
  });

  it('using key-cert should return index.html when requesting /', async function() {
    await initTest('key.json');
    await testSuccessResponse();
  });

  it('using key-cert-pass should return index.html when requesting /', async function() {
    await initTest('keyWithPass.json');
    await testSuccessResponse();
  });
  
  it('using pfx-pass should return index.html when requesting /', async function() {
    await initTest('pfx.json');
    await testSuccessResponse();
  });

  it('using both-key-cert-pfx-pass should return index.html when requesting /', async function() {
    await initTest('bothKeyPass.json');
    await testSuccessResponse();
  });

  it('using only pass should fail on start', async function() {
    await testFailedResponse('fail_onlypass.json');
  });

  it('using only pfx should fail on start', async function() {
    await testFailedResponse('fail_onlypfx.json');
  });

  it('using only key should fail on start', async function() {
    await testFailedResponse('fail_onlykey.json');
  });

  it('using only cert should fail on start', async function() {
    await testFailedResponse('fail_onlycert.json');
  });

  it('using only cert should fail on start', async function() {
    await testFailedResponse('fail_randomcombo.json');
  });
});
