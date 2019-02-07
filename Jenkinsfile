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


def repositoryName = 'zowe/explorer-ui-server'
def isPullRequest = env.BRANCH_NAME.startsWith('PR-')
def isMasterBranch = env.BRANCH_NAME == 'master'
def isReleaseBranch = env.BRANCH_NAME ==~ /^v[0-9]+\.[0-9]+\.[0-9x]+$/
def extraReleaseBranches = ['tag-release']
def supportedReleaseTypes = ['PATCH', 'MINOR', 'MAJOR']
def allowReleasing = false

def opts = []
// keep last 20 builds for regular branches, no keep for pull requests
opts.push(buildDiscarder(logRotator(numToKeepStr: (isPullRequest ? '' : '20'))))
// disable concurrent build
opts.push(disableConcurrentBuilds())

// define custom build parameters
def customParameters = []
customParameters.push(credentials(
  name: 'NPM_CREDENTIALS_ID',
  description: 'npm auth token',
  credentialType: 'org.jenkinsci.plugins.plaincredentials.impl.StringCredentialsImpl',
  defaultValue: 'giza-jenkins-basicAuth',
  required: true
))
customParameters.push(string(
  name: 'NPM_USER_EMAIL',
  description: 'npm user email',
  defaultValue: 'giza-jenkins@gmail.com',
  trim: true
))
customParameters.push(choice(
  name: 'NPM_RELEASE',
  description: 'Publish a release or snapshot version. By default, this task will create snapshot. If you choose release other than snapshot, your branch version will bump up. Release can only be enabled on `master` or version branch like `v1.2.3`.',
  choices: ['SNAPSHOT', 'PATCH', 'MINOR', 'MAJOR']
 ))
customParameters.push(string(
  name: 'ARTIFACTORY_SERVER',
  description: 'Artifactory server, should be pre-defined in Jenkins configuration',
  defaultValue: 'gizaArtifactory',
  trim: true
))
customParameters.push(credentials(
  name: 'GITHUB_CREDENTIALS',
  description: 'Github user credentials',
  credentialType: 'com.cloudbees.plugins.credentials.impl.UsernamePasswordCredentialsImpl',
  defaultValue: 'zowe-robot-github',
  required: true
))
customParameters.push(string(
  name: 'GITHUB_USER_EMAIL',
  description: 'github user email',
  defaultValue: 'zowe.robot@gmail.com',
  trim: true,
  required: true
))
customParameters.push(string(
  name: 'GITHUB_USER_NAME',
  description: 'github user name',
  defaultValue: 'Zowe Robot',
  trim: true,
  required: true
))
opts.push(parameters(customParameters))

// set build properties
properties(opts)

node ('ibm-jenkins-slave-nvm-jnlp') {
  currentBuild.result = 'SUCCESS'
  def packageName
  def packageVersion

  try {

    stage('checkout'){
      // checkout source code
      checkout scm

      // check if it's pull request
      echo "Current branch is ${env.BRANCH_NAME}"
      if (isPullRequest) {
        echo "This is a pull request"
      }

      // only if we are on master, or v?.?.? / v?.?.x branch, we allow release
      if (params.NPM_RELEASE && supportedReleaseTypes.any{it == "${params.NPM_RELEASE}"} &&
        (isMasterBranch || isReleaseBranch || extraReleaseBranches.any{it == "${env.BRANCH_NAME}"})) {
        allowReleasing = true
      } else {
        echo "Release will be skipped."
      }

      // get package information
      packageName = sh(script: "node -e \"console.log(require('./package.json').name)\"", returnStdout: true).trim()
      packageVersion = sh(script: "node -e \"console.log(require('./package.json').version)\"", returnStdout: true).trim()
      echo "Building ${packageName} v${packageVersion}..."
    }

    stage('prepare') {
      // show node/npm version
      sh 'node -v'
      sh 'npm -v'

      ansiColor('xterm') {
        // sh 'npm prune'
        sh 'npm ci'
      }
    }

    stage('test') {
      ansiColor('xterm') {
        sh 'npm run lint'
        try {
          sh 'npm test'
        } catch (err) {
          error "Test failed: $err"
        } finally {
          // publish test reports
          junit 'reports/junit.xml'
          publishHTML([
            allowMissing: false,
            alwaysLinkToLastBuild: false,
            keepAll: false,
            reportDir: 'reports/test-report',
            reportFiles: 'index.html',
            reportName: 'Test Result HTML Report',
            reportTitles: ''
          ])
          cobertura coberturaReportFile: 'reports/cobertura-coverage.xml',
            sourceEncoding: 'ASCII',
            autoUpdateHealth: false,
            autoUpdateStability: false,
            onlyStable: false,
            failUnhealthy: false,
            failUnstable: false,
            zoomCoverageChart: false,
            conditionalCoverageTargets: '70, 0, 0',
            lineCoverageTargets: '80, 0, 0',
            methodCoverageTargets: '80, 0, 0',
            maxNumberOfBuilds: 0
          publishHTML([
            allowMissing: false,
            alwaysLinkToLastBuild: false,
            keepAll: false,
            reportDir: 'reports/lcov-report',
            reportFiles: 'index.html',
            reportName: 'Coverage HTML Report',
            reportTitles: ''
          ])
        }
      }
    }

    stage('SonarQube analysis') {
      def scannerHome = tool 'sonar-scanner-3.2.0';
      withSonarQubeEnv('sonar-default-server') {
        sh "${scannerHome}/bin/sonar-scanner"
      }

      // FIXME: check sonarqube status
      // timeout(time: 1, unit: 'HOURS') {
      //   def qg = waitForQualityGate()
      //   if (qg.status != 'OK') {
      //     error "Pipeline aborted due to quality gate failure: ${qg.status}"
      //   }
      // }
    }

    stage('publish') {
      // ===== publishing to jfrog npm registry ==============================
      // artifactory is pre-defined in Jenkins management
      def server = Artifactory.server params.ARTIFACTORY_SERVER
      def npmRegistry = sh(script: "node -e \"console.log(require('./package.json').publishConfig.registry)\"", returnStdout: true).trim()
      if (!npmRegistry || !npmRegistry.startsWith('http')) {
        error 'npm registry is not defined, or cannot be retrieved'
      }
      // login to private npm registry
      def npmUser = npmLogin(npmRegistry, params.NPM_CREDENTIALS_ID, params.NPM_USER_EMAIL)

      // if git status is not clean, npm version will fail
      sh "git config --global user.email \"${params.GITHUB_USER_EMAIL}\""
      sh "git config --global user.name \"${params.GITHUB_USER_NAME}\""

      if (!allowReleasing) { // publish snapshot
        // show current git status for troubleshooting purpose
        sh "git status"

        def buildIdentifier = getBuildIdentifier('%Y%m%d-%H%M%S', 'master', false)
        def newVersion = "${packageVersion}-snapshot.${buildIdentifier}"
        echo "ready to publish snapshot version v${newVersion}..."
        sh "npm version ${newVersion}"
        // publish
        sh 'npm publish --tag snapshot --force'
      } else {
        echo "ready to release v${packageVersion}"
        // publish
        sh 'npm publish'

        def commitHash = sh(script: 'git rev-parse --verify HEAD', returnStdout: true).trim()
        // tag branch
        tagGithubRepository(
          repositoryName,
          commitHash,
          "v${packageVersion}",
          params.GITHUB_CREDENTIALS
        )
        // bump version
        npmVersion(
          repositoryName,
          env.BRANCH_NAME,
          params.NPM_RELEASE.toLowerCase(),
          params.GITHUB_CREDENTIALS
        )
      }
    }

    stage('done') {
      // send out notification
      emailext body: "Job \"${env.JOB_NAME}\" build #${env.BUILD_NUMBER} success.\n\nCheck detail: ${env.BUILD_URL}" ,
          subject: "[Jenkins] Job \"${env.JOB_NAME}\" build #${env.BUILD_NUMBER} success",
          recipientProviders: [
            [$class: 'RequesterRecipientProvider'],
            [$class: 'CulpritsRecipientProvider'],
            [$class: 'DevelopersRecipientProvider'],
            [$class: 'UpstreamComitterRecipientProvider']
          ]
    }

  } catch (err) {
    currentBuild.result = 'FAILURE'

    // catch all failures to send out notification
    emailext body: "Job \"${env.JOB_NAME}\" build #${env.BUILD_NUMBER} failed.\n\nError: ${err}\n\nCheck detail: ${env.BUILD_URL}" ,
        subject: "[Jenkins] Job \"${env.JOB_NAME}\" build #${env.BUILD_NUMBER} failed",
        recipientProviders: [
          [$class: 'RequesterRecipientProvider'],
          [$class: 'CulpritsRecipientProvider'],
          [$class: 'DevelopersRecipientProvider'],
          [$class: 'UpstreamComitterRecipientProvider']
        ]

    throw err
  }
}
