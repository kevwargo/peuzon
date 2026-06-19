import { Duration } from "aws-cdk-lib";
import { CorsHttpMethod, HttpApi, HttpMethod, WebSocketApi } from "aws-cdk-lib/aws-apigatewayv2";
import {
  HttpLambdaAuthorizer,
  HttpLambdaResponseType,
} from "aws-cdk-lib/aws-apigatewayv2-authorizers";
import { HttpLambdaIntegration } from "aws-cdk-lib/aws-apigatewayv2-integrations";
import { Table } from "aws-cdk-lib/aws-dynamodb";
import { Function } from "aws-cdk-lib/aws-lambda";
import { Construct } from "constructs";
import { createFunction } from "../utils/lambda";

export interface RestApiProps {
  devices: Table;
  locations: Table;
  sessions: Table;
  apiKeys: Table;
  wsApi: WebSocketApi;
}

export class RestApi extends Construct {
  public readonly api: HttpApi;

  constructor(scope: Construct, props: RestApiProps) {
    super(scope, "RestApi");

    this.api = new HttpApi(this, "Api", {
      defaultAuthorizer: new HttpLambdaAuthorizer(
        "auth",
        createFunction(this, "rest.auth", {
          environment: {
            API_KEYS_TABLE: props.apiKeys.tableName,
          },
          with: f => props.apiKeys.grantReadData(f),
        }),
        {
          responseTypes: [HttpLambdaResponseType.SIMPLE],
          resultsCacheTtl: Duration.seconds(0),
        },
      ),
      corsPreflight: {
        allowHeaders: ["Authorization"],
        allowMethods: [
          CorsHttpMethod.GET,
          CorsHttpMethod.HEAD,
          CorsHttpMethod.OPTIONS,
          CorsHttpMethod.POST,
          CorsHttpMethod.PUT,
        ],
        allowOrigins: ["*"],
        maxAge: Duration.days(10),
      },
    });

    this.addRoute(
      "/devices/{id}",
      createFunction(this, "rest.get_device", {
        environment: {
          DEVICES_TABLE: props.devices.tableName,
        },
        with: f => props.devices.grantReadData(f),
      }),
      HttpMethod.GET,
    );
    this.addRoute(
      "/devices/{id}",
      createFunction(this, "rest.put_device", {
        environment: {
          DEVICES_TABLE: props.devices.tableName,
        },
        with: f => props.devices.grantWriteData(f),
      }),
      HttpMethod.PUT,
    );
    this.addRoute(
      "/devices/{deviceId}/sessions/active",
      createFunction(this, "rest.get_active_session", {
        environment: {
          SESSIONS_TABLE: props.sessions.tableName,
        },
        with: f => props.sessions.grantReadData(f),
      }),
      HttpMethod.GET,
    );
    this.addRoute(
      "/devices/{deviceId}/sessions/start",
      createFunction(this, "rest.start_session", {
        environment: {
          SESSIONS_TABLE: props.sessions.tableName,
        },
        with: f => props.sessions.grantReadWriteData(f),
      }),
      HttpMethod.POST,
    );
    this.addRoute(
      "/devices/{deviceId}/sessions/{sessionId}/stop",
      createFunction(this, "rest.stop_session", {
        environment: {
          SESSIONS_TABLE: props.sessions.tableName,
        },
        with: f => props.sessions.grant(f, "dynamodb:UpdateItem"),
      }),
      HttpMethod.POST,
    );
    this.addRoute(
      "/devices/{deviceId}/sessions/{sessionId}/locations",
      createFunction(this, "rest.add_location", {
        environment: {
          DEVICES_TABLE: props.devices.tableName,
          LOCATIONS_TABLE: props.locations.tableName,
          SESSIONS_TABLE: props.sessions.tableName,
        },
        with: f => {
          props.devices.grantReadData(f);
          props.sessions.grantReadData(f);
          props.locations.grantReadWriteData(f);
        },
      }),
      HttpMethod.POST,
    );
  }

  private addRoute(path: string, handler: Function, ...methods: HttpMethod[]) {
    this.api.addRoutes({
      path,
      integration: new HttpLambdaIntegration(path, handler),
      methods,
    });
  }
}
