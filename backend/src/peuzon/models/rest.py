import json
from base64 import b64decode
from functools import cached_property

from peuzon.models import Apigw2Model


class AuthorizerEvent(Apigw2Model):
    identity_source: list[str]


class HttpRouteEvent(Apigw2Model):
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
