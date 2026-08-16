import json
import sys
import xml.etree.ElementTree as xml
from datetime import datetime
from pathlib import Path

import boto3
from annocli import Arg, Namespace, entrypoint
from boto3.dynamodb.conditions import Key

OUTPUTS = json.loads((Path(__file__).parent / "../../cdk.out/outputs.json").read_text())
TABLE = boto3.resource("dynamodb").Table(OUTPUTS["PeuzonStack"]["LocationsTableName"])


class Args(Namespace):
    device_id: str = Arg("-d")
    # limit: int = Arg("-n", default=0)
    since: str | None = Arg("-s")
    starts_with: str | None = Arg("-w")
    dump_gpx: bool = Arg("-x", "--gpx")
    dump_json: bool = Arg("-j", "--json")
    verbose: bool


@entrypoint
def main(args: Args):
    if args.since and args.starts_with:
        raise ValueError("--starts-with and --since parameters are mutually exclusive")

    if args.verbose:
        setup_table_watcher()

    key_cond = Key("deviceId").eq(args.device_id)
    if args.since:
        key_cond &= Key("timestamp").gte(args.since)
    elif args.starts_with:
        key_cond &= Key("timestamp").begins_with(args.starts_with)

    params = {
        "KeyConditionExpression": key_cond,
        "ScanIndexForward": False,
    }
    items, more = [], True
    while more:
        resp = TABLE.query(**params)
        more = params["ExclusiveStartKey"] = resp.get("LastEvaluatedKey")
        items.extend(resp.get("Items") or [])

    if args.dump_gpx:
        print_gpx(args.device_id, items)
    elif args.dump_json:
        print_json(items)
    else:
        print_plain(items)


def print_plain(items: list[dict]):
    for item in items:
        if recv := item.get("receivedAt"):
            recv_dt = datetime.fromisoformat(recv)
            cap = datetime.fromisoformat(item["timestamp"])
            if recv_dt > cap:
                delta = str(recv_dt - cap)
            elif recv_dt < cap:
                delta = f"-{cap-recv_dt}"
            else:
                delta = "0"
        else:
            delta = ""

        print(f'{item["timestamp"]} {recv} {item["lat"]} {item["lng"]} {delta}')


def print_gpx(device_id: str, items: list[dict]):
    gpx = xml.Element(
        "gpx",
        {
            "version": "1.1",
            "creator": "peuzon",
            "xmlns": "http://www.topografix.com/GPX/1/1",
        },
    )

    trk = xml.SubElement(gpx, "trk")
    xml.SubElement(trk, "name").text = f"Peuzon {device_id}"
    trkseg = xml.SubElement(trk, "trkseg")

    for item in items:
        trkpt = xml.SubElement(trkseg, "trkpt", {"lat": str(item["lat"]), "lon": str(item["lng"])})
        xml.SubElement(trkpt, "ele").text = str(item["alt"])
        xml.SubElement(trkpt, "time").text = item["timestamp"]

    xml.indent(gpx)
    print(xml.tostring(gpx, encoding="unicode"))


def print_json(items: list[dict]):
    print(json.dumps(items, indent=2, default=lambda v: f"{type(v).__name__}({v})"))


def setup_table_watcher():
    def inspect(request, **kw):
        print("Sending", json.loads(request.body), file=sys.stderr)

    TABLE.meta.client.meta.events.register("before-send.dynamodb.Query", inspect)


if __name__ == "__main__":
    main()
