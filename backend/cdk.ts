import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";

import * as apigwv2 from "aws-cdk-lib/aws-apigatewayv2";
import * as apigwv2Int from "aws-cdk-lib/aws-apigatewayv2-integrations";

import * as lambda from "aws-cdk-lib/aws-lambda";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as s3 from "aws-cdk-lib/aws-s3";

export class PeuzonStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const sessionsTable = new dynamodb.Table(this, "Sessions", {
      partitionKey: {
        name: "sessionId",
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const bucket = new s3.Bucket(this, "Peuzon");

    const restApi = new apigwv2.HttpApi(this, "RestApi");

    const connectHandler = new lambda.Function(this, "ConnectHandler", {
      runtime: lambda.Runtime.PYTHON_3_14,
      handler: "handler.handler",
      code: lambda.Code.fromAsset("lambda/connect"),
      environment: {
        SESSIONS_TABLE: sessionsTable.tableName,
        BUCKET_NAME: bucket.bucketName,
      },
    });

    const disconnectHandler = new lambda.Function(this, "DisconnectHandler", {
      runtime: lambda.Runtime.PYTHON_3_14,
      handler: "handler.handler",
      code: lambda.Code.fromAsset("lambda/disconnect"),
      environment: {
        SESSIONS_TABLE: sessionsTable.tableName,
        BUCKET_NAME: bucket.bucketName,
      },
    });

    const defaultHandler = new lambda.Function(this, "DefaultHandler", {
      runtime: lambda.Runtime.PYTHON_3_14,
      handler: "handler.handler",
      code: lambda.Code.fromAsset("lambda/default"),
      environment: {
        SESSIONS_TABLE: sessionsTable.tableName,
        BUCKET_NAME: bucket.bucketName,
      },
    });

    const wsApi = new apigwv2.WebSocketApi(this, "WebSocketApi", {
      connectRouteOptions: {
        integration: new apigwv2Int.WebSocketLambdaIntegration(
          "ConnectIntegration",
          connectHandler,
        ),
      },
      disconnectRouteOptions: {
        integration: new apigwv2Int.WebSocketLambdaIntegration(
          "DisconnectIntegration",
          disconnectHandler,
        ),
      },
      defaultRouteOptions: {
        integration: new apigwv2Int.WebSocketLambdaIntegration(
          "DefaultIntegration",
          defaultHandler,
        ),
      },
    });

    const wsStage = new apigwv2.WebSocketStage(this, "WsStage", {
      webSocketApi: wsApi,
      stageName: "prod",
      autoDeploy: true,
    });

    new cdk.CfnOutput(this, "RestApiUrl", {
      value: restApi.apiEndpoint,
    });

    new cdk.CfnOutput(this, "WebSocketUrl", {
      value: wsStage.url,
    });

    new cdk.CfnOutput(this, "SessionsTableName", {
      value: sessionsTable.tableName,
    });

    new cdk.CfnOutput(this, "BucketName", {
      value: bucket.bucketName,
    });
  }
}

const app = new cdk.App();

new PeuzonStack(app, "PeuzonStack", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});
