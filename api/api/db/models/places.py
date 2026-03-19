import uuid
from typing import Optional

from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from api.db.base import Base


class PlaceModel(Base):
    __tablename__ = "places"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    name: Mapped[str]
    lat: Mapped[float]
    lon: Mapped[float]
    type: Mapped[str]
    description: Mapped[Optional[str]] = mapped_column(nullable=True)
    image: Mapped[Optional[str]] = mapped_column(nullable=True)
    wikipedia: Mapped[Optional[str]] = mapped_column(nullable=True)
    website: Mapped[Optional[str]] = mapped_column(nullable=True)
