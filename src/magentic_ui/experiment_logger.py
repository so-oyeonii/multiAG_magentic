"""
Experiment Logger — 실험 참여자 상호작용 자동 기록 모듈

experiment_mode=True일 때만 동작합니다.
로깅 실패가 메인 기능을 중단시키지 않도록 모든 기록은 try-except로 감싸여 있습니다.
"""

import logging
from datetime import datetime
from typing import Any, Dict, Optional

from .backend.datamodel import ExperimentLog, ExperimentSurvey

logger = logging.getLogger(__name__)


class ExperimentLogger:
    """
    Handles experiment event logging to the database.
    Only logs when experiment_mode is enabled.
    """

    def __init__(
        self,
        db_manager: Any,
        experiment_mode: bool = False,
        experiment_condition: str = "default",
        participant_id: Optional[str] = None,
    ):
        self.db_manager = db_manager
        self.experiment_mode = experiment_mode
        self.experiment_condition = experiment_condition
        self.participant_id = participant_id

    def log_event(
        self,
        event_type: str,
        event_data: Optional[Dict[str, Any]] = None,
        session_id: Optional[int] = None,
        run_id: Optional[int] = None,
    ) -> None:
        """
        Record an experiment event to the database.

        Args:
            event_type: Type of event (e.g. "task_start", "task_end", "message_sent")
            event_data: Additional data about the event
            session_id: Associated session ID
            run_id: Associated run ID
        """
        if not self.experiment_mode:
            return

        try:
            log_entry = ExperimentLog(
                created_at=datetime.now(),
                participant_id=self.participant_id,
                session_id=session_id,
                run_id=run_id,
                experiment_condition=self.experiment_condition,
                event_type=event_type,
                event_data=event_data or {},
            )
            self.db_manager.upsert(log_entry)
        except Exception as e:
            logger.warning(f"Failed to log experiment event '{event_type}': {e}")

    def log_task_start(
        self,
        session_id: int,
        run_id: int,
        task_content: str,
    ) -> None:
        """Log the start of a task execution"""
        self.log_event(
            event_type="task_start",
            event_data={"task": task_content},
            session_id=session_id,
            run_id=run_id,
        )

    def log_task_end(
        self,
        session_id: int,
        run_id: int,
        status: str,
        duration: Optional[float] = None,
    ) -> None:
        """Log the end of a task execution"""
        self.log_event(
            event_type="task_end",
            event_data={"status": status, "duration": duration},
            session_id=session_id,
            run_id=run_id,
        )

    def log_message(
        self,
        session_id: int,
        run_id: int,
        source: str,
        message_type: str,
    ) -> None:
        """Log a message event (sent/received)"""
        self.log_event(
            event_type="message",
            event_data={"source": source, "message_type": message_type},
            session_id=session_id,
            run_id=run_id,
        )

    def log_plan_event(
        self,
        session_id: int,
        run_id: int,
        action: str,
        plan_data: Optional[Dict[str, Any]] = None,
    ) -> None:
        """Log a planning event (plan_proposed, plan_approved, plan_modified)"""
        self.log_event(
            event_type=f"plan_{action}",
            event_data=plan_data or {},
            session_id=session_id,
            run_id=run_id,
        )

    def log_user_input(
        self,
        session_id: int,
        run_id: int,
        input_type: str,
        response: str,
    ) -> None:
        """Log user input/approval events"""
        self.log_event(
            event_type="user_input",
            event_data={"input_type": input_type, "response": response},
            session_id=session_id,
            run_id=run_id,
        )

    def save_survey(
        self,
        session_id: Optional[int],
        responses: Dict[str, Any],
    ) -> bool:
        """
        Save a post-experiment survey response.

        Returns:
            True if saved successfully, False otherwise
        """
        if not self.experiment_mode:
            return False

        try:
            survey = ExperimentSurvey(
                created_at=datetime.now(),
                participant_id=self.participant_id,
                experiment_condition=self.experiment_condition,
                session_id=session_id,
                responses=responses,
            )
            result = self.db_manager.upsert(survey)
            return result.status
        except Exception as e:
            logger.warning(f"Failed to save survey response: {e}")
            return False
