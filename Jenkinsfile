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
    def lib = library("jenkins-library@classes").org.zowe.jenkins_shared_library

    def pipeline = lib.pipelines.nodejs.NodeJSPipeline.new(this)

    pipeline.admins.add("jackjia")

    pipeline.setup(
      packageName: 'org.zowe.explorer-ui-server',
      github: [
        email                      : 'zowe.robot@gmail.com',
        usernamePasswordCredential : 'zowe-robot-github',
      ],
      artifactory: [
        url                        : 'https://gizaartifactory.jfrog.io/gizaartifactory',
        usernamePasswordCredential : 'GizaArtifactory',
      ],
      publishRegistry: [
        email                      : 'giza-jenkins@gmail.com',
        usernamePasswordCredential : 'GizaArtifactory',
      ]
    )

    // lint before build
    pipeline.createStage(
        name          : "Lint",
        isSkippable   : true,
        stage         : {
            sh 'npm run lint'
        },
        timeout: [time: 5, unit: 'MINUTES']
    )

    pipeline.test(
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
