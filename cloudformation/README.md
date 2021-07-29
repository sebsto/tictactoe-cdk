# Amazon Route 53 Application Recovery Controller Cloudformation templates

Here are three sample templates to configure [Amazon Route 53 Application Recovery Controller](https://docs.aws.amazon.com/r53recovery/latest/dg/what-is-route53-recovery.html) automatically from CloudFormation.

The three templates are specific to [the TicTacToe dmeo application](https://github.com/sebsto/tictactoe-dynamodb) deployed with [a CDK script also available in this repository](https://github.com/sebsto/tictactoe-cdk).

- The [first template configures readiness check](https://github.com/sebsto/tictactoe-cdk/blob/main/cloudformation/Route53-ARC-readiness-check.yaml)
- The second template configures routing controller and health checks
- The third template creates Route53 DNS failover records, based on the health checks.

The DNS cloudformation template depends on the Routing Controller one.  Readiness Check and Routing Controller are independant of each other.  This means it is required to create stack 1 (readiness check) and 2 (routing controller) first, then template 3 (DNS records)

## Pre-requisites

Before deploying these templates, deploy the TicTacToe demo application using [the supplied CDK script](https://github.com/sebsto/tictactoe-cdk).

```zsh 
# Install CDK 2 if not done already 
npm install -g aws-cdk@next

# Clone this repository if not done already 
git clone https://github.com/sebsto/tictactoe-cdk.git
cd tictactoe-cdk

# the very first time (one time operation)
cdk bootstrap 

# deploy the app 
cdk deploy --all --outputs-file out.json
```

## Readiness Check template

The readiness check template is specific to [the TicTacToe application](https://github.com/sebsto/tictactoe-dynamodb) deployed with [a CDK script also available in this repository](https://github.com/sebsto/tictactoe-cdk).

The TicaTacToe CDK deployment script generates a file (`out.json`) that contains the ARN of resources having been created : Load Balancers, Auto Scaling Groups, and DynamoDB Table.

### Parameters

This templates relies on the following parameters:

- The AWS Regions where the resources are located 
- The demo application Load Balancers ARNs
- The demo application Auto Scaling Group ARNs
- The demo application DynamoDB Table ARN

To help to consume these values and to feed them as input, [I provide a shell script](https://github.com/sebsto/tictactoe-cdk/blob/main/cloudformation/Route53-create-readiness-check.sh) that reads `out.json`and feed appropriate values to the cloud formation template.

### Resources 

This template creates the following resources:
- Two Cells, one in each Region 
- One Recovery Group for the whole application 
- Three Resource Sets (Load Balancer, Auto Scaling group, and DynamoDB Table)
- Three readiness checks, one for each resource set

### Deployment

To deploy the readiness check template, open a terminal and type:

```zsh
# assuming you're in the main directory of this project
cd cloudformation

./Route53-create-readiness-check.sh
```

Alternatively, if you want to invoke Cloudformation using the AWS CLI, you can issue a command similar to 

```zsh 
aws --region $REGION cloudformation create-stack                                        \
    --template-body file://./Route53-ARC-readiness-check.yaml                           \
    --stack-name $STACK_NAME                                                            \
    --parameters ParameterKey=Region1,ParameterValue=us-east-1                          \
                 ParameterKey=Region2,ParameterValue=us-west-2                          \
                 ParameterKey=LoadBalancer1,ParameterValue=$LOAD_BALANCER_1_ARN         \
                 ParameterKey=LoadBalancer2,ParameterValue=$LOAD_BALANCER_2_ARN         \
                 ParameterKey=AutoScalingGroup1,ParameterValue=$AUTO_SCALINGGROUP_1_ARN \
                 ParameterKey=AutoScalingGroup2,ParameterValue=$AUTO_SCALINGGROUP_2_ARN \
                 ParameterKey=DynamoDBTable,ParameterValue=$DYNAMODB_TABLE_ARN          \
```

### Routing Control template

The routing Control template creates the Application Recovery Controller cluster and the required routing control infrastructure.

### Parameters 

This template accepts the following parameters

- The two AWS Regions to create the Cells

### Resources

The Routing Control templates creates the following resources :

- an Application Recovery Controller cluster,
- an Application Recovery Controller control panel,
- two Application Recovery Controller cells in `us-east-1`and `us-west-1`,
- two Application Recovery Controller health checks,
- one Safety Rule to ensure at least one cell is active at all time.

For terminology, refer to [the Amazon Route 53 Application Recovery Controller documentation](https://docs.aws.amazon.com/r53recovery/latest/dg/introduction-components.html).

It is independant of the readiness check template described earlier, you can deploy the two stacks in parallel.

### Deployment

To deploy the Routing Control template, open a terminal and type:

```zsh
# assuming you're in the main directory of this project
cd cloudformation

./Route53-create-routing-control.sh
```

Alternatively, if you want to invoke Cloudformation using the AWS CLI, you can issue a command similar to

```zsh
aws --region $REGION cloudformation create-stack               \
    --template-body file://./Route53-ARC-routing-control.yaml  \
    --stack-name $STACK_NAME
```

## DNS Records template 

After the Routing Control template is deployed, the DNS records template can be used to configure Route 53 DNS records.

### Parameters 

This templates relies on the following parameters:

- the TicTacToe demo application load balancer DNS names and Hosted Zone Ids. These are provided as output by [the application CDK script](https://github.com/sebsto/tictactoe-cdk) in the file `out.json`
- The healt check ids created when deploying the Routing Control template. These are provided as output of the cloudformation stack.
- a Route53 hosted zone Id, this is the domain name where you want to create teh DNS records. For this demo, I hard-coded my DNS domain `seb.go-aws.com`

To help to consume these values and to feed them as input, [I provide a shell script](https://github.com/sebsto/tictactoe-cdk/blob/main/cloudformation/Route53-create-dns-records.sh) that reads `out.json` and feed appropriate values to the cloud formation template.

**WARNING**  
> **IT IS MANDATORY TO ADJUST THE DNS DOMAIN NAME AND DNS ZONE ID BEFORE TO DEPLOY THIS TEMPLATE**
>
> The two values on [line 6](https://github.com/sebsto/tictactoe-cdk/blob/main/cloudformation/Route53-create-dns-records.sh#L6) and [line 7](https://github.com/sebsto/tictactoe-cdk/blob/main/cloudformation/Route53-create-dns-records.sh#L7) have to be modified to fit your environment.

### Resources

This template creates the following resources:

- a A ALIAS **PRIMARY** failover record pointing to the TicTacToe demo application load balancer deployed in `us-east-1`
- a A ALIAS **SECONDARY** failover record pointing to the TicTacToe demo application load balancer deployed in `us-west-2`

Both records are associated with the corresponding health check created by the Routing Control template.

**To use this template, you need to have a Hosted Zone on Route 53.**

### Deployment

To deploy the Routing Control template, open a terminal and type:

```zsh
# assuming you're in the main directory of this project
cd cloudformation

./Route53-create-dns-records.sh
```

Alternatively, if you want to invoke Cloudformation using the AWS CLI, you can issue a command similar to

```
aws --region $REGION cloudformation create-stack                                                       \
    --template-body file://./Route53-DNS-records.yaml                                                  \
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
## Question or Feedback ?

Send your questions or feedback to stormacq@amazon.com
