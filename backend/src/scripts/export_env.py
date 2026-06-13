import json
import sys
import xml.etree.ElementTree as xml
from pathlib import Path

import boto3
from peuzon.api_keys import generate

OUTPUTS = json.loads((Path(__file__).parent / "../../cdk.out/outputs.json").read_text())[
    "PeuzonStack"
]


class AndroidStringResources:
    def __init__(self, f: Path):
        self._file = f
        self._tree = xml.ElementTree()
        if f.exists():
            self._tree.parse(f)

        self._root = self._tree.getroot()
        if self._root is None or self._root.tag != "resources":
            print("setting XML root to an empty <resources>")
            self._root = xml.Element("resources")
            self._tree = xml.ElementTree(self._root)

        self._values = {}
        for elt in self._root:
            if elt.tag != "string":
                continue
            if name := elt.attrib.get("name"):
                self._values[name] = elt

    def get(self, name: str) -> str | None:
        if (elt := self._values.get(name)) is not None:
            return elt.text

        return None

    def set(self, name: str, value: str):
        if (elt := self._values.get(name)) is not None:
            print(f"resetting existing {name} value")
            elt.text = value
        else:
            print(f"adding new {name} value")
            elt = xml.Element("string", attrib={"name": name})
            elt.text = value
            self._root.append(elt)

    def save(self):
        print(f"saving {self._file}")
        self._tree.write(self._file, xml_declaration=False)

    def __str__(self):
        return str(self._file)


def main(app_path: Path):
    android_strings = AndroidStringResources(app_path / "android/app/src/main/res/values/api.xml")
    android_strings.set("api_url", OUTPUTS["RestApiUrl"])
    if api_key := android_strings.get("api_key"):
        print(f"API key is already defined in {android_strings}")
    else:
        print(f"API key is not defined in {android_strings}, generating new one ...")
        table_name = OUTPUTS["ApiKeysTableName"]
        new_api_key = generate(boto3.resource("dynamodb").Table(table_name))
        android_strings.set("api_key", new_api_key)

    env = {
        "API_URL": OUTPUTS["RestApiUrl"],
        "API_KEY": api_key,
        "WEBSITE_URL": OUTPUTS["WebsiteUrl"],
    }
    (app_path / "env.json").write_text(json.dumps(env, indent=2))
    android_strings.save()


if __name__ == "__main__":
    main(*map(Path, sys.argv[1:]))
