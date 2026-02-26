# api/routes/experiment.py
"""
실험 전용 API 엔드포인트

- /config: 현재 실험 조건 조회
- /log: 실험 이벤트 기록
- /survey: 설문 응답 저장
- /logs: 실험 로그 조회 (관리자용)
"""

from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from loguru import logger
from pydantic import BaseModel

from ...datamodel import ExperimentLog, ExperimentSurvey
from ..deps import get_db

router = APIRouter()


# === Request/Response Models ===


class ExperimentConfigResponse(BaseModel):
    experiment_mode: bool
    experiment_condition: str
    participant_id: Optional[str]
    experiment_task_scenario: Optional[str]


class LogEventRequest(BaseModel):
    event_type: str
    event_data: Optional[Dict[str, Any]] = None
    session_id: Optional[int] = None
    run_id: Optional[int] = None
    participant_id: Optional[str] = None


class SurveyRequest(BaseModel):
    participant_id: Optional[str] = None
    experiment_condition: Optional[str] = None
    session_id: Optional[int] = None
    responses: Dict[str, Any]


# === Global config reference (set during app startup) ===

_experiment_config: Optional[Dict[str, Any]] = None


def set_experiment_config(config: Dict[str, Any]) -> None:
    """Called during app startup to store the experiment config"""
    global _experiment_config
    _experiment_config = config


def get_experiment_config() -> Dict[str, Any]:
    """Get the current experiment config"""
    return _experiment_config or {}


# === Endpoints ===


@router.get("/config")
async def get_config() -> Dict:
    """Return the current experiment condition and settings"""
    config = get_experiment_config()
    return {
        "status": True,
        "data": {
            "experiment_mode": config.get("experiment_mode", False),
            "experiment_condition": config.get("experiment_condition", "default"),
            "participant_id": config.get("participant_id"),
            "experiment_task_scenario": config.get("experiment_task_scenario"),
        },
    }


@router.post("/log")
async def log_event(request: LogEventRequest, db=Depends(get_db)) -> Dict:
    """Record an experiment interaction event"""
    config = get_experiment_config()
    if not config.get("experiment_mode", False):
        return {"status": False, "message": "Experiment mode is not enabled"}

    try:
        log_entry = ExperimentLog(
            participant_id=request.participant_id or config.get("participant_id"),
            session_id=request.session_id,
            run_id=request.run_id,
            experiment_condition=config.get("experiment_condition", "default"),
            event_type=request.event_type,
            event_data=request.event_data or {},
        )
        result = db.upsert(log_entry)
        if not result.status:
            raise HTTPException(status_code=500, detail="Failed to save log entry")
        return {"status": True, "data": result.data}
    except HTTPException:
        raise
    except Exception as e:
        logger.warning(f"Failed to log experiment event: {e}")
        return {"status": False, "message": str(e)}


@router.post("/survey")
async def save_survey(request: SurveyRequest, db=Depends(get_db)) -> Dict:
    """Save a post-experiment survey response"""
    config = get_experiment_config()
    if not config.get("experiment_mode", False):
        return {"status": False, "message": "Experiment mode is not enabled"}

    try:
        survey = ExperimentSurvey(
            participant_id=request.participant_id or config.get("participant_id"),
            experiment_condition=request.experiment_condition
            or config.get("experiment_condition", "default"),
            session_id=request.session_id,
            responses=request.responses,
        )
        result = db.upsert(survey)
        if not result.status:
            raise HTTPException(status_code=500, detail="Failed to save survey")
        return {"status": True, "data": result.data}
    except HTTPException:
        raise
    except Exception as e:
        logger.warning(f"Failed to save survey: {e}")
        return {"status": False, "message": str(e)}


@router.get("/logs")
async def get_logs(
    participant_id: Optional[str] = None,
    session_id: Optional[int] = None,
    event_type: Optional[str] = None,
    db=Depends(get_db),
) -> Dict:
    """Retrieve experiment logs (for admin/research use)"""
    config = get_experiment_config()
    if not config.get("experiment_mode", False):
        return {"status": False, "message": "Experiment mode is not enabled"}

    try:
        filters: Dict[str, Any] = {}
        if participant_id:
            filters["participant_id"] = participant_id
        if session_id:
            filters["session_id"] = session_id
        if event_type:
            filters["event_type"] = event_type

        response = db.get(ExperimentLog, filters=filters, return_json=True)
        return {"status": True, "data": response.data}
    except Exception as e:
        logger.warning(f"Failed to retrieve experiment logs: {e}")
        return {"status": False, "message": str(e)}


@router.get("/surveys")
async def get_surveys(
    participant_id: Optional[str] = None,
    db=Depends(get_db),
) -> Dict:
    """Retrieve survey responses (for admin/research use)"""
    config = get_experiment_config()
    if not config.get("experiment_mode", False):
        return {"status": False, "message": "Experiment mode is not enabled"}

    try:
        filters: Dict[str, Any] = {}
        if participant_id:
            filters["participant_id"] = participant_id

        response = db.get(ExperimentSurvey, filters=filters, return_json=True)
        return {"status": True, "data": response.data}
    except Exception as e:
        logger.warning(f"Failed to retrieve surveys: {e}")
        return {"status": False, "message": str(e)}
