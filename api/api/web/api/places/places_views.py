from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from api.db.dependencies import get_db_session
from api.repository.place_repository import PlaceRepository
from api.services.place_service import PlaceService

router = APIRouter()

def get_service(
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> PlaceService:
    return PlaceService(PlaceRepository(session))


@router.post("/places")
async def create_place(
        name: str,
        service: Annotated[PlaceService, Depends(get_service)]
):
    return await service.create_place(name)


@router.get("/places")
async def list_places(service: Annotated[PlaceService, Depends(get_service)]):
    return await service.list_places()
