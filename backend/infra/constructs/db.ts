import { RemovalPolicy } from "aws-cdk-lib";
import { AttributeType, BillingMode, Table } from "aws-cdk-lib/aws-dynamodb";
import { Construct } from "constructs";

export class Db extends Construct {
  public readonly devices: Table;
  public readonly sessions: Table;
  public readonly locations: Table;
  public readonly apiKeys: Table;

  constructor(scope: Construct) {
    super(scope, "Db");

    this.devices = this.createStringTable("Devices", "id");
    this.sessions = this.createStringTable("Sessions", "deviceId", {
      sortKey: "id",
      indexes: { startTime: ["deviceId", "startTime"] },
    });
    this.locations = this.createStringTable("Locations", "deviceId", {
      sortKey: "timestamp",
      indexes: { session: ["deviceId", "sessionId"] },
    });
    this.apiKeys = this.createStringTable("ApiKeys", "hash");
  }

  private createStringTable(name: string, partKey: string, props?: StringTableProps) {
    const table = new Table(this, name, {
      billingMode: BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
      partitionKey: {
        name: partKey,
        type: AttributeType.STRING,
      },
      ...(props?.sortKey ? { sortKey: { name: props.sortKey, type: AttributeType.STRING } } : {}),
    });

    Object.entries(props?.indexes ?? {}).forEach(([indexName, keys]) => {
      table.addGlobalSecondaryIndex({
        indexName,
        partitionKey: {
          name: keys[0],
          type: AttributeType.STRING,
        },
        ...(keys.length > 1 ? { sortKey: { name: keys[1], type: AttributeType.STRING } } : {}),
      });
    });

    return table;
  }
}

interface StringTableProps {
  sortKey?: string;
  indexes?: { [key: string]: string[] };
}
