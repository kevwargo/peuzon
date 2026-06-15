import json
from base64 import b64decode
from functools import cached_property

from peuzon.models import AwsModel


class AuthorizerEvent(AwsModel):
    identity_source: list[str]


class HttpRouteEvent(AwsModel):
    headers: dict[str, str] = {}
    query_string_parameters: dict[str, str] = {}
    path_parameters: dict[str, str] = {}
    is_base64_encoded: bool = False
    body: str | None = None

    @cached_property
    def payload_json(self):
        body = self.body
        if self.is_base64_encoded:
            body = b64decode(body)

        return json.loads(body)

    @cached_property
    def session_id(self) -> str:
        return self.path_parameters["sessId"]
