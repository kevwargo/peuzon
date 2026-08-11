from functools import cached_property

from peuzon.models import AwsModel


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

    @cached_property
    def device_id(self) -> str:
        return self.query_string_parameters["d"]

    @cached_property
    def session_id(self) -> str | None:
        return self.query_string_parameters.get("s")


class WebSocketRouteEvent(AwsModel):
    headers: dict[str, str] = {}
    multi_value_headers: dict[str, list[str]] = {}
    request_context: RequestContext
    is_base64_encoded: bool = False
    body: str | None = None

    @cached_property
    def device_id(self) -> str:
        return self.request_context.authorizer["deviceId"]

    @cached_property
    def session_id(self) -> str | None:
        return self.request_context.authorizer["sessionId"]
