import os

import boto3

from peuzon.ws.base import WebSocketRouteEvent, ws_handler

TABLE = boto3.resource("dynamodb").Table(os.getenv("SESSIONS_TABLE"))


@ws_handler
def handler(event: WebSocketRouteEvent):
    try:
        sess_id = event.request_context.authorizer["sessionId"]

        TABLE.update_item(
            Key={"sessionId": sess_id},
            UpdateExpression="DELETE subscribers :s",
            ExpressionAttributeValues={":s": {event.request_context.connection_id}},
        )

        return {"statusCode": 200}
    except Exception as e:
        print(f"{type(e).__name__}({e})")

        return {"statusCode": 500}
