from functools import wraps

import boto3


class boto3_resource:
    def __init__(self, res_type: str):
        self.res = boto3.resource(res_type)

    def __getattr__(self, name: str):
        obj = getattr(self.res, name)
        if not callable(obj):
            return obj

        @wraps(obj)
        def func(*args, **kwargs):
            try:
                return obj(*args, **kwargs)
            except ValueError:
                return None

        return func
