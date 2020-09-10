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
const debug = require('debug')('test:explorer-ui-server:cache');

const U = require('../utils');
const TEST_SERVER_PORT = process.env.UI_SERVER_PORT || 9090;

let serverPid;

// allow self signed certs
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

describe('test with 1 path mounted on /cache', function() {
  before('start test server', async function() {
    serverPid = await U.startTestServer('../test/cache/config.json');
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

  it('should return test.html when requesting /cache/test.html', async function() {
    let res = await U.request(this, '/cache/test.html', TEST_SERVER_PORT, 1);

    expect(res).to.have.property('status');
    expect(res.status).to.equal(200);
    expect(res.data).to.be.a('string');
    expect(res.data).to.include('test html');
    expect(res.headers).to.include({ 'content-type': 'text/html' });
    expect(res.headers).to.not.include({ 'x-zowe-ui-server-cache': 'true' });

    // requesting again should have cache headers
    res = await U.request(this, '/cache/test.html', TEST_SERVER_PORT, 1);
    expect(res).to.have.property('status');
    expect(res.status).to.equal(200);
    expect(res.data).to.be.a('string');
    expect(res.data).to.include('test html');
    expect(res.headers).to.include({ 'content-type': 'text/html' });
    expect(res.headers).to.include({ 'x-zowe-ui-server-cache': 'true' });
  });


  it('should return test.css when requesting /cache/test.css', async function() {
    let res = await U.request(this, '/cache/test.css', TEST_SERVER_PORT, 1);

    expect(res).to.have.property('status');
    expect(res.status).to.equal(200);
    expect(res.data).to.be.a('string');
    expect(res.data).to.include('.custome-class');
    expect(res.headers).to.include({ 'content-type': 'text/css' });
    expect(res.headers).to.not.include({ 'x-zowe-ui-server-cache': 'true' });

    // requesting again should have cache headers
    res = await U.request(this, '/cache/test.css', TEST_SERVER_PORT, 1);
    expect(res).to.have.property('status');
    expect(res.status).to.equal(200);
    expect(res.data).to.be.a('string');
    expect(res.data).to.include('.custome-class');
    expect(res.headers).to.include({ 'content-type': 'text/css' });
    expect(res.headers).to.include({ 'x-zowe-ui-server-cache': 'true' });
  });

  it('should return test1.min.js when requesting /cache/test1.min.js', async function() {
    let {res,data} = await U.request2(this, '/cache/test1.min.js', TEST_SERVER_PORT);

    expect(res).to.have.property('status');
    expect(res.status).to.equal(200);
    expect(data).to.be.a('string');
    expect(data).to.include('javascript test1');
    expect(res.headers.get('content-type')).to.equal('text/javascript');
    expect(res.headers.get('content-encoding')).to.be.null;
    expect(res.headers.get('x-zowe-ui-server-cache')).to.be.null;

    let {res:res1,data:data1} = await U.request2(this, '/cache/test1.min.js', TEST_SERVER_PORT);

    expect(res1).to.have.property('status');
    expect(res1.status).to.equal(200);
    expect(data1).to.be.a('string');
    expect(data1).to.include('javascript test1');
    expect(res1.headers.get('content-type')).to.equal('text/javascript');
    expect(res1.headers.get('content-encoding')).to.be.null;
    expect(res1.headers.get('x-zowe-ui-server-cache')).to.equal('true');
  });

  it('should return test.min.js when requesting /cache/test.min.js', async function() {
    let {res,data} = await U.request2(this, '/cache/test.min.js', TEST_SERVER_PORT);

    expect(res).to.have.property('status');
    expect(res.status).to.equal(200);
    expect(data).to.be.a('string');
    expect(data).to.include('javascript test');
    expect(data).to.include('cnvyr.min.js.gz');
    expect(res.headers.get('content-type')).to.equal('text/javascript');
    expect(res.headers.get('content-encoding')).to.equal('gzip');
    expect(res.headers.get('x-zowe-ui-server-cache')).to.be.null;

    let {res:res1,data:data1} = await U.request2(this, '/cache/test.min.js', TEST_SERVER_PORT);

    expect(res1).to.have.property('status');
    expect(res1.status).to.equal(200);
    expect(data1).to.be.a('string');
    expect(data1).to.include('javascript test');
    expect(data1).to.include('cnvyr.min.js.gz');
    expect(res1.headers.get('content-type')).to.equal('text/javascript');
    expect(res1.headers.get('content-encoding')).to.equal('gzip');
    expect(res1.headers.get('x-zowe-ui-server-cache')).to.equal('true');
  });

});