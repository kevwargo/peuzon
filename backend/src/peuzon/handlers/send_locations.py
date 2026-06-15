import json
import os
from decimal import Decimal

import boto3
from boto3.dynamodb.conditions import Key
from peuzon.api_handler import api_handler
from peuzon.botores import boto3_resource
from peuzon.models.location_sender import Message
from peuzon.models.sqs import SqsEvent

WS_MAX_MSG_SIZE = 32 * 1024

LOCATIONS = boto3_resource("dynamodb").Table(os.getenv("LOCATIONS_TABLE"))
WS_CALLBACK = boto3.client("apigatewaymanagementapi", endpoint_url=os.getenv("WS_CALLBACK_URL"))


@api_handler
def handler(event: SqsEvent):
    try:
        for msg in event.records:
            _handle_message(Message.model_validate_json(msg.body))
    except Exception as e:
        print(f"{type(e).__name__}({e})")


def _handle_message(msg: Message):
    try:
        more, params = True, {"KeyConditionExpression": Key("sessionId").eq(msg.session_id)}
        while more:
            resp = LOCATIONS.query(**params)
            more = params["ExclusiveStartKey"] = resp.get("LastEvaluatedKey")
            _ws_send_batched(msg.conn_id, resp.get("Items") or [])
    except Exception as e:
        print(f"{type(e).__name__}({e})")


def _ws_send_batched(conn_id: str, locations: list[dict]):
    print(f"send_batch({len(locations)})")

    buf = _WSBuf()
    for loc in locations:
        buf.append(loc)
        if (size := len(buf.bytes)) < WS_MAX_MSG_SIZE:
            last_payload = buf.bytes
            continue

        if len(buf) == 1:
            print(buf.bytes.decode())
            raise ValueError(f"Single location item takes up {size} >= {WS_MAX_MSG_SIZE}")

        print(
            f"send_batch: sending {len(buf)-1} items ({len(last_payload)} bytes)"
            f" because {len(buf)} items take up {size} >= {WS_MAX_MSG_SIZE}"
        )
        WS_CALLBACK.post_to_connection(ConnectionId=conn_id, Data=last_payload)
        buf = _WSBuf([loc])

    if buf:
        print(f"send_batch: sending {len(buf)} items ({len(buf.bytes)} bytes)")
        WS_CALLBACK.post_to_connection(ConnectionId=conn_id, Data=buf.bytes)


class _WSBuf(list):
    def __init__(self, *args):
        super().__init__(*args)
        self._bytes = None

    def append(self, o):
        super().append(o)
        self._bytes = None

    @property
    def bytes(self):
        if self._bytes is None:
            self._bytes = json.dumps(
                self, default=lambda o: (float if isinstance(o, Decimal) else str)(o)
            ).encode()
        return self._bytes
