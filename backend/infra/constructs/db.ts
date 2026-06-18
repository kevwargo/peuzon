import { RemovalPolicy } from "aws-cdk-lib";
import { AttributeType, BillingMode, Table, TableProps } from "aws-cdk-lib/aws-dynamodb";
import { Construct } from "constructs";

export class Db extends Construct {
  public readonly devices: Table;
  public readonly locations: Table;
  public readonly sessions: Table;
  public readonly apiKeys: Table;

  constructor(scope: Construct) {
    super(scope, "Db");

    this.devices = this.createTable("Devices", {
      partitionKey: {
        name: "id",
        type: AttributeType.STRING,
      },
    });

    this.locations = this.createTable("Locations", {
      partitionKey: {
        name: "deviceId",
        type: AttributeType.STRING,
      },
      sortKey: {
        name: "timestamp",
        type: AttributeType.STRING,
      },
    });
    this.locations.addGlobalSecondaryIndex({
      indexName: "session",
      partitionKey: {
        name: "deviceId",
        type: AttributeType.STRING,
      },
      sortKey: {
        name: "sessionId",
        type: AttributeType.STRING,
      },
    });

    this.sessions = this.createTable("Sessions", {
      partitionKey: {
        name: "deviceId",
        type: AttributeType.STRING,
      },
      sortKey: {
        name: "id",
        type: AttributeType.STRING,
      },
    });
    this.sessions.addGlobalSecondaryIndex({
      indexName: "startTime",
      partitionKey: {
        name: "deviceId",
        type: AttributeType.STRING,
      },
      sortKey: {
        name: "startTime",
        type: AttributeType.STRING,
      },
    });

    this.apiKeys = this.createTable("ApiKeys", {
      partitionKey: {
        name: "hash",
        type: AttributeType.STRING,
      },
    });
  }

  private createTable(name: string, props: TableProps) {
    return new Table(this, name, {
      billingMode: BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
      ...props,
    });
  }
}
