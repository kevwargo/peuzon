import { Duration } from "aws-cdk-lib";
import { WebSocketApi, WebSocketStage } from "aws-cdk-lib/aws-apigatewayv2";
import { WebSocketLambdaAuthorizer } from "aws-cdk-lib/aws-apigatewayv2-authorizers";
import { WebSocketLambdaIntegration } from "aws-cdk-lib/aws-apigatewayv2-integrations";
import { Table } from "aws-cdk-lib/aws-dynamodb";
import { SqsEventSource } from "aws-cdk-lib/aws-lambda-event-sources";
import { Queue } from "aws-cdk-lib/aws-sqs";
import { Construct } from "constructs";
import { createFunction } from "../utils/lambda";

export interface WsApiProps {
  devices: Table;
  locations: Table;
  sessions: Table;
}

export class WsApi extends Construct {
  public readonly api: WebSocketApi;
  public readonly stage: WebSocketStage;

  constructor(scope: Construct, props: WsApiProps) {
    super(scope, "WsApi");

    const locationSenderQueue = new Queue(this, "LocationSender", {
      visibilityTimeout: Duration.minutes(15),
    });

    this.api = new WebSocketApi(this, "Api", {
      connectRouteOptions: {
        authorizer: new WebSocketLambdaAuthorizer(
          "wsAuth",
          createFunction(this, "ws.auth", {
            environment: {
              DEVICES_TABLE: props.devices.tableName,
            },
            with: f => props.devices.grantReadData(f),
          }),
          {
            identitySource: ["route.request.querystring.s"],
          },
        ),
        integration: new WebSocketLambdaIntegration(
          "connect",
          createFunction(this, "ws.connect", {
            environment: {
              LOCATION_SENDER_QUEUE: locationSenderQueue.queueUrl,
            },
            with: f => locationSenderQueue.grantSendMessages(f),
          }),
        ),
      },
      disconnectRouteOptions: {
        integration: new WebSocketLambdaIntegration(
          "disconnect",
          createFunction(this, "ws.disconnect", {
            // TODO: ensure proper ws connection management (here and in other places)
            environment: {
              SESSIONS_TABLE: props.sessions.tableName,
            },
            with: f => props.sessions.grantReadWriteData(f),
          }),
        ),
      },
      defaultRouteOptions: {
        integration: new WebSocketLambdaIntegration(
          "disconnect",
          createFunction(this, "ws.default"),
        ),
      },
    });

    this.stage = new WebSocketStage(this, "Stage", {
      webSocketApi: this.api,
      stageName: "prod",
      autoDeploy: true,
    });

    createFunction(this, "send_locations.handler", {
      environment: {
        LOCATIONS_TABLE: props.locations.tableName,
        WS_CALLBACK_URL: this.stage.callbackUrl,
      },
      events: [new SqsEventSource(locationSenderQueue)],
      with: f => {
        props.locations.grantReadData(f);
        this.stage.grantManagementApiAccess(f);
      },
    });
  }
}
