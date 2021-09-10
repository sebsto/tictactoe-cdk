#!/bin/zsh 

CDK_OUTPUT_FILE=../out.json 

if [ ! -f $CDK_OUTPUT_FILE ]; then
    echo "Can not find CDK output files with the ARN of the resources it created"
    echo "Be sure to deploy the CDK stack using 'cdk deploy --all --outputs-file out.json'"
    exit -1
fi

REGION=us-west-2
STACK_NAME=Route53ARC-RoutingControl
aws --region $REGION cloudformation create-stack               \
    --template-body file://../cloudformation/Route53-ARC-routing-control.yaml  \
    --stack-name $STACK_NAME                                   \
