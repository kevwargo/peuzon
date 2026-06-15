from pydantic import BaseModel


class Message(BaseModel):
    session_id: str
    conn_id: str
