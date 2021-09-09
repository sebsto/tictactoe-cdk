#!/bin/bash

zip -r ../tictactoe-infra-cdk.zip . -x ".git/*" -x "node_modules/*" -x "cdk.out/*"
