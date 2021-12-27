# CloudFormation templates for Amazon Route 53 Application Recovery Controller (ARC)

## Overview
These three sample CloudFormation templates show you how to configure [Amazon Route 53 Application Recovery Controller](https://docs.aws.amazon.com/r53recovery/latest/dg/what-is-route53-recovery.html) automatically. 

The three templates are specific to [the TicTacToe demo application](http://r53-recovery-controller-demo-app-iad.s3-website-us-east-1.amazonaws.com/tictactoe-app.zip) deployed with [a CDK script](http://r53-application-recovery-controller-cfn-app-iad.s3-website-us-east-1.amazonaws.com/tictactoe-infra-cdk-arc-cfn-templates.zip). For more information about AWS Cloud Development Kit, go to the [AWS CDK documentation](https://aws.amazon.com/cdk/).

- The [first template configures readiness checks](#readiness-check-template). Readiness checks ensure that your recovery environment is scaled and configured to take over when needed.
- The [second template configures routing controls and health checks](#routing-control-template). You use routing controls to rebalance traffic across application replicas during failures.
- The [third template creates Route 53 DNS failover records](#dns-failover-records-template). DNS failover records on health checks enable you to reroute traffic by using routing controls. (This template must be run after the first two.)

## Prerequisites

Before you deploy the CloudFormation templates, download and deploy the TicTacToe demo application by using the supplied CDK application.

The three CloudFormation templates are located in the `cloudformation` folder of the project.

_Please make sure to install AWS CDK v2. The CDK scripts won't work with AWS CDK v1._

```zsh 
# Install CDK 2, if you haven't already done so 
npm install -g aws-cdk@next

# Download the CDK script that allows to deploy the app
wget http://r53-application-recovery-controller-cfn-app-iad.s3-website-us-east-1.amazonaws.com/tictactoe-infra-cdk-arc-cfn-templates.zip
unzip tictactoe-infra-cdk-arc-cfn-templates.zip
cd tictactoe-cdk

pushd app

# first time only (one time operation)
npm install && cdk bootstrap 

# deploy the app 
cdk deploy --all --outputs-file ../out.json

popd
```
The application deployment takes ~10 minutes to complete. The database stack creation might take up to 10 minutes. You will be prompted 3 times for confirmation (y/n?), always answer `y`. Three CloudFormation stacks are created :

- `TictactoeAppCdkStack-us-east-1` : the application stack deployed in `us-east-1`region
- `TictactoeAppCdkStack-us-west-2` : the application stack deployed in `us-west-2`region
- `TictactoeDatabaseCdkStack` : the database stack, deployed in `us-west-2`and shared by the two application stacks.

Now that the application is deployed, you are ready to depploy the Route 53 Application Recovery Controler (ARC) CloudFormation templates.

## CloudFormation input variables

The CloudFormation templates expect the following parameters:

* **AWS Regions**: Regions where the TicTacToe AWS resources are deployed: `us-east-1` and `us-west-2` 
* **DNS hosted zone**: Update line 7 of the 'scripts/Route53-create-dns-records.sh' script with a value that corresponds to your AWS environment
* **DNS domain name**: Update line 6 of the 'scripts/Route53-create-dns-records.sh' script with a value that corresponds to your AWS environment

If you don't have your own DNS domain hosted on Route53, you can still deploy the HealthCheck and Routing Control templates, but not the DNS failover healthcheck records template.

## Readiness check template

The CloudFormation readiness check template is specific to [the TicTacToe demo application](http://r53-recovery-controller-demo-app-iad.s3-website-us-east-1.amazonaws.com/tictactoe-app.zip) deployed with [a CDK script](http://r53-application-recovery-controller-cfn-app-iad.s3-website-us-east-1.amazonaws.com/tictactoe-infra-cdk-arc-cfn-templates.zip).

The TicTacToe CDK deployment script generates a file (`out.json`) that contains the ARNs of resources that are required as input parameters for the template.

### Parameters

This template takes the following parameters:

- The AWS Regions where the resources are located 
- The demo application load balancers ARNs
- The demo application Auto Scaling group ARNs
- The demo application DynamoDB table ARN

To read the parameters and provide them as input to the template, I provide a shell script `scripts/Route53-create-readiness-check.sh`. It reads `out.json` and provides the appropriate values to the CloudFormation readiness check template.

The script deploys the stack in `us-west-2`region by default. You can change this by editing line 19 (`REGION=us-west-2`)

### Resources 

This template creates the following resources:

- 2 cells, one for each AWS Region 
- 1 recovery group, for the whole application 
- 3 resource sets, one each for the load balancers, Auto Scaling groups, and DynamoDB table
- 3 readiness checks, one for each resource set

### Deployment

To deploy the readiness check template, open a terminal and type the following:

```zsh
# assuming you're in the main directory of this project
cd scripts

./Route53-create-readiness-check.sh
```

Alternatively, to invoke CloudFormation by using the AWS CLI, issue a command similar to the following: 

```zsh 
REGION=us-west-2
STACK_NAME=Route53ARC-ReadinessCheck

aws --region $REGION cloudformation create-stack                                        \
    --template-body file://./cloudformation/Route53-ARC-readiness-check.yaml                           \
    --stack-name $STACK_NAME                                                            \
    --parameters ParameterKey=Region1,ParameterValue=us-east-1                          \
                 ParameterKey=Region2,ParameterValue=us-west-2                          \
                 ParameterKey=LoadBalancer1,ParameterValue=$LOAD_BALANCER_1_ARN         \
                 ParameterKey=LoadBalancer2,ParameterValue=$LOAD_BALANCER_2_ARN         \
                 ParameterKey=AutoScalingGroup1,ParameterValue=$AUTO_SCALINGGROUP_1_ARN \
                 ParameterKey=AutoScalingGroup2,ParameterValue=$AUTO_SCALINGGROUP_2_ARN \
                 ParameterKey=DynamoDBTable,ParameterValue=$DYNAMODB_TABLE_ARN          \
```

## Routing control template

The CloudFormation routing Control template creates the cluster in Application Recovery Controller and other required routing control infrastructure.

### Parameters 

This template takes the following parameters:

- The two AWS Regions for the application cells

### Resources

The template creates the following resources:

- 1 cluster
- 1 control panel
- 2 routing controls in `us-east-1`and `us-west-1`
- 1 safety rule, to ensure that at least one cell is active at all times
- 2 Route 53 routing control health checks

To learn about these resources and how they work, see [the Amazon Route 53 Application Recovery Controller documentation](https://docs.aws.amazon.com/r53recovery/latest/dg/introduction-components.html).

The routing control template is independent of the readiness check template described earlier, so you can deploy the two stacks in parallel if you like.

### Deployment

To deploy the routing control template, open a terminal and type the following:

```zsh
# assuming you're in the main directory of this project
cd scripts

./Route53-create-routing-controls.sh
```

Alternatively, if you want to invoke CloudFormation by using the AWS CLI, you can issue a command similar to the following:

```zsh
REGION=us-west-2
STACK_NAME=Route53ARC-RoutingControl

aws --region $REGION cloudformation create-stack               \
    --template-body file://./Route53-ARC-routing-control.yaml  \
    --stack-name $STACK_NAME
```

## DNS failover records template 

You can use the DNS records template to configure the following required Route 53 DNS failover records for the routing control health checks:

- An A ALIAS **PRIMARY** failover record: Points to the TicTacToe demo application load balancer deployed in `us-east-1`
- An A ALIAS **SECONDARY** failover record: Points to the TicTacToe demo application load balancer deployed in `us-west-2`

After you deplopy the template, the DNS records are associated with the corresponding routing control health checks that were created earlier. The failover records enable you to use the routing controls to failover traffic in Application Recovery Controller.

### Parameters 

This template uses the following parameters:

- The TicTacToe demo application load balancer DNS names and Hosted Zone Ids. These are provided as output by the application CDK script that you run earlier, in the file `out.json`.
- The health check ids tnat are created when you deploy the routing control template. The routing control CloudFormation stack returns these values as output.
- A Route 53 hosted zone ID. This is the domain name where you want to create the DNS records. For this demo, I hardcoded my DNS domain, `seb.go-aws.com` in the shell script, but you must use your own domain.

To read the parameters and provide them as input to the template, I provide a shell script `scripts/Route53-create-dns-records.sh`. It reads `out.json` and provides the appropriate values to the CloudFormation readiness check template.

**WARNING**  
> **YOU MUST CHANGE THE DNS DOMAIN NAME AND DNS HOSTED ZONE ID BEFORE YOU DEPLOY THIS TEMPLATE**
>
> As noted at the top of this README, update the following values to fit your environment:
>* **DNS hosted zone**: Update line 7 of the `scripts/Route53-create-dns-records.sh` script with a value that corresponds to your AWS environment
>* **DNS domain name**: Update line 6 of the `scripts/Route53-create-dns-records.sh` script with a value that corresponds to your AWS environment

### Deployment

To deploy the Routing Control template, open a terminal and type the following:

```zsh
# assuming you're in the main directory of this project
cd scripts

./Route53-create-dns-records.sh
```

Alternatively, if you want to invoke CloudFormation using the AWS CLI, you can issue a command similar to the following:

```
REGION=us-west-2
STACK_NAME=Route53-dns-records

ROUTE53_HEALTHCHECKID_CELL1=$(aws --region $REGION cloudformation describe-stacks --stack-name Route53ARC-RoutingControl --query "Stacks[].Outputs[?OutputKey=='HealthCheckIdEast'].OutputValue" --output text)
ROUTE53_HEALTHCHECKID_CELL2=$(aws --region $REGION cloudformation describe-stacks --stack-name Route53ARC-RoutingControl --query "Stacks[].Outputs[?OutputKey=='HealthCheckIdWest'].OutputValue" --output text)

aws --region $REGION CloudFormation create-stack                                                       \
    --template-body file://./cloudformation/Route53-DNS-records.yaml                                                  \
    --stack-name $STACK_NAME                                                                           \
    --parameters ParameterKey=LoadBalancerDNSNameEast,ParameterValue=$LOAD_BALANCER_1_DNS              \
                 ParameterKey=LoadBalancerDNSNameWest,ParameterValue=$LOAD_BALANCER_2_DNS              \
                 ParameterKey=LoadBalancerHostedZoneEast,ParameterValue=$LOAD_BALANCER_HOSTEDZONE_EAST \
                 ParameterKey=LoadBalancerHostedZoneWest,ParameterValue=$LOAD_BALANCER_HOSTEDZONE_WEST \
                 ParameterKey=DNSHostedZone,ParameterValue=$DNS_HOSTED_ZONE_ID                         \
                 ParameterKey=DNSDomainName,ParameterValue=$DNS_HOSTED_ZONE_NAME                       \
                 ParameterKey=DNSHealthcheckIdEast,ParameterValue=$ROUTE53_HEALTHCHECKID_CELL1         \
                 ParameterKey=DNSHealthcheckIdWest,ParameterValue=$ROUTE53_HEALTHCHECKID_CELL2 
```
## Question or feedback?

Send your questions or feedback to stormacq@amazon.com
