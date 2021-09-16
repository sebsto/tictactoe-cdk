import cdk = require('@aws-cdk/core');
import dynamodb = require('@aws-cdk/aws-dynamodb');

export interface DynamoDBProps extends cdk.StackProps {
  replicationRegions: string[]
}

export class TictactoeDatabaseCdkStack extends cdk.Stack {

  // this is class level because it is shared with the app stack
  public table : dynamodb.Table

  constructor(scope: cdk.App, id: string, props: DynamoDBProps) {
    super(scope, id, props);

    this.table = new dynamodb.Table(this, 'Table', {
      partitionKey: { name: 'GameId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      replicationRegions: props.replicationRegions,
      tableName: "Games"
    });

    // add secondary indexes
    this.table.addGlobalSecondaryIndex({
      indexName: 'HostId-StatusDate-index',
      partitionKey: { name: 'HostId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'StatusDate', type: dynamodb.AttributeType.STRING }
    });
    this.table.addGlobalSecondaryIndex({
      indexName: 'OpponentId-StatusDate-index',
      partitionKey: { name: 'OpponentId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'StatusDate', type: dynamodb.AttributeType.STRING }
    });

    // output for easy integration with other AWS services 
    new cdk.CfnOutput(this, 'ARNDatabaseTable', { value: this.table.tableArn });
    
  }
}
