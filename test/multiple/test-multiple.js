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

describe('test with 2 paths mounted on /relpath1 and /relpath2', function() {
  before('start test server', async function() {
    serverPid = await U.startTestServer('../test/multiple/config.json', true);
    debug(`testing server is started as PID #${serverPid.pid}`);
  });

  after('shutdown test server', async function() {
    await U.stopTestServer(serverPid);
  });

  it('should return 404 error when requesting /', async function() {
    const res = await U.request(this, '/', TEST_SERVER_PORT);

    expect(res).to.have.property('status');
    expect(res.status).to.equal(404);
    expect(res.headers).to.include({ 'content-type': 'text/plain' });
  });

  it('should return index.html when requesting /relpath1 if follow redirect', async function() {
    const res = await U.request(this, '/relpath1', TEST_SERVER_PORT, 1);

    expect(res).to.have.property('status');
    expect(res.status).to.equal(200);
    expect(res.data).to.be.a('string');
    expect(res.data).to.include('index page');
    expect(res.headers).to.include({ 'content-type': 'text/html' });
  });

  it('should return index.html when requesting /relpath2 if follow redirect', async function() {
    const res = await U.request(this, '/relpath2', TEST_SERVER_PORT, 1);

    expect(res).to.have.property('status');
    expect(res.status).to.equal(200);
    expect(res.data).to.be.a('string');
    expect(res.data).to.include('index page');
    expect(res.headers).to.include({ 'content-type': 'text/html' });
  });

  it('should return 404 error when requesting /relpath3', async function() {
    const res = await U.request(this, '/relpath3', TEST_SERVER_PORT);

    expect(res).to.have.property('status');
    expect(res.status).to.equal(404);
    expect(res.headers).to.include({ 'content-type': 'text/plain' });
  });
});
