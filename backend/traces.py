#!/usr/bin/env python3

import json
import sys
from pathlib import Path

import boto3
from boto3.dynamodb.conditions import Key

SESSION_MAP = json.loads((Path(__file__).parent / "traces.json").read_text())

OUTPUTS = json.loads((Path(__file__).parent / "cdk.out/outputs.json").read_text())
TABLE = boto3.resource("dynamodb").Table(OUTPUTS["PeuzonStack"]["TracesTableName"])


def query_all(sess_name: str):
    more, params = True, {
        "KeyConditionExpression": Key("sessionId").eq(SESSION_MAP[sess_name]),
    }
    while more:
        resp = TABLE.query(**params)
        more = params["ExclusiveStartKey"] = resp.get("LastEvaluatedKey")
        for item in resp.get("Items") or []:
            print(f'{item["timestamp"]} {_get_loc(item)}')


def query_some(sess_name: str, limit: int):
    resp = TABLE.query(
        KeyConditionExpression=Key("sessionId").eq(SESSION_MAP[sess_name]),
        ScanIndexForward=False,
        Limit=limit,
    )
    for item in resp.get("Items") or []:
        print(f'{item["timestamp"]} {_get_loc(item)}')


def _get_loc(item: dict) -> str:
    lat = item.get("lat") or item["latitude"]
    lng = item.get("lng") or item["longitude"]
    return f"{lat} {lng}"


if __name__ == "__main__":
    if len(sys.argv) == 2:
        query_all(sys.argv[1])
    elif len(sys.argv) == 3:
        query_some(sys.argv[1], int(sys.argv[2]))
