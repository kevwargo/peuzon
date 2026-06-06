import json
import sys
from pathlib import Path

import boto3

from peuzon.api_keys import generate

OUTPUTS_FILE = Path(__file__).parent / "../../cdk.out/outputs.json"


def main(env_file: Path):
    env = json.loads(env_file.read_text()) if env_file.exists() else {}
    outputs = json.loads(OUTPUTS_FILE.read_text())["PeuzonStack"]
    env["API_URL"] = outputs["RestApiUrl"]

    if not env.get("API_KEY"):
        print(f"API key is not defined in {env_file}, generating new one ...")
        table_name = outputs["ApiKeysTableName"]
        env["API_KEY"] = generate(boto3.resource("dynamodb").Table(table_name))
    else:
        print(f"API key is already defined in {env_file}")

    env_file.write_text(json.dumps(env))


if __name__ == "__main__":
    main(*map(Path, sys.argv[1:]))
