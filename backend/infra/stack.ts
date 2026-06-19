import { CfnOutput, Stack, StackProps } from "aws-cdk-lib";
import { AnyPrincipal, PolicyStatement } from "aws-cdk-lib/aws-iam";
import { BlockPublicAccess, Bucket } from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";
import { Db } from "./constructs/db";
import { RestApi } from "./constructs/rest-api";
import { WsApi } from "./constructs/ws-api";

export class PeuzonStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const { devices, locations, sessions, apiKeys } = new Db(this);

    const ws = new WsApi(this, { devices, locations, sessions });

    const rest = new RestApi(this, {
      devices,
      locations,
      sessions,
      apiKeys,
      wsApi: ws.api,
    });

    const bucket = new Bucket(this, "Peuzon", {
      blockPublicAccess: new BlockPublicAccess({
        blockPublicAcls: false,
        blockPublicPolicy: false,
        ignorePublicAcls: false,
        restrictPublicBuckets: false,
      }),
    });
    bucket.addToResourcePolicy(
      new PolicyStatement({
        principals: [new AnyPrincipal()],
        actions: ["s3:GetObject"],
        resources: [bucket.arnForObjects("*")],
      }),
    );

    Object.entries({
      RestApiUrl: rest.api.apiEndpoint,
      WebSocketUrl: ws.stage.url,
      LocationsTableName: locations.tableName,
      ApiKeysTableName: apiKeys.tableName,
      BucketName: bucket.bucketName,
      WebsiteUrl: `https://${bucket.bucketRegionalDomainName}/index.html`,
    }).forEach(([key, value]) => {
      new CfnOutput(this, key, { value });
    });
  }
}
