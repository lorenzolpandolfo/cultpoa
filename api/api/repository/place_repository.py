from sqlalchemy.ext.asyncio import AsyncSession

from api.db.models.places import PlaceModel
from api.repository.abstract_repository import AbstractRepository


class PlaceRepository(AbstractRepository[PlaceModel]):

    def __init__(self, session: AsyncSession) -> None:
        super().__init__(model=PlaceModel, session=session)
