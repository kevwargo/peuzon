import json
import sys
from pathlib import Path

import boto3

from peuzon.api_keys import generate


def main(outputs_file: Path, secret_file: Path):
    outputs = json.loads(outputs_file.read_text())
    table_name = outputs["PeuzonStack"]["ApiKeysTableName"]
    secret = generate(boto3.resource("dynamodb").Table(table_name))
    secret_file.write_text(f"export API_KEY={secret!r}")


if __name__ == "__main__":
    main(*map(Path, sys.argv[1:]))
