#!/usr/bin/env python3

import json
import sys
from datetime import datetime
from pathlib import Path

import boto3
from boto3.dynamodb.conditions import Key

SESSION_MAP = json.loads((Path(__file__).parent / "session-names.json").read_text())

OUTPUTS = json.loads((Path(__file__).parent / "cdk.out/outputs.json").read_text())
TABLE = boto3.resource("dynamodb").Table(OUTPUTS["PeuzonStack"]["LocationsTableName"])


def query_all(sess_name: str):
    more, params = True, {
        "KeyConditionExpression": Key("sessionId").eq(SESSION_MAP[sess_name]),
    }
    while more:
        resp = TABLE.query(**params)
        more = params["ExclusiveStartKey"] = resp.get("LastEvaluatedKey")
        for item in resp.get("Items") or []:
            print(_format_item(item))


def query_some(sess_name: str, limit: int):
    resp = TABLE.query(
        KeyConditionExpression=Key("sessionId").eq(SESSION_MAP[sess_name]),
        ScanIndexForward=False,
        Limit=limit,
    )
    for item in resp.get("Items") or []:
        print(_format_item(item))


def _format_item(item: dict) -> str:
    if recv := item.get("receivedAt"):
        recv = datetime.fromisoformat(recv)
        cap = datetime.fromisoformat(item["timestamp"])
        delta = str(recv - cap)
    else:
        delta = ""

    lat = item.get("lat") or item["latitude"]
    lng = item.get("lng") or item["longitude"]

    return f'{item["timestamp"]} {lat} {lng} {delta}'


if __name__ == "__main__":
    if len(sys.argv) == 2:
        query_all(sys.argv[1])
    elif len(sys.argv) == 3:
        query_some(sys.argv[1], int(sys.argv[2]))
