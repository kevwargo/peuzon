from pydantic import BaseModel


class Message(BaseModel):
    device_id: str
    session_id: str
    conn_id: str
