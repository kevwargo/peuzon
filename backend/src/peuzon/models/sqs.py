from peuzon.models import AwsModel
from pydantic import Field


class SqsMessage(AwsModel):
    body: str


class SqsEvent(AwsModel):
    records: list[SqsMessage] = Field(alias="Records")
