import json
import os

from boto3.dynamodb.conditions import Attr
from botocore.exceptions import ClientError
from peuzon.api_handler import api_handler
from peuzon.botores import boto3_resource
from peuzon.models.location_sender import Message as LocationSenderMessage
from peuzon.models.ws import AuthorizerEvent, WebSocketRouteEvent

SESSIONS = boto3_resource("dynamodb").Table(os.getenv("SESSIONS_TABLE"))
LOCATIONS_QUEUE = boto3_resource("sqs").Queue(os.getenv("LOCATIONS_QUEUE"))


@api_handler
def auth(event: AuthorizerEvent):
    """
    Implementation of the Lambda authorizer attached to the WebSocket API
    """
    try:
        sess_id = event.query_string_parameters["s"]

        try:
            SESSIONS.update_item(
                Key={"id": sess_id},
                UpdateExpression="ADD subscribers :s",
                ExpressionAttributeValues={":s": {event.request_context.connection_id}},
                ConditionExpression=Attr("id").exists(),
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


@api_handler
def connect(event: WebSocketRouteEvent):
    """
    Implementation of the WebSocket API $connect route
    """
    LOCATIONS_QUEUE.send_message(
        MessageBody=LocationSenderMessage(
            session_id=event.session_id,
            conn_id=event.request_context.connection_id,
        ).model_dump_json()
    )

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
        SESSIONS.update_item(
            Key={"id": event.session_id},
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
