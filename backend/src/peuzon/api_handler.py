from functools import wraps
from inspect import getfullargspec

from pydantic import BaseModel


def api_handler(fn):
    """
    Wraps lambda handler by substituting first parameter with a BaseModel
    built from the dict received from Lambda.
    """
    spec = getfullargspec(fn)

    assert len(spec.args) == 1
    req_type = spec.annotations.get(spec.args[0])
    assert isinstance(req_type, type) and issubclass(req_type, BaseModel)

    @wraps(fn)
    def wrapper(event: dict, ctx: dict):
        req = req_type.model_validate(event)
        return fn(req)

    return wrapper
