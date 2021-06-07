# Welcome to your CDK TypeScript project!

This is an AWS CDK script for a multi-region deployment of the [TicTacToe game demo](https://github.com/sebsto/tictactoe-dynamodb).

This scripts is made of two stacks : 
- the database stack manages a DynamoDB Table, globally replicated across `us-east-1` and `us-west-2`.
- the application stacks manages an autoscaling group with minimum two `t4g.micro` instances and an Application Load Balancer.

The application stack is created both in `us-east-1` and `us-west-2` regions.

## Pre-requisites

The very first time, be sure to run 

```zsh 
cdk bootstrap
```

Be sure to have a CLI config with admin permission and using `us-east-1` as default region

## Deployment 

To deploy the stack across the two regions, just type :

```zsh 
cdk deploy --all
```

The `cdk.json` file tells the CDK Toolkit how to execute your app.

## Useful commands

 * `npm run build`   compile typescript to js
 * `npm run watch`   watch for changes and compile
 * `npm run test`    perform the jest unit tests
 * `cdk deploy`      deploy this stack to your default AWS account/region
 * `cdk diff`        compare deployed stack with current state
 * `cdk synth`       emits the synthesized CloudFormation template
