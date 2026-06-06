import json
import os
from functools import cached_property
from uuid import uuid4

import boto3
from botocore.exceptions import ClientError

from peuzon.api_handler import api_handler
from peuzon.api_keys import encode
from peuzon.models.rest import AuthorizerEvent, HttpRouteEvent


class Resources:
    @cached_property
    def ddb(self):
        return boto3.resource("dynamodb")

    @cached_property
    def api_keys(self):
        return self.ddb.Table(os.getenv("API_KEYS_TABLE"))

    @cached_property
    def sessions(self):
        return self.ddb.Table(os.getenv("SESSIONS_TABLE"))

    @cached_property
    def ws_callback(self):
        return boto3.client("apigatewaymanagementapi", endpoint_url=os.getenv("WS_CALLBACK_URL"))


RESOURCES = Resources()


@api_handler
def auth(event: AuthorizerEvent):
    try:
        hashed = encode(event.identity_source[0])
        allow = bool(RESOURCES.api_keys.get_item(Key={"hash": hashed}).get("Item"))
        print("allow", allow)
        return {"isAuthorized": allow}
    except Exception as e:
        print(f"{type(e).__name__}({e})")
        return {"isAuthorized": False}


@api_handler
def create_session(event: HttpRouteEvent):
    sess_id = str(uuid4())
    try:
        RESOURCES.sessions.put_item(Item={"sessionId": sess_id})
    except Exception as e:
        return {"statusCode": 500, "body": f"{type(e).__name__}({e})"}

    return sess_id


@api_handler
def add_point(event: HttpRouteEvent):
    try:
        sess_id = event.path_parameters["id"]
        session = RESOURCES.sessions.get_item(Key={"sessionId": sess_id}).get("Item")
        print(json.dumps({"session": session, "payload": event.payload_json}, default=str))
        for subscriber in session.get("subscribers", []):
            try:
                RESOURCES.ws_callback.post_to_connection(
                    ConnectionId=subscriber,
                    Data=json.dumps(event.payload_json).encode(),
                )
            except ClientError as ce:
                print(f"{type(ce).__name__}({ce})")
    except Exception as e:
        return {"statusCode": 500, "body": f"{type(e).__name__}({e})"}
