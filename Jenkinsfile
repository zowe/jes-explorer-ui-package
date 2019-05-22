#!groovy

/**
 * This program and the accompanying materials are made available under the terms of the
 * Eclipse Public License v2.0 which accompanies this distribution, and is available at
 * https://www.eclipse.org/legal/epl-v20.html
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Copyright IBM Corporation 2018, 2019
 */

node('ibm-jenkins-slave-nvm') {
  def lib = library("jenkins-library").org.zowe.jenkins_shared_library

  def pipeline = lib.pipelines.nodejs.NodeJSPipeline.new(this)

  pipeline.admins.add("jackjia", "jcain")

  pipeline.setup(
    packageName: 'org.zowe.explorer-ui-server',
    github: [
      email                      : lib.Constants.DEFAULT_GITHUB_ROBOT_EMAIL,
      usernamePasswordCredential : lib.Constants.DEFAULT_GITHUB_ROBOT_CREDENTIAL,
    ],
    artifactory: [
      url                        : lib.Constants.DEFAULT_ARTIFACTORY_URL,
      usernamePasswordCredential : lib.Constants.DEFAULT_ARTIFACTORY_ROBOT_CREDENTIAL,
    ],
    publishRegistry: [
      email                      : lib.Constants.DEFAULT_NPM_PRIVATE_REGISTRY_EMAIL,
      usernamePasswordCredential : lib.Constants.DEFAULT_NPM_PRIVATE_REGISTRY_CREDENTIAL,
    ]
  )

  // we need sonar scan
  pipeline.sonarScan(
    scannerTool     : 'sonar-scanner-3.2.0',
    scannerServer   : 'sonar-default-server'
  )

  // build stage is required
  pipeline.build(
    operation: {
      echo "build holder"
    }
  )

  pipeline.test(
    name          : 'Unit',
    junit         : "reports/junit.xml",
    cobertura     : [
      coberturaReportFile       : "reports/cobertura-coverage.xml"
    ],
    htmlReports   : [
      [dir: "reports/test-report", files: "index.html", name: "Report: Test Result"],
      [dir: "reports/lcov-report", files: "index.html", name: "Report: Code Coverage"],
    ],
  )

  // define we need publish stage
  pipeline.publish()

  // define we need release stage
  pipeline.release()

  pipeline.end()
}
