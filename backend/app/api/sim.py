from typing import Annotated, Any

from app.api.deps import get_current_user, get_db, require_role
from app.models import AppUser, Config
from app.sim.advance import advance_simulation
from app.sim.seed import seed_demo_data
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

router = APIRouter(prefix="/sim", tags=["simulation"])


class SeedRequest(BaseModel):
    reset: bool = True
    demo_date: str = "2026-10-26"


class AdvanceRequest(BaseModel):
    to_date: str


@router.get("/status")
def get_simulation_status(
    current_user: Annotated[AppUser, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> dict[str, Any]:
    sim_clock = db.query(Config).filter_by(key="sim_clock").first()
    if sim_clock and "current_date" in sim_clock.value:
        return {
            "current_date": sim_clock.value["current_date"],
            "cutoff_passed": sim_clock.value.get("cutoff_passed", True),
        }
    return {"current_date": "2026-10-26", "cutoff_passed": True}


@router.post("/seed")
def trigger_seed(
    req: SeedRequest,
    current_user: Annotated[AppUser, Depends(require_role(["manager", "admin"]))],
    db: Annotated[Session, Depends(get_db)],
) -> dict[str, Any]:
    res = seed_demo_data(db, reset=req.reset, demo_date_str=req.demo_date)
    return res


@router.post("/advance")
def trigger_advance(
    req: AdvanceRequest,
    current_user: Annotated[AppUser, Depends(require_role(["manager", "admin"]))],
    db: Annotated[Session, Depends(get_db)],
) -> dict[str, Any]:
    res = advance_simulation(db, target_date_str=req.to_date)
    return res
