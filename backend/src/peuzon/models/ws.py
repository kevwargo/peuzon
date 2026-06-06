from peuzon.models import Apigw2Model


class Identity(Apigw2Model):
    source_ip: str | None = None
    user_agent: str | None = None


class RequestContext(Apigw2Model):
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


class AuthorizerEvent(Apigw2Model):
    type: str
    method_arn: str

    headers: dict[str, str] = {}
    multi_value_headers: dict[str, list[str]] = {}

    query_string_parameters: dict[str, str] = {}
    multi_value_query_string_parameters: dict[str, list[str]] = {}

    stage_variables: dict[str, str] = {}

    request_context: RequestContext


class WebSocketRouteEvent(Apigw2Model):
    headers: dict[str, str] = {}
    multi_value_headers: dict[str, list[str]] = {}

    request_context: RequestContext

    is_base64_encoded: bool = False

    body: str | None = None


class ConnectEvent(WebSocketRouteEvent):
    query_string_parameters: dict[str, str] = {}
    multi_value_query_string_parameters: dict[str, list[str]] = {}

    stage_variables: dict[str, str] = {}
