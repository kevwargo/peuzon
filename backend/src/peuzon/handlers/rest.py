import json
import os
import re
from datetime import UTC, datetime
from decimal import Decimal
from uuid import uuid4

import boto3
from botocore.exceptions import ClientError
from peuzon.api_handler import api_handler
from peuzon.api_keys import encode
from peuzon.botores import boto3_resource
from peuzon.models.rest import AuthorizerEvent, HttpRouteEvent

API_KEYS = boto3_resource("dynamodb").Table(os.getenv("API_KEYS_TABLE"))
SESSIONS = boto3_resource("dynamodb").Table(os.getenv("SESSIONS_TABLE"))
LOCATIONS = boto3_resource("dynamodb").Table(os.getenv("LOCATIONS_TABLE"))
WS_CALLBACK = boto3.client("apigatewaymanagementapi", endpoint_url=os.getenv("WS_CALLBACK_URL"))


@api_handler
def auth(event: AuthorizerEvent):
    try:
        hashed = encode(event.identity_source[0])
        allow = bool(API_KEYS.get_item(Key={"hash": hashed}).get("Item"))
        print("allow", allow)
        return {"isAuthorized": allow}
    except Exception as e:
        print(f"{type(e).__name__}({e})")
        return {"isAuthorized": False}


@api_handler
def create_session(event: HttpRouteEvent):
    sess_id = str(uuid4())
    try:
        SESSIONS.put_item(Item={"id": sess_id})
    except Exception as e:
        return {"statusCode": 500, "body": f"{type(e).__name__}({e})"}

    return sess_id


@api_handler
def add_location(event: HttpRouteEvent):
    try:
        session = SESSIONS.get_item(Key={"id": event.session_id}).get("Item")
        print(json.dumps({"session": session, "payload": event.payload_json}, default=str))

        for subscriber in (session or {}).get("subscribers", []):
            try:
                WS_CALLBACK.post_to_connection(
                    ConnectionId=subscriber,
                    Data=json.dumps(event.payload_json).encode(),
                )
            except ClientError as ce:
                print(f"{type(ce).__name__}({ce})")

        if isinstance(event.payload_json, list):
            _store_locations(event.session_id, event.payload_json)

        return {"statusCode": 201, "body": ""}
    except Exception as e:
        err = f"{type(e).__name__}({e})"
        print(err)
        return {"statusCode": 500, "body": err}


@api_handler
def heartbeat(event: HttpRouteEvent):
    return {"statusCode": 202}


def _store_locations(sess_id: str, locations: list[dict]):
    now = _datefmt(datetime.now(UTC))
    with LOCATIONS.batch_writer() as batch:
        for loc in locations:
            dt = datetime.fromtimestamp(loc["ts"] / 1000, UTC)
            item = _to_decimal(loc) | {
                "sessionId": sess_id,
                "timestamp": _datefmt(dt),
                "receivedAt": now,
            }
            batch.put_item(Item=item)


def _to_decimal(item: dict) -> dict:
    return {k: Decimal(str(v)) if isinstance(v, float) else v for k, v in item.items()}


def _datefmt(dt: datetime) -> str:
    return _TS_RE.sub("Z", dt.isoformat(timespec="milliseconds"))


_TS_RE = re.compile(r"\+00:00$")
