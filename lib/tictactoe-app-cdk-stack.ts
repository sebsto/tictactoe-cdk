import cdk = require('@aws-cdk/core');
import dynamodb = require('@aws-cdk/aws-dynamodb');
import ec2 = require('@aws-cdk/aws-ec2');
import autoscaling = require('@aws-cdk/aws-autoscaling');
import cloudwatch = require('@aws-cdk/aws-cloudwatch');
import elbv2 = require('@aws-cdk/aws-elasticloadbalancingv2');
import iam = require('@aws-cdk/aws-iam');
import synthetics = require('@aws-cdk/aws-synthetics');
import * as path from 'path';

export interface ASGProps extends cdk.StackProps {
  table: dynamodb.Table
}

export class TictactoeAppCdkStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: ASGProps) {
    super(scope, id, props);

    /********************************************
     * Create the network
     ********************************************/

    // the network for our app 
    const vpc = new ec2.Vpc(this, 'TicTacToeVPC', {
      natGateways: 1, //default value but better to make it explicit
      maxAzs: 2,
      cidr: '10.0.0.0/16',
      subnetConfiguration: [{
        subnetType: ec2.SubnetType.PUBLIC,
        name: 'load balancer',
        cidrMask: 24,
      }, {
        subnetType: ec2.SubnetType.PRIVATE,
        name: 'application',
        cidrMask: 24
      }]
    });

    /********************************************
     * Create the auto scaling group with EC2 
     * instances to deploy our app
     ********************************************/


    //
    // define the IAM role that will allow the application EC2 instance to access our DynamoDB Table 
    //
    const dynamoDBRole = new iam.Role(this, 'TicTacToeRole', {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com')
    });
    // allow the role to read / write on the table
    props?.table.grantFullAccess(dynamoDBRole);

    //
    // define a user data script to install & launch a web server on the application instance
    //
    const installAppUserdata = ec2.UserData.forLinux();
    installAppUserdata.addCommands(
      'yum install git -y',
      'git clone https://github.com/sebsto/tictactoe-dynamodb',

      'curl -O https://bootstrap.pypa.io/get-pip.py',
      'python3 get-pip.py',

      'cd tictactoe-dynamodb/',
      '/usr/local/bin/pip install -r requirements.txt',

      'USE_EC2_INSTANCE_METADATA=true python3 application.py --serverPort 8080'
    );

    const asg = new autoscaling.AutoScalingGroup(this, 'TicTacToeASG', {
      vpc,
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.BURSTABLE4_GRAVITON, ec2.InstanceSize.MICRO),

      // get the latest Amazon Linux 2 image for ARM64 CPU
      machineImage: new ec2.AmazonLinuxImage({
        cpuType: ec2.AmazonLinuxCpuType.ARM_64,
        generation: ec2.AmazonLinuxGeneration.AMAZON_LINUX_2 }
      ), 

      // role granting permission to read / write to DynamoDB table 
      role: dynamoDBRole,

      // script to automatically install the app at boot time 
      userData: installAppUserdata,

      // for high availability 
      minCapacity: 2,

      // we trust the health check from the load balancer
      healthCheck: autoscaling.HealthCheck.elb( {
        grace: cdk.Duration.seconds(30)
      } )
    });

    // Create an IAM permission to allow the instances to connect to SSM 
    // just in case I need to debug the user data script  
    const policy = {
      Action: [
        "ssmmessages:*",
        "ssm:UpdateInstanceInformation",
        "ec2messages:*"
      ],
      Resource: "*",
      Effect: "Allow"
    }

    asg.addToRolePolicy(iam.PolicyStatement.fromJson(policy));
 

    /********************************************
     * Create the load balancer
     ********************************************/

    // Create the load balancer in our VPC. 'internetFacing' is 'false'
    // by default, which creates an internal load balancer.
    const lb = new elbv2.ApplicationLoadBalancer(this, 'TicTacToeLB', {
      vpc,
      internetFacing: true
    });

    // Add a listener and open up the load balancer's security group
    // to the world.
    const listener = lb.addListener('TicTacToeListener', {
      port: 80,

      // 'open: true' is the default, you can leave it out if you want. Set it
      // to 'false' and use `listener.connections` if you want to be selective
      // about who can access the load balancer.
      open: true,
    });

    // Add the auto scaling group as a load balancing
    // target to the listener.
    listener.addTargets('TicTacToeFleet', {
      port: 8080,
      stickinessCookieDuration: cdk.Duration.hours(1),
      targets: [asg]
    });    

    // Add CloudWatch Synthetics Canary
    const canary = new synthetics.Canary(this, 'TicTacToeCanary', {
      schedule: synthetics.Schedule.rate(cdk.Duration.minutes(1)),
      test: synthetics.Test.custom({
        code: synthetics.Code.fromAsset(path.join(__dirname, 'canary')),
        handler: 'canary.handler',
      }),
      runtime: synthetics.Runtime.SYNTHETICS_NODEJS_PUPPETEER_3_1,
      environmentVariables: {
          ENDPOINT: lb.loadBalancerDnsName
      },
    });
    const canarySuccessPercent = canary.metricSuccessPercent({
      period: cdk.Duration.minutes(5),
    });
    const canary_alarm = new cloudwatch.Alarm(this, 'TicTacToeCanaryAlarm', {
      metric: canarySuccessPercent,
      evaluationPeriods: 1,
      threshold: 95,
      comparisonOperator: cloudwatch.ComparisonOperator.LESS_THAN_THRESHOLD,
    });

    // output for user to track alarm
    new cdk.CfnOutput(this, "CanaryAlarmName", { value: canary_alarm.alarmName })
    new cdk.CfnOutput(this, "CanaryID", { value: canary.canaryId })

    // output the Load Balancer DNS Name for easy retrieval
    new cdk.CfnOutput(this, 'LoadBalancerDNSName', { value: lb.loadBalancerDnsName });

    // output for easy integration with other AWS services 
    new cdk.CfnOutput(this, 'ARNLoadBalancer', { value: lb.loadBalancerArn });
    new cdk.CfnOutput(this, 'HostedZoneLoadBalancer', { value: lb.loadBalancerCanonicalHostedZoneId });
    new cdk.CfnOutput(this, 'ARNAutoScalingGroup', { value: asg.autoScalingGroupArn });
  }
}
