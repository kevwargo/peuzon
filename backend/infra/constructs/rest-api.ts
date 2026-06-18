import { Duration } from "aws-cdk-lib";
import { CorsHttpMethod, HttpApi, WebSocketApi } from "aws-cdk-lib/aws-apigatewayv2";
import {
  HttpLambdaAuthorizer,
  HttpLambdaResponseType,
} from "aws-cdk-lib/aws-apigatewayv2-authorizers";
import { Table } from "aws-cdk-lib/aws-dynamodb";
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

    // TODO: addRoutes
  }
}
