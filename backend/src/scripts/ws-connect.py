import asyncio
import json
import sys
from pathlib import Path

import websockets

WS_URL = json.loads((Path(__file__).parent / "../../cdk.out/outputs.json").read_text())[
    "PeuzonStack"
]["WebSocketUrl"]
SESSION_MAP = json.loads((Path(__file__).parent / "../../session-names.json").read_text())


async def main(sess_name: str, outfile: Path):
    sess_id = SESSION_MAP[sess_name]
    locations = []

    async with websockets.connect(f"{WS_URL}?s={sess_id}") as wsconn:
        print(f"connected to {wsconn}")
        async for msg in wsconn:
            try:
                page = json.loads(msg)
            except json.JSONDecodeError:
                continue

            locations.extend(page)
            outfile.write_text(json.dumps(locations, indent=2))
            print(f"Received and dumped {len(locations)} locations")


if __name__ == "__main__":
    asyncio.run(main(sys.argv[1], Path(sys.argv[2])))
