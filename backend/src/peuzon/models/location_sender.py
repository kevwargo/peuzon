from pydantic import BaseModel


class Message(BaseModel):
    device_id: str
    session_id: str | None = None
    conn_id: str
    since: str | None = None
