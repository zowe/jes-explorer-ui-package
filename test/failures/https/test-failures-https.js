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
const debug = require('debug')('test:explorer-ui-server:failures-https');

const U = require('../../utils');

let serverPid;

// allow self signed certs
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

describe('test missing of configuration https entry', function() {
  after('shutdown test server', async function() {
    if (serverPid) {
      await U.stopTestServer(serverPid);
    }
  });

  it('should return exception and server shouldn\'t start', async function() {
    try {
      serverPid = await U.startTestServer('../test/failures/https/config.json');
      debug(`testing server is started as PID #${serverPid.pid}`);
      expect(serverPid).to.be.null();
    } catch (e) {
      debug('Server starting failed:', e);
      expect(e).to.be.an('error');
      expect(e.output).to.be.an('object');
      expect(e.output.stderr).to.include('https configuration is missing');
    }
  });
});
