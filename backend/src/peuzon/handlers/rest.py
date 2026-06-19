import json
import os
import re
from datetime import UTC, datetime
from decimal import Decimal
from uuid import uuid4

import boto3
from boto3.dynamodb.conditions import Attr, Key
from botocore.exceptions import ClientError
from peuzon.api_keys import encode_api_key
from peuzon.botores import boto3_resource
from peuzon.lambda_handler import lambda_handler
from peuzon.models.rest import (AuthorizerEvent, DeviceEvent,
                                DeviceSubresourceEvent, HttpRouteEvent,
                                SessionEvent)

API_KEYS = boto3_resource("dynamodb").Table(os.getenv("API_KEYS_TABLE"))
DEVICES = boto3_resource("dynamodb").Table(os.getenv("DEVICES_TABLE"))
LOCATIONS = boto3_resource("dynamodb").Table(os.getenv("LOCATIONS_TABLE"))
SESSIONS = boto3_resource("dynamodb").Table(os.getenv("SESSIONS_TABLE"))
WS_CALLBACK = boto3.client("apigatewaymanagementapi", endpoint_url=os.getenv("WS_CALLBACK_URL"))


def _handle_auth_exc(e: Exception):
    return {"isAuthorized": False}


def _handle_route_exc(e: Exception):
    code, msg = 500, f"{type(e).__name__}({e})"
    if isinstance(e, ApiException):
        code, msg = e.code, str(e)

    return {"statusCode": code, "body": msg}


@lambda_handler(exc_handler=_handle_auth_exc)
def auth(event: AuthorizerEvent):
    hashed = encode_api_key(event.identity_source[0])
    allow = bool(API_KEYS.get_item(Key={"hash": hashed}).get("Item"))
    print("allow", allow)
    return {"isAuthorized": allow}


@lambda_handler(exc_handler=_handle_route_exc)
def get_device(event: DeviceEvent):
    device = DEVICES.get_item(Key={"id": event.device_id}).get("Item")
    if not device:
        raise ApiException(404, f"device {event.device_id} is not found")

    return device


@lambda_handler(exc_handler=_handle_route_exc)
def put_device(event: DeviceEvent):
    DEVICES.put_item(Item={**event.payload_json, "id": event.device_id})
    return ""


@lambda_handler(exc_handler=_handle_route_exc)
def get_active_session(event: DeviceSubresourceEvent):
    if s := _get_active_session(event.device_id):
        return s

    raise ApiException(404, "No active session")


@lambda_handler(exc_handler=_handle_route_exc)
def start_session(event: DeviceSubresourceEvent):
    active_session = _get_active_session(event.device_id)
    if active_session:
        raise ApiException(409, "There is an active session", session=active_session)

    new_session = {"deviceId": event.device_id, "id": str(uuid4()), "startTime": _datetime_now()}
    SESSIONS.put_item(Item=new_session)

    return new_session


@lambda_handler(exc_handler=_handle_route_exc)
def stop_session(event: SessionEvent):
    try:
        SESSIONS.update_item(
            Key={"deviceId": event.device_id, "id": event.session_id},
            UpdateExpression="SET endTime = :e",
            ExpressionAttributeValues={":e": _datetime_now()},
            ConditionExpression=Attr("deviceId").exists() & Attr("endTime").not_exists(),
        )
    except ClientError as ce:
        if ce.response["Error"]["Code"] == "ConditionalCheckFailedException":
            raise ApiException(
                400, f"Session {event.session_id} is already stopped or doesn't exist"
            ) from None
        raise


def _get_active_session(device_id: str) -> dict | None:
    prev_sessions = SESSIONS.query(
        KeyConditionExpression=Key("deviceId").eq(device_id),
        IndexName="startTime",
        ScanIndexForward=False,
        Limit=1,
    ).get("Items")

    if prev_sessions:
        last_session = prev_sessions[0]
        if "endTime" not in last_session:
            return last_session


class ApiException(Exception):
    def __init__(self, code: int, msg: str, **extra):
        super().__init__(json.dumps({"error": msg, **extra}))
        self.code = code


# *** OLD CODE ***


@lambda_handler
def add_location(event: HttpRouteEvent):
    try:
        session = SESSIONS.get_item(Key={"id": event.session_id}).get("Item")
        print(json.dumps({"session": session, "payload": event.payload_json}, default=str))

        now = _datetime_now()
        locations = [
            loc
            | {
                "timestamp": _datefmt(datetime.fromtimestamp(loc["ts"] / 1000, UTC)),
                "receivedAt": now,
            }
            for loc in event.payload_json
        ]

        for subscriber in (session or {}).get("subscribers", []):
            try:
                WS_CALLBACK.post_to_connection(
                    ConnectionId=subscriber,
                    Data=json.dumps(locations).encode(),
                )
            except ClientError as ce:
                print(f"{type(ce).__name__}({ce})")

        if isinstance(event.payload_json, list):
            _store_locations(event.session_id, locations)

        return {"statusCode": 201, "body": ""}
    except Exception as e:
        err = f"{type(e).__name__}({e})"
        print(err)
        return {"statusCode": 500, "body": err}


def _store_locations(sess_id: str, locations: list[dict]):
    with LOCATIONS.batch_writer() as batch:
        for loc in locations:
            item = _to_decimal(loc) | {"sessionId": sess_id, "buffered": True}
            batch.put_item(Item=item)


def _to_decimal(loc: dict) -> dict:
    return {k: Decimal(str(v)) if isinstance(v, float) else v for k, v in loc.items()}


def _datefmt(dt: datetime) -> str:
    return _TS_RE.sub("Z", dt.isoformat(timespec="milliseconds"))


def _datetime_now():
    return _datefmt(datetime.now(UTC))


_TS_RE = re.compile(r"\+00:00$")
