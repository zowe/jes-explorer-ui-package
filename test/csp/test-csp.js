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
const debug = require('debug')('test:explorer-ui-server:csp');

const U = require('../utils');
const TEST_SERVER_PORT = 8080;

let serverPid;

// allow self signed certs
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

describe('test with 1 path mounted on /', function() {
  before('start test server', async function() {
    serverPid = await U.startTestServer('../test/csp/config.json');
    debug(`testing server is started as PID #${serverPid.pid}`);
  });

  after('shutdown test server', async function() {
    await U.stopTestServer(serverPid);
  });

  it('should return index.html when requesting /', async function() {
    const res = await U.request(this, '/', TEST_SERVER_PORT);
    debug('Response headers:', res.headers);

    expect(res).to.have.property('status');
    expect(res.status).to.equal(200);
    expect(res.data).to.be.a('string');
    expect(res.data).to.include('index page');
    expect(res.headers).to.include({
      'content-type': 'text/html',
      'content-security-policy': 'frame-ancestors https://test.zowe.org/*'
    });
  });
});
