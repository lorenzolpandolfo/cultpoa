from api.db.models.places import PlaceModel
from api.repository.place_repository import PlaceRepository


class PlaceService:
    def __init__(self, repository: PlaceRepository):
        self.repository = repository

    async def create_place(self, name: str) -> PlaceModel:
        place = PlaceModel(id=None, name=name)
        return await self.repository.save(place)

    async def list_places(self) -> list[PlaceModel]:
        return await self.repository.find_all(limit=999)
