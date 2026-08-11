import json
import os

from boto3.dynamodb.conditions import Attr
from peuzon.botores import boto3_resource, ignore_aws_errors
from peuzon.lambda_handler import lambda_handler
from peuzon.models.location_sender import Message as LocationSenderMessage
from peuzon.models.ws import AuthorizerEvent, WebSocketRouteEvent

DEVICES = boto3_resource("dynamodb").Table(os.getenv("DEVICES_TABLE"))
SESSIONS = boto3_resource("dynamodb").Table(os.getenv("SESSIONS_TABLE"))
LOCATIONS_QUEUE = boto3_resource("sqs").Queue(os.getenv("LOCATIONS_QUEUE"))


@lambda_handler
def auth(event: AuthorizerEvent):
    """
    Implementation of the Lambda authorizer attached to the WebSocket API
    """
    try:
        if not DEVICES.get_item(Key={"id": event.device_id}).get("Item"):
            raise ValueError(f"Device {event.device_id} not found")

        if event.session_id and not SESSIONS.get_item(
            Key={"deviceId": event.device_id, "id": event.session_id}
        ).get("Item"):
            raise ValueError(f"Session {event.session_id} not found")

        return _generate_auth_response(
            True, event.method_arn, {"deviceId": event.device_id, "sessionId": event.session_id}
        )
    except Exception as e:
        print(f"{type(e).__name__}({e})")
        return _generate_auth_response(False, event.method_arn)


@lambda_handler(exc_handler=lambda e: {"statusCode": 500})
def connect(event: WebSocketRouteEvent):
    """
    Implementation of the WebSocket API $connect route
    """
    LOCATIONS_QUEUE.send_message(
        MessageBody=LocationSenderMessage(
            device_id=event.device_id,
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


@lambda_handler(exc_handler=lambda e: {"statusCode": 500})
def disconnect(event: WebSocketRouteEvent):
    """
    Implementation of the WebSocket API $disconnect route
    """
    update_params = dict(
        UpdateExpression="DELETE subscribers :s",
        ExpressionAttributeValues={":s": {event.request_context.connection_id}},
        ConditionExpression=Attr("id").exists(),
    )

    with ignore_aws_errors("ConditionalCheckFailedException"):
        DEVICES.update_item(Key={"id": event.device_id}, **update_params)

    if event.session_id:
        with ignore_aws_errors("ConditionalCheckFailedException"):
            SESSIONS.update_item(
                Key={"deviceId": event.device_id, "id": event.session_id}, **update_params
            )

    return {"statusCode": 200}


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
