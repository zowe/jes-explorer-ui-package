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
      url                        : 'https://zowe.jfrog.io/zowe',
      usernamePasswordCredential : 'ZoweArtifactory',
    ],
    publishRegistry: [
      email                      : 'jack-tiefeng.jia@ibm.com',
      usernamePasswordCredential : 'ZoweArtifactory',
    ]
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

  // we need sonar scan
  pipeline.sonarScan(
    scannerTool     : lib.Constants.DEFAULT_LFJ_SONARCLOUD_SCANNER_TOOL,
    scannerServer   : lib.Constants.DEFAULT_LFJ_SONARCLOUD_SERVER,
    allowBranchScan : lib.Constants.DEFAULT_LFJ_SONARCLOUD_ALLOW_BRANCH,
    failBuild       : lib.Constants.DEFAULT_LFJ_SONARCLOUD_FAIL_BUILD
  )

  // define we need publish stage
  pipeline.publish()

  // define we need release stage
  pipeline.release()

  pipeline.end()
}
