import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { aws_dynamodb as dynamodb } from 'aws-cdk-lib';

export interface DynamoDBProps extends StackProps {
  replicationRegions: string[]
}

export class TictactoeDatabaseCdkStack extends Stack {

  public table : dynamodb.Table

  constructor(scope: Construct, id: string, props: DynamoDBProps) {
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

  }
}
