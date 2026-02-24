# CLAUDE.md — Magentic-UI 연구용 자극물 개발 작업 지시서

## 프로젝트 개요

Microsoft Magentic-UI(오픈소스 멀티에이전트 웹 에이전트)를 수정하여, 멀티에이전트 vs 단일에이전트 비교 실험용 자극물을 만드는 프로젝트입니다. 성균관대학교 인터랙션사이언스학과 박사 연구에 사용됩니다.

* 원본 레포: https://github.com/microsoft/magentic-ui
* 라이선스: MIT
* 기반 프레임워크: AutoGen AgentChat 0.5.7
* 기술 스택: Python(FastAPI) + React(Gatsby) + Docker + SQLite + Playwright

## 연구 목적

"멀티에이전트 AI 시스템에 대한 사용자 수용: 에이전트 구성 및 상호작용 투명성의 효과"

참여자가 Magentic-UI를 직접 사용하는 실험에서, 4가지 실험 조건을 YAML config 전환으로 제어할 수 있도록 시스템을 수정합니다.

## 4가지 실험 조건

| 조건 이름 | 에이전트 수 | 과정 노출 | Co-Planning |
|---|---|---|---|
| A 단일에이전트 | 1개 (WebSurfer만) | 없음 | 없음 |
| B 멀티-블랙박스 | 4개 | 숨김 (결과만) | 없음 |
| C 멀티-투명 | 4개 | 전체 노출 | 없음 |
| D 멀티-참여형 | 4개 | 전체 노출 | 있음 |

## 코드베이스 구조 (수정 대상 파일 중심)

```
magentic-ui/
├── src/magentic_ui/
│   ├── magentic_ui_config.py      ← ⭐ 실험 조건 필드 추가
│   ├── task_team.py               ← ⭐ 조건별 팀 구성 분기
│   ├── approval_guard.py          ← Action Guard 로직
│   ├── experiment_logger.py       ← 🆕 신규 생성 (로그 수집)
│   ├── agents/
│   │   ├── _coder.py              ← Coder Agent
│   │   ├── _user_proxy.py         ← User Proxy
│   │   ├── web_surfer/            ← Web Surfer Agent
│   │   ├── file_surfer/           ← File Surfer Agent
│   │   └── mcp/                   ← MCP Agent
│   ├── teams/
│   │   └── orchestrator/
│   │       ├── _orchestrator.py   ← 오케스트레이터 (75KB, 핵심)
│   │       ├── _prompts.py        ← 에이전트 프롬프트
│   │       └── _group_chat.py     ← 그룹 채팅
│   └── backend/
│       ├── datamodel/
│       │   └── db.py              ← ⭐ 실험 DB 테이블 추가
│       └── web/
│           ├── app.py             ← FastAPI 앱
│           ├── routes/            ← API 엔드포인트
│           │   └── experiment.py  ← 🆕 실험용 API 라우트
│           └── managers/
│               └── connection.py  ← WebSocket 연결 (로깅 연동)
│
├── frontend/src/
│   ├── components/views/
│   │   ├── chat/
│   │   │   ├── chat.tsx              ← 메인 채팅 UI
│   │   │   ├── rendermessage.tsx     ← ⭐ 에이전트 이름 조건부 표시
│   │   │   ├── runview.tsx           ← ⭐ 블랙박스 메시지 필터링
│   │   │   ├── plan.tsx              ← Co-Planning UI
│   │   │   ├── approval_buttons.tsx  ← 승인 버튼
│   │   │   ├── sampletasks.tsx       ← ⭐ 실험 시나리오로 교체
│   │   │   └── progressbar.tsx       ← 진행 바
│   │   ├── manager.tsx               ← 상태 관리
│   │   └── sidebar.tsx               ← 사이드바
│   ├── experiment/                    ← 🆕 실험 전용 컴포넌트 폴더
│   │   ├── ExperimentWelcome.tsx      ← 동의서 + 참여자 ID
│   │   ├── ExperimentSurvey.tsx       ← 실험 후 설문
│   │   ├── ExperimentScenario.tsx     ← 과업 시나리오 안내
│   │   └── AgentTeamPanel.tsx         ← 에이전트 팀 표시 패널
│   └── hooks/
│       └── store.tsx                  ← 상태 관리
│
├── configs/                           ← 🆕 실험 조건별 설정
│   ├── condition_a_single.yaml
│   ├── condition_b_blackbox.yaml
│   ├── condition_c_transparent.yaml
│   └── condition_d_coplan.yaml
│
└── scripts/                           ← 🆕 유틸리티
    └── export_experiment_data.py      ← 데이터 CSV 내보내기
```

## 작업 순서

아래 Phase 순서대로 진행합니다. 각 Phase가 완료된 후 다음으로 넘어갑니다.

### Phase 1: 백엔드 — 실험 조건 인프라

**목표:** config로 실험 조건을 전환할 수 있는 백엔드 구조 만들기

#### 1-1. magentic_ui_config.py 수정

MagenticUIConfig 클래스에 실험 관련 필드를 추가합니다.

**위치:** `src/magentic_ui/magentic_ui_config.py`

추가할 필드들 (기존 필드 아래에):

```python
# === 연구 실험 설정 ===
experiment_condition: Literal[
    "single_agent",       # 조건 A: 단일 에이전트
    "multi_blackbox",     # 조건 B: 멀티 에이전트, 과정 숨김
    "multi_transparent",  # 조건 C: 멀티 에이전트, 과정 노출
    "multi_coplan",       # 조건 D: 멀티 에이전트, Co-Planning
    "default",            # 기본 모드 (연구 모드 아님)
] = "default"

participant_id: Optional[str] = None
experiment_task_scenario: Optional[str] = None
experiment_mode: bool = False  # True이면 연구 UI 활성화
```

**중요:** 기존 필드와 기본 동작은 절대 변경하지 마세요. `experiment_mode: False`일 때 원본 Magentic-UI와 동일하게 동작해야 합니다.

#### 1-2. task_team.py 수정

`get_task_team()` 함수에 실험 조건별 분기를 추가합니다.

**위치:** `src/magentic_ui/task_team.py`

**수정 전략:**
* 함수의 마지막 부분 (line 249~266)에서 team_participants 구성 직전에 조건 분기 추가
* `experiment_condition == "single_agent"`일 때: websurfer_loop=True와 유사하게 WebSurfer + UserProxy만으로 RoundRobinGroupChat 반환
* `experiment_condition == "multi_blackbox"`: 일반 GroupChat과 동일하되, config에 블랙박스 플래그를 전달 (프론트엔드에서 처리)
* `experiment_condition == "multi_transparent"`: cooperative_planning=False, autonomous_execution=True
* `experiment_condition == "multi_coplan"`: 기본 Magentic-UI 동작 (cooperative_planning=True)

**핵심 원칙:** 백엔드에서는 팀 구성만 다르게 하고, 메시지 표시/숨김은 프론트엔드에서 처리합니다.

#### 1-3. 4개 조건별 YAML config 생성

**위치:** `configs/` 디렉토리 신규 생성

**condition_a_single.yaml:**
```yaml
experiment_mode: true
experiment_condition: "single_agent"
cooperative_planning: false
autonomous_execution: true
approval_policy: "never"
websurfer_loop: true
```

**condition_b_blackbox.yaml:**
```yaml
experiment_mode: true
experiment_condition: "multi_blackbox"
cooperative_planning: false
autonomous_execution: true
approval_policy: "never"
```

**condition_c_transparent.yaml:**
```yaml
experiment_mode: true
experiment_condition: "multi_transparent"
cooperative_planning: false
autonomous_execution: true
approval_policy: "never"
```

**condition_d_coplan.yaml:**
```yaml
experiment_mode: true
experiment_condition: "multi_coplan"
cooperative_planning: true
autonomous_execution: false
approval_policy: "auto-conservative"
```

### Phase 2: 백엔드 — 데이터 수집 인프라

**목표:** 참여자의 상호작용을 자동으로 기록하는 시스템 구축

*(Phase 2~5 세부 내용은 Phase 1 완료 후 진행)*

### Phase 3: 프론트엔드 — 조건별 UI 분기

### Phase 4: 프론트엔드 — 실험 참여 플로우

### Phase 5: 데이터 내보내기 스크립트

## 코딩 규칙

1. 기존 코드 동작을 절대 깨뜨리지 마세요. `experiment_mode=False`일 때 원본 Magentic-UI와 100% 동일하게 동작해야 합니다.
2. 모든 실험 관련 코드는 조건 체크로 감싸세요. `if config.experiment_mode:` 또는 `if condition !== "default":`
3. Python 코드 스타일: 기존 코드베이스를 따릅니다 (Pydantic BaseModel, async/await, type hints, SQLModel).
4. 프론트엔드 스타일: 기존 Tailwind CSS 클래스를 사용합니다. 새 CSS 파일을 만들지 마세요.
5. 에러 핸들링: 실험 로깅 실패가 메인 기능을 중단시키면 안 됩니다. try-except로 감싸고 조용히 실패하세요.
6. 한글 UI 텍스트: 실험 참여자용 화면(Welcome, Scenario, Survey)은 한국어로 작성합니다.
7. 커밋 메시지: `[experiment]` 프리픽스를 붙입니다. 예: `[experiment] Add experiment condition field to config`

## 테스트 체크리스트

### Phase 1 완료 후
* [ ] `magentic-ui --port 8081` (기본 모드) 정상 동작
* [ ] `magentic-ui --port 8081 --config configs/condition_a_single.yaml` 실행 가능
* [ ] 조건 A에서 WebSurfer만 동작하는지 확인
* [ ] 조건 D에서 기본 Magentic-UI와 동일하게 동작하는지 확인

### Phase 2 완료 후
* [ ] ExperimentLog 테이블 생성됨 (DB 확인)
* [ ] `/api/experiment/config` 엔드포인트가 현재 조건 반환
* [ ] `/api/experiment/log` 엔드포인트로 이벤트 기록 가능
* [ ] `experiment_mode=False`일 때 로깅이 일어나지 않음

### Phase 3 완료 후
* [ ] 조건 A: 모든 메시지가 "AI Assistant"로 표시됨
* [ ] 조건 B: 중간 에이전트 메시지가 숨겨지고 최종 답변만 표시됨
* [ ] 조건 C: 모든 에이전트 메시지가 보이되, Co-Planning UI는 숨겨짐
* [ ] 조건 D: 기본 Magentic-UI와 동일한 UI

### Phase 4 완료 후
* [ ] 실험 시작 → 동의서 → 시나리오 → 채팅 → 설문 전체 플로우 동작
* [ ] 설문 응답이 DB에 저장됨
* [ ] 데이터 내보내기 CSV 생성 가능

## 의존성 참고

기존 Magentic-UI 의존성 외에 추가로 필요한 것은 없습니다. 모든 구현은 기존 스택(FastAPI, SQLModel, React, Tailwind) 안에서 합니다.
