import os

import boto3
from boto3.dynamodb.conditions import Attr
from botocore.exceptions import ClientError

from peuzon.ws.base import AuthorizerEvent, ws_handler

TABLE = boto3.resource("dynamodb").Table(os.getenv("SESSIONS_TABLE"))


@ws_handler
def handler(event: AuthorizerEvent):
    try:
        sess_id = event.query_string_parameters["s"]

        try:
            TABLE.update_item(
                Key={"sessionId": sess_id},
                UpdateExpression="ADD subscribers :s",
                ExpressionAttributeValues={":s": {event.request_context.connection_id}},
                ConditionExpression=Attr("sessionId").exists(),
            )

            return generate_response(True, event.method_arn, {"sessionId": sess_id})
        except ClientError as e:
            if e.response["Error"]["Code"] != "ConditionalCheckFailedException":
                raise

            return generate_response(False, event.method_arn)
    except Exception as e:
        print(f"{type(e).__name__}({e})")

        return generate_response(False, event.method_arn)


def generate_response(allow: bool, method_arn: str, context=None):
    return {
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
