import * as cdk from "aws-cdk-lib";
import * as subprocess from "child_process";
import { Construct } from "constructs";

import * as apigwv2 from "aws-cdk-lib/aws-apigatewayv2";
import * as apigwv2Auth from "aws-cdk-lib/aws-apigatewayv2-authorizers";
import * as apigwv2Int from "aws-cdk-lib/aws-apigatewayv2-integrations";

import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as lambdaEvents from "aws-cdk-lib/aws-lambda-event-sources";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as sqs from "aws-cdk-lib/aws-sqs";

export class PeuzonStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const sessionsTable = new dynamodb.Table(this, "Sessions", {
      partitionKey: {
        name: "id",
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
    const locationsTable = new dynamodb.Table(this, "Locations", {
      partitionKey: {
        name: "sessionId",
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: "timestamp",
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const bucket = new s3.Bucket(this, "Peuzon", {
      blockPublicAccess: new s3.BlockPublicAccess({
        blockPublicAcls: false,
        blockPublicPolicy: false,
        ignorePublicAcls: false,
        restrictPublicBuckets: false,
      }),
    });
    bucket.addToResourcePolicy(
      new iam.PolicyStatement({
        principals: [new iam.AnyPrincipal()],
        actions: ["s3:GetObject"],
        resources: [bucket.arnForObjects("*")],
      }),
    );

    const uvExportCmd = "uv export --locked --no-dev --format requirements.txt";
    const assetReqs = "/asset-output/requirements.txt";
    const depsLayer = new lambda.LayerVersion(this, "depsLayer", {
      compatibleRuntimes: [lambda.Runtime.PYTHON_3_13],
      code: lambda.Code.fromAsset(`${__dirname}/src`, {
        assetHash: subprocess.execSync(`${uvExportCmd} | md5sum`, {
          cwd: `${__dirname}/src`,
          encoding: "utf-8",
        }),
        bundling: {
          image: cdk.DockerImage.fromRegistry("ghcr.io/astral-sh/uv:python3.13-bookworm"),
          command: [
            "bash",
            "-c",
            [
              `${uvExportCmd} > ${assetReqs}`,
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

    const locationSenderQueue = new sqs.Queue(this, "LocationSender", {
      visibilityTimeout: cdk.Duration.minutes(15),
    });

    const createHandler = (name: string, opts?: FunctionOpts) => {
      const func = new lambda.Function(this, `${name}Handler`, {
        runtime: lambda.Runtime.PYTHON_3_13,
        code: lambda.Code.fromAsset(`${__dirname}/src`, {
          exclude: [".venv", ".flake8", "scripts", "**/__pycache__/**", "**/*.pyc"],
          ignoreMode: cdk.IgnoreMode.GIT,
        }),
        handler: `peuzon.handlers.${name}`,
        timeout: cdk.Duration.seconds(29),
        layers: [depsLayer],
        ...opts,
      });

      if (opts?.apply) {
        opts.apply(func);
      }

      return func;
    };

    const wsApi = new apigwv2.WebSocketApi(this, "WebSocketApi", {
      connectRouteOptions: {
        authorizer: new apigwv2Auth.WebSocketLambdaAuthorizer(
          "wsAuth",
          createHandler("ws.auth", {
            environment: {
              SESSIONS_TABLE: sessionsTable.tableName,
            },
            apply: f => sessionsTable.grantReadWriteData(f),
          }),
          {
            identitySource: ["route.request.querystring.s"],
          },
        ),
        integration: new apigwv2Int.WebSocketLambdaIntegration(
          "ConnectIntegration",
          createHandler("ws.connect", {
            environment: {
              LOCATIONS_QUEUE: locationSenderQueue.queueUrl,
            },
            apply: f => locationSenderQueue.grantSendMessages(f),
          }),
        ),
      },
      disconnectRouteOptions: {
        integration: new apigwv2Int.WebSocketLambdaIntegration(
          "DisconnectIntegration",
          createHandler("ws.disconnect", {
            environment: {
              SESSIONS_TABLE: sessionsTable.tableName,
            },
            apply: f => sessionsTable.grantReadWriteData(f),
          }),
        ),
      },
      defaultRouteOptions: {
        integration: new apigwv2Int.WebSocketLambdaIntegration(
          "DefaultIntegration",
          createHandler("ws.default"),
        ),
      },
    });

    const wsStage = new apigwv2.WebSocketStage(this, "WsStage", {
      webSocketApi: wsApi,
      stageName: "prod",
      autoDeploy: true,
    });

    createHandler("send_locations.handler", {
      environment: {
        LOCATIONS_TABLE: locationsTable.tableName,
        WS_CALLBACK_URL: wsStage.callbackUrl,
      },
      timeout: cdk.Duration.minutes(15),
      apply: f => {
        f.addEventSource(new lambdaEvents.SqsEventSource(locationSenderQueue));
        wsApi.grantManageConnections(f);
        locationsTable.grantReadData(f);
      },
    });

    const apiKeysTable = new dynamodb.Table(this, "APIKeys", {
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      partitionKey: {
        name: "hash",
        type: dynamodb.AttributeType.STRING,
      },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const restApi = new apigwv2.HttpApi(this, "RestApi", {
      defaultAuthorizer: new apigwv2Auth.HttpLambdaAuthorizer(
        "RestAuth",
        createHandler("rest.auth", {
          environment: {
            API_KEYS_TABLE: apiKeysTable.tableName,
          },
          apply: f => apiKeysTable.grantReadData(f),
        }),
        {
          responseTypes: [apigwv2Auth.HttpLambdaResponseType.SIMPLE],
          resultsCacheTtl: cdk.Duration.seconds(0),
        },
      ),
      corsPreflight: {
        allowHeaders: ["Authorization"],
        allowMethods: [
          apigwv2.CorsHttpMethod.GET,
          apigwv2.CorsHttpMethod.HEAD,
          apigwv2.CorsHttpMethod.OPTIONS,
          apigwv2.CorsHttpMethod.POST,
        ],
        allowOrigins: ["*"],
        maxAge: cdk.Duration.days(10),
      },
    });

    restApi.addRoutes({
      path: "/sessions",
      integration: new apigwv2Int.HttpLambdaIntegration(
        "CreateSession",
        createHandler("rest.create_session", {
          environment: {
            SESSIONS_TABLE: sessionsTable.tableName,
          },
          apply: f => sessionsTable.grantReadWriteData(f),
        }),
      ),
      methods: [apigwv2.HttpMethod.POST],
    });

    restApi.addRoutes({
      path: "/sessions/{sessId}/locations",
      integration: new apigwv2Int.HttpLambdaIntegration(
        "AddLocation",
        createHandler("rest.add_location", {
          environment: {
            SESSIONS_TABLE: sessionsTable.tableName,
            LOCATIONS_TABLE: locationsTable.tableName,
            WS_CALLBACK_URL: wsStage.callbackUrl,
          },
          apply: f => {
            sessionsTable.grantReadWriteData(f);
            wsApi.grantManageConnections(f);
            locationsTable.grantReadWriteData(f);
          },
        }),
      ),
      methods: [apigwv2.HttpMethod.POST],
    });

    restApi.addRoutes({
      path: "/sessions/{sessId}/heartbeat",
      integration: new apigwv2Int.HttpLambdaIntegration(
        "Heartbeat",
        createHandler("rest.heartbeat", {
          environment: {
            WS_CALLBACK_URL: wsStage.callbackUrl,
          },
          apply: f => wsApi.grantManageConnections(f),
        }),
      ),
      methods: [apigwv2.HttpMethod.POST],
    });

    Object.entries({
      RestApiUrl: restApi.apiEndpoint,
      WebSocketUrl: wsStage.url,
      SessionsTableName: sessionsTable.tableName,
      LocationsTableName: locationsTable.tableName,
      ApiKeysTableName: apiKeysTable.tableName,
      BucketName: bucket.bucketName,
      WebsiteUrl: `https://${bucket.bucketRegionalDomainName}/index.html`,
    }).forEach(([key, value]) => {
      new cdk.CfnOutput(this, key, { value });
    });
  }
}

interface FunctionOpts extends lambda.FunctionOptions {
  apply?: (f: lambda.IFunction) => void;
}

const app = new cdk.App();

new PeuzonStack(app, "PeuzonStack", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});
