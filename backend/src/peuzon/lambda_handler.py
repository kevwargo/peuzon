import json
import traceback
from functools import wraps
from inspect import getfullargspec

from pydantic import BaseModel


def lambda_handler(fn=None, /, *, exc_handler=None):
    """
    Wraps lambda handler by substituting first parameter with a BaseModel
    built from the dict received from Lambda.
    """

    def wrapper(handler_fn):
        spec = getfullargspec(handler_fn)

        convert = lambda e: e  # noqa: E731
        if len(spec.args) >= 1:
            req_type = spec.annotations.get(spec.args[0])
            if isinstance(req_type, type) and issubclass(req_type, BaseModel):
                convert = req_type.model_validate

        @wraps(handler_fn)
        def wrapped_handler(event: dict, ctx: dict):
            try:
                req = convert(event)
                return handler_fn(req)
            except Exception as e:
                if callable(exc_handler):
                    print(format_exc(e))
                    return exc_handler(e)
                raise

        return wrapped_handler

    if fn is None:
        return wrapper

    return wrapper(fn)


def format_exc(e: Exception):
    tb = traceback.extract_tb(e.__traceback__)
    return json.dumps(
        {
            "error": f"{type(e).__name__}({e})",
            "stack": [f"{f.filename}:{f.lineno} in {f.name}" for f in tb],
        }
    )
