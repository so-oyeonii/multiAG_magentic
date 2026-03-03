# 실험 조건 상세 설명서

## 연구 개요

**연구 제목:** 멀티에이전트 AI 시스템에 대한 사용자 수용: 에이전트 구성 및 상호작용 투명성의 효과

**소속:** 성균관대학교 인터랙션사이언스학과 (박사 연구)

**연구 목적:** AI 에이전트 시스템의 **구성 방식**(단일 vs 멀티)과 **상호작용 투명성**(블랙박스 vs 투명 vs 참여형)이 사용자 경험(사용성, 신뢰도, 투명성 인식, 통제감, 만족도)에 미치는 영향을 실증적으로 분석합니다.

**기반 시스템:** Microsoft Magentic-UI (오픈소스 멀티에이전트 웹 에이전트)

---

## 실험 설계: 2×2 요인 설계 (Between-Subjects)

본 연구는 두 가지 독립변수를 기반으로 4가지 실험 조건을 구성합니다.

### 독립변수 1: 에이전트 구성 (Agent Composition)

| 수준 | 설명 |
|---|---|
| **단일 에이전트** | 하나의 AI가 모든 작업을 처리 |
| **멀티 에이전트** | 4개의 전문 AI 에이전트가 역할을 분담하여 협력 |

### 독립변수 2: 상호작용 투명성 (Interaction Transparency)

| 수준 | 설명 |
|---|---|
| **숨김 (블랙박스)** | 내부 과정이 보이지 않고 최종 결과만 제시 |
| **노출 (투명)** | 에이전트 간 대화/작업 과정이 실시간 공개 |
| **참여형 (Co-Planning)** | 과정 공개 + 사용자가 계획 수립에 직접 참여 |

### 4가지 실험 조건 매트릭스

```
                     투명성 낮음          투명성 중간           투명성 높음
                   ┌─────────────┐  ┌─────────────────┐  ┌──────────────────┐
  단일 에이전트    │  조건 A      │  │    (해당 없음)    │  │   (해당 없음)     │
                   │  single      │  │                  │  │                   │
                   └─────────────┘  └─────────────────┘  └──────────────────┘
                   ┌─────────────┐  ┌─────────────────┐  ┌──────────────────┐
  멀티 에이전트    │  조건 B      │  │    조건 C         │  │   조건 D          │
                   │  blackbox    │  │    transparent    │  │   coplan          │
                   └─────────────┘  └─────────────────┘  └──────────────────┘
```

---

## 조건별 상세 설명

### 조건 A: 단일 에이전트 (`single_agent`)

**핵심 개념:** 사용자에게 "하나의 AI 어시스턴트"로 보이는 시스템

#### 참여자 경험
- 채팅창에 요청을 입력하면 "AI Assistant"라는 하나의 AI가 응답
- 에이전트 간 대화나 역할 분담이 보이지 않음
- 가장 단순한 인터페이스

#### 기술적 구현

| 항목 | 설정 |
|---|---|
| YAML config | `configs/condition_a_single.yaml` |
| 에이전트 수 | 1개 (WebSurfer만 활성화) |
| 팀 구성 | `RoundRobinGroupChat(participants=[web_surfer, user_proxy])` |
| 메시지 표시 | 모든 에이전트 이름을 "AI Assistant"로 통일 |
| 계획 수립 UI | 비활성화 (Co-Planning 없음) |
| 승인 버튼 | 비활성화 |
| 브라우저 뷰어 | 숨김 |

#### 백엔드 동작 (`task_team.py`)
```python
# 조건 A: WebSurfer + UserProxy만으로 팀 구성
if config.experiment_condition == "single_agent":
    team = RoundRobinGroupChat(
        participants=[web_surfer, user_proxy],
        max_turns=10000,
    )
```
Orchestrator, Coder, FileSurfer를 아예 생성하지 않고, WebSurfer만 단독 동작합니다.

#### 프론트엔드 동작 (`rendermessage.tsx`)
```typescript
// 모든 에이전트 메시지의 source를 "AI Assistant"로 교체
if (condition === "single_agent" && !isUser) {
    effectiveMessage = { ...message, source: "AI Assistant" };
}
```

#### YAML 설정
```yaml
experiment_mode: true
experiment_condition: "single_agent"
cooperative_planning: false      # 계획 수립 UI 없음
autonomous_execution: true       # 자동 실행
approval_policy: "never"         # 승인 요청 없음
websurfer_loop: true             # WebSurfer 단독 루프
```

---

### 조건 B: 멀티에이전트 블랙박스 (`multi_blackbox`)

**핵심 개념:** 4개 에이전트가 협력하지만, 사용자에게는 과정이 숨겨지고 최종 결과만 보여주는 시스템

#### 참여자 경험
- 채팅창에 요청을 입력하면 AI가 작업을 수행
- 중간 에이전트 간 대화(Orchestrator 지시, WebSurfer 보고 등)가 보이지 않음
- 최종 답변만 화면에 표시됨
- 내부적으로는 4개 에이전트가 협력하고 있으나, 사용자는 이를 인지할 수 없음

#### 기술적 구현

| 항목 | 설정 |
|---|---|
| YAML config | `configs/condition_b_blackbox.yaml` |
| 에이전트 수 | 4개 (Orchestrator + WebSurfer + Coder + FileSurfer) |
| 팀 구성 | `GroupChat` (Orchestrator가 조율) |
| 메시지 표시 | 중간 메시지 숨김, **최종 답변(final answer)만 표시** |
| 계획 수립 UI | 비활성화 |
| 승인 버튼 | 비활성화 |
| 브라우저 뷰어 | 숨김 |

#### 프론트엔드 필터링 (`rendermessage.tsx`)
```typescript
// 조건 B: 사용자 메시지와 최종 답변만 표시, 나머지 숨김
if (condition === "multi_blackbox") {
    const isUser = messageUtils.isUser(message.source);
    const isFinal = messageUtils.isFinalAnswer(message.metadata);
    if (!isUser && !isFinal) {
        return null;  // 중간 메시지 렌더링하지 않음
    }
}
```

#### YAML 설정
```yaml
experiment_mode: true
experiment_condition: "multi_blackbox"
cooperative_planning: false      # 계획 수립 UI 없음
autonomous_execution: true       # 자동 실행
approval_policy: "never"         # 승인 요청 없음
```

---

### 조건 C: 멀티에이전트 투명 (`multi_transparent`)

**핵심 개념:** 4개 에이전트의 협력 과정이 실시간으로 모두 공개되는 시스템

#### 참여자 경험
- 채팅창에 요청을 입력하면 여러 에이전트가 역할을 나누어 작업
- **Orchestrator**가 계획을 세우는 과정이 보임
- **WebSurfer**가 웹을 탐색하는 과정이 보임
- **Coder**가 코드를 작성하는 과정이 보임
- **FileSurfer**가 파일을 분석하는 과정이 보임
- 에이전트 간 대화가 실시간으로 채팅에 표시됨
- 단, 사용자가 계획을 수정하거나 개입할 수는 없음 (읽기 전용)

#### 기술적 구현

| 항목 | 설정 |
|---|---|
| YAML config | `configs/condition_c_transparent.yaml` |
| 에이전트 수 | 4개 (Orchestrator + WebSurfer + Coder + FileSurfer) |
| 팀 구성 | `GroupChat` (Orchestrator가 조율) |
| 메시지 표시 | **모든 에이전트 메시지 표시** (에이전트 이름 포함) |
| 계획 수립 UI | 표시되지만 **편집 불가** (읽기 전용) |
| 승인 버튼 | 비활성화 |
| 브라우저 뷰어 | 표시 (실시간 브라우저 화면 확인 가능) |

#### 프론트엔드 동작 (`rendermessage.tsx`)
```typescript
// 조건 C: 모든 메시지 표시하되, 계획 편집만 비활성화
const effectiveIsEditable =
    condition === "multi_transparent" ? false : isEditable;
```

#### YAML 설정
```yaml
experiment_mode: true
experiment_condition: "multi_transparent"
cooperative_planning: false      # 계획 수립 UI는 보이되, 편집 불가
autonomous_execution: true       # 자동 실행 (사용자 개입 없이)
approval_policy: "never"         # 승인 요청 없음
```

---

### 조건 D: 멀티에이전트 참여형 (`multi_coplan`)

**핵심 개념:** 4개 에이전트의 과정이 공개되고, 사용자가 계획 수립에 직접 참여하는 시스템

#### 참여자 경험
- 채팅창에 요청을 입력하면 Orchestrator가 **계획(Plan)을 제안**함
- 사용자가 계획을 **검토, 수정, 승인**할 수 있음 (Co-Planning)
- 승인된 계획에 따라 에이전트들이 작업을 수행
- 작업 중 위험한 동작(코드 실행 등)에 대해 **승인 요청**이 올 수 있음
- 모든 에이전트 간 대화가 실시간으로 표시됨
- **기본 Magentic-UI와 동일한 동작**

#### 기술적 구현

| 항목 | 설정 |
|---|---|
| YAML config | `configs/condition_d_coplan.yaml` |
| 에이전트 수 | 4개 (Orchestrator + WebSurfer + Coder + FileSurfer) |
| 팀 구성 | `GroupChat` (Orchestrator가 조율) |
| 메시지 표시 | **모든 에이전트 메시지 표시** |
| 계획 수립 UI | **활성화 (편집 가능)** — 사용자가 계획 수정/승인 |
| 승인 버튼 | **활성화** — 위험 동작 시 사용자 승인 요청 |
| 브라우저 뷰어 | 표시 |

#### 백엔드 동작 (`task_team.py`)
```python
# 조건 D: 기본 Magentic-UI 동작
if condition == "multi_coplan":
    orchestrator_config.cooperative_planning = True
    orchestrator_config.autonomous_execution = False
```

#### YAML 설정
```yaml
experiment_mode: true
experiment_condition: "multi_coplan"
cooperative_planning: true          # Co-Planning 활성화
autonomous_execution: false         # 사용자 승인 후 실행
approval_policy: "auto-conservative"  # 위험 동작 승인 요청
```

---

## 조건 간 비교 요약

| 특성 | 조건 A (단일) | 조건 B (블랙박스) | 조건 C (투명) | 조건 D (참여형) |
|---|:---:|:---:|:---:|:---:|
| **에이전트 수** | 1개 | 4개 | 4개 | 4개 |
| **에이전트 이름 표시** | "AI Assistant" | 표시 안 됨 | 개별 이름 표시 | 개별 이름 표시 |
| **중간 과정 표시** | 없음 | 숨김 | 전체 공개 | 전체 공개 |
| **계획(Plan) 표시** | 없음 | 없음 | 읽기 전용 | 편집 가능 |
| **Co-Planning** | 없음 | 없음 | 없음 | 있음 |
| **승인 요청** | 없음 | 없음 | 없음 | 있음 |
| **브라우저 뷰어** | 숨김 | 숨김 | 표시 | 표시 |
| **사용자 통제 수준** | 낮음 | 낮음 | 중간 | 높음 |
| **투명성 수준** | 낮음 | 낮음 | 높음 | 높음 |

---

## 실험 참여 플로우

각 조건에서 참여자는 동일한 플로우를 거칩니다:

```
┌─────────────────────────────────────────────────────────┐
│  1. Welcome (연구 참여 안내)                              │
│     - 연구 목적 설명                                      │
│     - 참여 방법 안내                                      │
│     - 참여자 권리 고지                                    │
│     - 참여자 ID 입력                                     │
│     - 동의서 체크                                        │
├─────────────────────────────────────────────────────────┤
│  2. Scenario (과업 안내)                                  │
│     - 배정된 AI 시스템 유형 설명 (조건별 상이)              │
│     - 과업 시나리오 제시                                   │
│     - 안내 사항                                          │
├─────────────────────────────────────────────────────────┤
│  3. Chat (과업 수행)                                      │
│     - 조건별 UI로 Magentic-UI 사용                        │
│     - 상호작용 자동 로깅                                   │
│     - 과업 완료 후 "설문 시작" 버튼 클릭                    │
├─────────────────────────────────────────────────────────┤
│  4. Survey (사후 설문)                                    │
│     - 5점 리커트 척도 설문 (14문항)                        │
│       · 시스템 사용성 (3문항)                              │
│       · 신뢰도 (3문항)                                   │
│       · 투명성 (3문항)                                   │
│       · 통제감 (3문항)                                   │
│       · 만족도 (2문항)                                   │
│     - 주관식 추가 의견 (선택)                              │
├─────────────────────────────────────────────────────────┤
│  5. Done (완료)                                          │
│     - 감사 메시지                                        │
│     - 응답 저장 확인                                     │
└─────────────────────────────────────────────────────────┘
```

---

## 종속변수 (설문 측정 항목)

| 구성개념 | 문항 수 | 측정 문항 |
|---|---|---|
| **사용성** | 3 | 시스템이 사용하기 쉬웠다 / 원하는 작업을 효과적으로 수행할 수 있었다 / 반응 속도가 적절했다 |
| **신뢰도** | 3 | 결과를 신뢰할 수 있었다 / 정확한 정보를 제공했다 / 다시 사용하고 싶다 |
| **투명성** | 3 | 어떻게 작동하는지 이해할 수 있었다 / 작업 과정을 충분히 파악할 수 있었다 / 왜 그런 결과를 냈는지 이해할 수 있었다 |
| **통제감** | 3 | 내가 통제하고 있다는 느낌이 들었다 / 행동을 예측할 수 있었다 / 동작을 수정하거나 조정할 수 있었다 |
| **만족도** | 2 | 전반적 사용 경험에 만족한다 / 과업 수행 결과에 만족한다 |

---

## 데이터 수집 체계

### 자동 수집 데이터

| 데이터 유형 | 저장 위치 | 설명 |
|---|---|---|
| 이벤트 로그 | `ExperimentLog` 테이블 | 과업 시작/종료, 메시지 전송, 계획 수정, 사용자 입력 등 |
| 설문 응답 | `ExperimentSurvey` 테이블 | 14문항 리커트 응답 + 주관식 |
| 채팅 메시지 | 기존 `Message` 테이블 | 세션 내 모든 에이전트/사용자 메시지 |

### API 엔드포인트

| 엔드포인트 | 메서드 | 용도 |
|---|---|---|
| `/experiment/config` | GET | 현재 실험 조건 조회 |
| `/experiment/log` | POST | 이벤트 로그 기록 |
| `/experiment/survey` | POST | 설문 응답 저장 |
| `/experiment/logs` | GET | 로그 조회 (연구자용) |
| `/experiment/surveys` | GET | 설문 조회 (연구자용) |

### 데이터 내보내기

```bash
# 전체 데이터 CSV 내보내기
python scripts/export_experiment_data.py

# 특정 참여자만
python scripts/export_experiment_data.py --participant P001

# 특정 조건만
python scripts/export_experiment_data.py --condition multi_transparent

# 커스텀 DB 경로와 출력 디렉토리
python scripts/export_experiment_data.py --db /path/to/db --output-dir ./results
```

생성되는 CSV 파일:
- `experiment_logs.csv` — 이벤트 로그
- `survey_responses.csv` — 설문 응답
- `messages.csv` — 채팅 메시지
- `participant_summary.csv` — 참여자별 요약 통계

---

## 실험 실행 방법

### 조건별 서버 실행

```bash
# 조건 A: 단일 에이전트
magentic-ui --port 8081 --config configs/condition_a_single.yaml

# 조건 B: 멀티에이전트 블랙박스
magentic-ui --port 8081 --config configs/condition_b_blackbox.yaml

# 조건 C: 멀티에이전트 투명
magentic-ui --port 8081 --config configs/condition_c_transparent.yaml

# 조건 D: 멀티에이전트 참여형 (Co-Planning)
magentic-ui --port 8081 --config configs/condition_d_coplan.yaml
```

### 기본 모드 (실험 아닌 일반 사용)

```bash
# experiment_mode=false (기본값) → 원본 Magentic-UI와 동일 동작
magentic-ui --port 8081
```

---

## 파일 구조 (실험 관련)

```
magentic-ui/
├── configs/                                    # 실험 조건별 YAML 설정
│   ├── condition_a_single.yaml
│   ├── condition_b_blackbox.yaml
│   ├── condition_c_transparent.yaml
│   └── condition_d_coplan.yaml
│
├── src/magentic_ui/
│   ├── magentic_ui_config.py                   # experiment_* 필드 정의
│   ├── task_team.py                            # 조건별 팀 구성 분기
│   ├── experiment_logger.py                    # 이벤트 로깅 유틸리티
│   └── backend/
│       ├── datamodel/db.py                     # ExperimentLog, ExperimentSurvey 테이블
│       └── web/
│           ├── app.py                          # experiment 라우터 등록
│           └── routes/experiment.py            # 실험 API 엔드포인트
│
├── frontend/src/
│   ├── experiment/                             # 실험 전용 컴포넌트
│   │   ├── ExperimentWelcome.tsx               # 동의서 + 참여자 ID
│   │   ├── ExperimentScenario.tsx              # 과업 안내 (조건별 설명)
│   │   ├── ExperimentSurvey.tsx                # 사후 설문 (5점 리커트)
│   │   └── AgentTeamPanel.tsx                  # 에이전트 팀 표시
│   ├── hooks/useExperimentStore.ts             # 실험 상태 관리 (Zustand)
│   └── components/views/chat/
│       ├── rendermessage.tsx                   # 조건별 메시지 필터링/이름 변경
│       └── runview.tsx                         # 조건별 UI 요소 숨김
│
└── scripts/
    └── export_experiment_data.py               # CSV 내보내기 스크립트
```

---

## 안전장치

1. **기본 동작 보존:** `experiment_mode: false` (기본값)일 때 원본 Magentic-UI와 100% 동일하게 동작
2. **조건 분기 격리:** 모든 실험 코드는 `if (experiment_mode)` 또는 `if (condition !== "default")` 조건 안에서만 실행
3. **로깅 실패 안전:** 실험 로깅 실패 시 메인 기능에 영향 없음 (try-except 처리)
4. **개인정보 보호:** 참여자 ID만 수집하며 개인 식별 정보 미수집
