import json
import os
from decimal import Decimal

import boto3
from boto3.dynamodb.conditions import Attr, Key
from peuzon.botores import boto3_resource
from peuzon.lambda_handler import lambda_handler
from peuzon.models.location_sender import Message
from peuzon.models.sqs import SqsEvent

WS_MAX_MSG_SIZE = 32 * 1024

SESSIONS = boto3_resource("dynamodb").Table(os.getenv("SESSIONS_TABLE"))
LOCATIONS = boto3_resource("dynamodb").Table(os.getenv("LOCATIONS_TABLE"))
WS_CALLBACK = boto3.client("apigatewaymanagementapi", endpoint_url=os.getenv("WS_CALLBACK_URL"))


@lambda_handler
def handler(event: SqsEvent):
    try:
        for msg in event.records:
            _handle_message(Message.model_validate_json(msg.body))
    except Exception as e:
        print(f"{type(e).__name__}({e})")


def _handle_message(msg: Message):
    try:
        more, params = True, {
            "KeyConditionExpression": Key("sessionId").eq(msg.session_id),
            "ConsistentRead": True,
        }
        with _WSBatchSender(WS_CALLBACK, msg.conn_id) as batch:
            while more:
                resp = LOCATIONS.query(**params)
                more = params["ExclusiveStartKey"] = resp.get("LastEvaluatedKey")
                batch.send(resp.get("Items") or [])

        print(f"Subscribing {msg.conn_id} to session {msg.session_id}")
        SESSIONS.update_item(
            Key={"id": msg.session_id},
            UpdateExpression="ADD subscribers :s",
            ExpressionAttributeValues={":s": {msg.conn_id}},
            ConditionExpression=Attr("id").exists(),
        )
    except Exception as e:
        print(f"{type(e).__name__}({e})")


class _WSBatchSender:
    def __init__(self, client, conn_id):
        self.client = client
        self.conn_id = conn_id
        self._buf = []
        self._current_payload = None
        self._prev_payload = None

    def send(self, items: list[dict]):
        print(f"BatchSender.send({len(items)})")
        for item in items:
            self._add_item(item)
            if (size := len(self._current_payload)) < WS_MAX_MSG_SIZE:
                continue

            if self._prev_payload:
                print(
                    f"BatchSender: flushing {len(self._buf)-1} ({len(self._prev_payload)} bytes)"
                    f" because {len(self._buf)} take up {size} >= {WS_MAX_MSG_SIZE} bytes"
                )
                self._flush(self._prev_payload)
                self._reset_to_item(item)

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_value, tb):
        if self._current_payload:
            print(f"BatchSender: flushing rest: {len(self._buf)}({len(self._current_payload)})")
            self._flush(self._current_payload)

    def _add_item(self, item: dict):
        self._buf.append(item)
        self._refresh_payload()

    def _reset_to_item(self, item: dict):
        self._buf = [item]
        self._refresh_payload()

    def _refresh_payload(self):
        self._prev_payload = self._current_payload
        self._current_payload = json.dumps(self._buf, default=self._convert_float).encode()

    def _flush(self, payload):
        self.client.post_to_connection(ConnectionId=self.conn_id, Data=payload)

    @staticmethod
    def _convert_float(val):
        if isinstance(val, Decimal):
            return float(val)

        return str(val)
