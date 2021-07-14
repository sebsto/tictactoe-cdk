#!/bin/zsh 

check_dependencies()

CDK_OUTPUT_FILE=../out.json 

if ! [ -f ./out.json ];
then
    echo "Can not find CDK output files with the ARN of the resources it created"
    echo "Be sure to deploy the CDK stack using 'cdk deploy --all --outputs-file out.json'"
    exit -1
fi

REGION=us-west-2
STACK_NAME=Route53ARC-ReadinessCheck
LOAD_BALANCER_1_ARN=$(cat $CDK_OUTPUT_FILE| jq .\"TictactoeAppCdkStack-us-east-1\".ARNLoadBalancer -r)
LOAD_BALANCER_1_ARN=$(cat $CDK_OUTPUT_FILE| jq .\"TictactoeAppCdkStack-us-west-2\".ARNLoadBalancer -r)
AUTO_SCALINGGROUP_1_ARN=$(cat $CDK_OUTPUT_FILE| jq .\"TictactoeAppCdkStack-us-east-1\".ARNAutoScalingGroup -r)
AUTO_SCALINGGROUP_2_ARN=$(cat $CDK_OUTPUT_FILE| jq .\"TictactoeAppCdkStack-us-west-2\".ARNAutoScalingGroup -r)
DYNAMODB_TABLE_ARN=$(cat $CDK_OUTPUT_FILE | jq .TictactoeDatabaseCdkStack.ARNLoadBalancer -r)
aws --region $REGION cloudformation create-stack               \
    --template-body file://./Route53-ARC-readiness-check.yaml  \
    --stack-name $STACK_NAME                                   \
    --parameters ParameterKey=Region1,ParameterValue=us-east-1 \
                 ParameterKey=Region2,ParameterValue=us-west-2 \
                 ParameterKey=LoadBalancer1,ParameterValue=$LOAD_BALANCER_1_ARN         \
                 ParameterKey=LoadBalancer2,ParameterValue=$LOAD_BALANCER_2_ARN         \
                 ParameterKey=AutoScalingGroup1,ParameterValue=$AUTO_SCALINGGROUP_1_ARN \
                 ParameterKey=AutoScalingGroup2,ParameterValue=$AUTO_SCALINGGROUP_2_ARN \
                 ParameterKey=DynamoDBTable,ParameterValue=$DYNAMODB_TABLE_ARN          \

function check_dependencies() {
    # check dependency on jq
    which jq > /dev/null
    if [ $? != 0 ];
    then
        echo 'jq must be installed.\nOn Mac, type "brew install jq".\nOtherwise check https://stedolan.github.io/jq/download/'
        exit -1
    fi    
}