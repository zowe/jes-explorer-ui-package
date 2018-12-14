#!/bin/bash -e

################################################################################
# This program and the accompanying materials are made available under the terms of the
# Eclipse Public License v2.0 which accompanies this distribution, and is available at
# https://www.eclipse.org/legal/epl-v20.html
#
# SPDX-License-Identifier: EPL-2.0
#
# Copyright IBM Corporation 2018
################################################################################

################################################################################
# Post Installation
# 
# - move explorer-* to web folder
################################################################################

# prepare public folder
mkdir -p public

# copy explorer-jes
rm -fr public/jobs && mkdir -p public/jobs
cp -r ./node_modules/explorer-jes/dist/. public/jobs
