import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";

import * as apigwv2 from "aws-cdk-lib/aws-apigatewayv2";
import * as apigwv2Int from "aws-cdk-lib/aws-apigatewayv2-integrations";
import * as apigwv2Auth from "aws-cdk-lib/aws-apigatewayv2-authorizers";

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

    const assetReqs = "/asset-output/requirements.txt";
    const layer = new lambda.LayerVersion(this, "depsLayer", {
      compatibleRuntimes: [lambda.Runtime.PYTHON_3_13],
      code: lambda.Code.fromAsset(`${__dirname}/src`, {
        bundling: {
          image: cdk.DockerImage.fromRegistry("ghcr.io/astral-sh/uv:python3.13-bookworm"),
          command: [
            "bash",
            "-c",
            [
              `uv export --locked --no-dev --format requirements.txt > ${assetReqs}`,
              `uv pip install --requirements ${assetReqs} --target /asset-output/python`,
            ].join(" && "),
          ],
          user: "1000:1000",
          environment: {
            UV_CACHE_DIR: "/uv-cache",
            UV_LINK_MODE: "copy",
          },
          volumes: [
            {
              hostPath: `${__dirname}/.uv-cache`,
              containerPath: "/uv-cache",
            },
          ],
        },
      }),
    });

    const wsAuth = this.createHandler("ws.auth", {
      environment: {
        SESSIONS_TABLE: sessionsTable.tableName,
      },
      layers: [layer],
    });
    const wsConnect = this.createHandler("ws.connect");
    const wsDisconnect = this.createHandler("ws.disconnect", {
      environment: {
        SESSIONS_TABLE: sessionsTable.tableName,
      },
      layers: [layer],
    });
    const wsDefault = this.createHandler("ws.default");

    sessionsTable.grantReadWriteData(wsAuth);
    sessionsTable.grantReadWriteData(wsDisconnect);

    const wsApi = new apigwv2.WebSocketApi(this, "WebSocketApi", {
      connectRouteOptions: {
        authorizer: new apigwv2Auth.WebSocketLambdaAuthorizer("wsAuth", wsAuth, {
          identitySource: ["route.request.querystring.s"],
        }),
        integration: new apigwv2Int.WebSocketLambdaIntegration("ConnectIntegration", wsConnect),
      },
      disconnectRouteOptions: {
        integration: new apigwv2Int.WebSocketLambdaIntegration(
          "DisconnectIntegration",
          wsDisconnect,
        ),
      },
      defaultRouteOptions: {
        integration: new apigwv2Int.WebSocketLambdaIntegration("DefaultIntegration", wsDefault),
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

  private createHandler(name: string, opts?: lambda.FunctionOptions) {
    return new lambda.Function(this, `${name}Handler`, {
      runtime: lambda.Runtime.PYTHON_3_13,
      code: lambda.Code.fromAsset(`${__dirname}/src`, {
        exclude: [".venv", ".flake8", "**/__pycache__/**", "**/*.pyc"],
        ignoreMode: cdk.IgnoreMode.GIT,
      }),
      handler: `peuzon.${name}.handler`,
      timeout: cdk.Duration.seconds(29),
      ...opts,
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
