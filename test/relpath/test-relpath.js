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
const debug = require('debug')('test:explorer-ui-server:relpath');

const U = require('../utils');
const TEST_SERVER_PORT = process.env.UI_SERVER_PORT || 9090;

let serverPid;

// allow self signed certs
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

describe('test with 1 path mounted on /relpath', function() {
  before('start test server', async function() {
    serverPid = await U.startTestServer('../test/relpath/config.json');
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

  it('should return index.html when requesting /relpath if follow redirect', async function() {
    const res = await U.request(this, '/relpath', TEST_SERVER_PORT, 1);

    expect(res).to.have.property('status');
    expect(res.status).to.equal(200);
    expect(res.data).to.be.a('string');
    expect(res.data).to.include('index page');
    expect(res.headers).to.include({ 'content-type': 'text/html' });
  });

  it('should return 301 when requesting /relpath', async function() {
    const res = await U.request(this, '/relpath', TEST_SERVER_PORT);

    expect(res).to.have.property('status');
    expect(res.status).to.equal(301);
    expect(res.headers).to.include({ 'content-type': 'text/plain', location: '/relpath/', });
  });

  it('should return page1.html when requesting /relpath/page1.html', async function() {
    const res = await U.request(this, '/relpath/page1.html', TEST_SERVER_PORT);

    expect(res).to.have.property('status');
    expect(res.status).to.equal(200);
    expect(res.data).to.be.a('string');
    expect(res.data).to.include('page1');
    expect(res.headers).to.include({ 'content-type': 'text/html' });
  });

  it('should return 404 error when requesting /relpath/page-not-exists.html', async function() {
    const res = await U.request(this, '/relpath/page-not-exists.html', TEST_SERVER_PORT);

    expect(res).to.have.property('status');
    expect(res.status).to.equal(404);
    expect(res.headers).to.include({ 'content-type': 'text/plain' });
  });

  it('should return index.html when requesting /relpath/path1 if follow redirect', async function() {
    const res = await U.request(this, '/relpath/path1', TEST_SERVER_PORT, 1);

    expect(res).to.have.property('status');
    expect(res.status).to.equal(200);
    expect(res.data).to.be.a('string');
    expect(res.data).to.include('path1');
    expect(res.headers).to.include({ 'content-type': 'text/html' });
  });

  it('should return 301 when requesting /relpath/path1', async function() {
    const res = await U.request(this, '/relpath/path1', TEST_SERVER_PORT);

    expect(res).to.have.property('status');
    expect(res.status).to.equal(301);
    expect(res.headers).to.include({ 'content-type': 'text/plain', location: '/relpath/path1/', });
  });

  it('should return page2.html when requesting /relpath/path1/page2.html', async function() {
    const res = await U.request(this, '/relpath/path1/page2.html', TEST_SERVER_PORT);

    expect(res).to.have.property('status');
    expect(res.status).to.equal(200);
    expect(res.data).to.be.a('string');
    expect(res.data).to.include('page2');
    expect(res.headers).to.include({ 'content-type': 'text/html' });
  });

  it('should return 404 error when requesting /relpath/path1/page-not-exists.html', async function() {
    const res = await U.request(this, '/relpath/path1/page-not-exists.html', TEST_SERVER_PORT);

    expect(res).to.have.property('status');
    expect(res.status).to.equal(404);
    expect(res.headers).to.include({ 'content-type': 'text/plain' });
  });

  it('should return svg image when requesting /relpath/assets/HTML5_Logo.svg', async function() {
    const res = await U.request(this, '/relpath/assets/HTML5_Logo.svg', TEST_SERVER_PORT);

    expect(res).to.have.property('status');
    expect(res.status).to.equal(200);
    expect(res.headers).to.include({ 'content-type': 'image/svg+xml' });
  });

  it('should return png image when requesting /relpath/assets/HTML5_Logo_32.png', async function() {
    const res = await U.request(this, '/relpath/assets/HTML5_Logo_32.png', TEST_SERVER_PORT);

    expect(res).to.have.property('status');
    expect(res.status).to.equal(200);
    expect(res.headers).to.include({ 'content-type': 'image/png' });
  });

  it('should return json when requesting /relpath/assets/json.json', async function() {
    const res = await U.request(this, '/relpath/assets/json.json', TEST_SERVER_PORT);

    expect(res).to.have.property('status');
    expect(res.status).to.equal(200);
    expect(res.data).to.be.an('object');
    expect(res.data.ok).to.equal('yes');
    expect(res.headers).to.include({ 'content-type': 'application/json' });
  });

  it('should return js file when requesting /relpath/assets/javascript.js', async function() {
    const res = await U.request(this, '/relpath/assets/javascript.js', TEST_SERVER_PORT);

    expect(res).to.have.property('status');
    expect(res.status).to.equal(200);
    expect(res.data).to.be.a('string');
    expect(res.data).to.include('javascript test');
    expect(res.headers).to.include({ 'content-type': 'text/javascript' });
  });

  it('should return js file even when js.gz file exists requesting /relpath/assets/javascript.js', async function() {
    const res = await U.request(this, '/relpath/assets/javascript.js', TEST_SERVER_PORT);

    expect(res).to.have.property('status');
    expect(res.status).to.equal(200);
    expect(res.data).to.be.a('string');
    expect(res.data).to.include('javascript test');
    expect(res.data).to.not.include('cnvyr.min.js.gz');
    expect(res.headers).to.include({ 'content-type': 'text/javascript' });
  });

  it('should return min.js file when no min.js.gz file when requesting /relpath/assets/javascript1.min.js', async function() {
    const res = await U.request(this, '/relpath/assets/javascript1.min.js', TEST_SERVER_PORT);

    expect(res).to.have.property('status');
    expect(res.status).to.equal(200);
    expect(res.data).to.be.a('string');
    expect(res.data).to.include('javascript test');
    expect(res.headers).to.include({ 'content-type': 'text/javascript' });
    expect(res.headers).to.not.include({ 'content-encoding': '' });
  });

  it('should return gz file if exists when requesting /relpath/assets/javascript2.min.js', async function() {
    const {res,data} = await U.request2(this, '/relpath/assets/javascript2.min.js', TEST_SERVER_PORT);

    expect(res).to.have.property('status');
    expect(res.status).to.equal(200);
    expect(data).to.be.a('string');
    expect(data).to.include('javascript test');
    expect(data).to.include('cnvyr.min.js.gz');
    expect(res.headers.get('content-type')).to.equal('text/javascript');
    expect(res.headers.get('content-encoding')).to.equal('gzip');
  });

  it('should return css when requesting /relpath/assets/css.css', async function() {
    const res = await U.request(this, '/relpath/assets/css.css', TEST_SERVER_PORT);

    expect(res).to.have.property('status');
    expect(res.status).to.equal(200);
    expect(res.data).to.be.a('string');
    expect(res.data).to.include('.custome-class');
    expect(res.headers).to.include({ 'content-type': 'text/css' });
  });
});
