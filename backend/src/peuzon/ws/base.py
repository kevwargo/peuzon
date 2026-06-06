from functools import wraps
from inspect import getfullargspec

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class AwsModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel)


class Identity(AwsModel):
    source_ip: str | None = None
    user_agent: str | None = None


class RequestContext(AwsModel):
    route_key: str
    event_type: str

    extended_request_id: str | None = None
    request_time: str | None = None
    request_time_epoch: int

    message_direction: str | None = None

    stage: str
    connected_at: int | None = None

    request_id: str
    domain_name: str
    connection_id: str
    api_id: str

    identity: Identity | None = None
    authorizer: dict | None = None


class AuthorizerEvent(AwsModel):
    type: str
    method_arn: str

    headers: dict[str, str] = {}
    multi_value_headers: dict[str, list[str]] = {}

    query_string_parameters: dict[str, str] = {}
    multi_value_query_string_parameters: dict[str, list[str]] = {}

    stage_variables: dict[str, str] = {}

    request_context: RequestContext


class WebSocketRouteEvent(AwsModel):
    headers: dict[str, str] = {}
    multi_value_headers: dict[str, list[str]] = {}

    request_context: RequestContext

    is_base64_encoded: bool = False

    body: str | None = None


class ConnectEvent(WebSocketRouteEvent):
    query_string_parameters: dict[str, str] = {}
    multi_value_query_string_parameters: dict[str, list[str]] = {}

    stage_variables: dict[str, str] = {}


def ws_handler(fn):
    spec = getfullargspec(fn)

    assert len(spec.args) == 1
    req_type = spec.annotations.get(spec.args[0])
    assert isinstance(req_type, type) and issubclass(req_type, BaseModel)

    @wraps(fn)
    def wrapper(event: dict, ctx: dict):
        req = req_type.model_validate(event)
        return fn(req)

    return wrapper
