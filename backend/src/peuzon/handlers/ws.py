import json
import os
from functools import cached_property

import boto3
from boto3.dynamodb.conditions import Attr
from botocore.exceptions import ClientError

from peuzon.api_handler import api_handler
from peuzon.models.ws import AuthorizerEvent, WebSocketRouteEvent


class Resources:
    @cached_property
    def sessions(self):
        return boto3.resource("dynamodb").Table(os.getenv("SESSIONS_TABLE"))


RESOURCES = Resources()


@api_handler
def auth(event: AuthorizerEvent):
    """
    Implementation of the Lambda authorizer attached to the WebSocket API
    """
    try:
        sess_id = event.query_string_parameters["s"]

        try:
            RESOURCES.sessions.update_item(
                Key={"sessionId": sess_id},
                UpdateExpression="ADD subscribers :s",
                ExpressionAttributeValues={":s": {event.request_context.connection_id}},
                ConditionExpression=Attr("sessionId").exists(),
            )

            return _generate_auth_response(True, event.method_arn, {"sessionId": sess_id})
        except ClientError as e:
            if e.response["Error"]["Code"] != "ConditionalCheckFailedException":
                raise

            print(f"session {sess_id} is invalid")

            return _generate_auth_response(False, event.method_arn)
    except Exception as e:
        print(f"{type(e).__name__}({e})")

        return _generate_auth_response(False, event.method_arn)


def connect(event, ctx):
    """
    Implementation of the WebSocket API $connect route
    """
    return {"statusCode": 200}


def default(event, ctx):
    """
    Implementation of the WebSocket API $default route
    """
    return {"statusCode": 200}


@api_handler
def disconnect(event: WebSocketRouteEvent):
    """
    Implementation of the WebSocket API $disconnect route
    """
    try:
        sess_id = event.request_context.authorizer["sessionId"]

        RESOURCES.sessions.update_item(
            Key={"sessionId": sess_id},
            UpdateExpression="DELETE subscribers :s",
            ExpressionAttributeValues={":s": {event.request_context.connection_id}},
        )

        return {"statusCode": 200}
    except Exception as e:
        print(f"{type(e).__name__}({e})")

        return {"statusCode": 500}


def _generate_auth_response(allow: bool, method_arn: str, context=None):
    resp = {
        "principalId": "user",
        "policyDocument": {
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Action": "execute-api:Invoke",
                    "Effect": "Allow" if allow else "Deny",
                    "Resource": method_arn,
                }
            ],
        },
    } | ({"context": context} if context else {})

    print(json.dumps(resp))

    return resp
