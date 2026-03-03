# Magentic-UI 에이전트 구성 및 조건별 차이 가이드

## 목차

1. [에이전트 전체 구성도](#1-에이전트-전체-구성도)
2. [각 에이전트 상세 설명](#2-각-에이전트-상세-설명)
3. [실험 조건별 에이전트 차이](#3-실험-조건별-에이전트-차이)
4. [사용자에게 에이전트가 어떻게 보이는가](#4-사용자에게-에이전트가-어떻게-보이는가)
5. [코드에서 확인하는 방법](#5-코드에서-확인하는-방법)

---

## 1. 에이전트 전체 구성도

Magentic-UI는 기본적으로 **5개의 에이전트**가 협력하는 멀티에이전트 시스템입니다.

```
                          사용자 (브라우저)
                              │
                              ▼
                     ┌─────────────────┐
                     │   UserProxy     │  ← 사용자의 대리인
                     │   (중계 역할)    │
                     └────────┬────────┘
                              │
                              ▼
                   ┌─────────────────────┐
                   │    Orchestrator     │  ← 총괄 지휘자
                   │  (계획 수립 & 조율)  │
                   └──┬──────┬───────┬──┘
                      │      │       │
              ┌───────┘      │       └───────┐
              ▼              ▼               ▼
     ┌──────────────┐ ┌───────────┐ ┌──────────────┐
     │  WebSurfer   │ │  Coder    │ │ FileSurfer   │
     │ (웹 탐색)    │ │ (코드)    │ │ (파일 분석)   │
     └──────────────┘ └───────────┘ └──────────────┘
```

---

## 2. 각 에이전트 상세 설명

### 2-1. Orchestrator (오케스트레이터) — 총괄 지휘자

| 항목 | 내용 |
|---|---|
| **클래스** | `Orchestrator` |
| **파일 위치** | `src/magentic_ui/teams/orchestrator/_orchestrator.py` |
| **채팅에서 이름** | `Orchestrator` |
| **실행 환경** | Docker / 로컬 모두 가능 |

**역할:**
- 사용자의 요청을 받아 **작업 계획(Plan)을 수립**
- 어떤 에이전트가 어떤 순서로 작업할지 **조율**
- 두 가지 모드를 관리:
  - **Planning Mode**: 계획을 세우고 사용자에게 보여줌
  - **Execution Mode**: 계획에 따라 에이전트들에게 작업을 배분

**사용자에게 보이는 행동:**
- "다음 단계를 실행합니다" 같은 진행 메시지 표시
- Co-Planning 모드(조건 D)에서는 계획을 제안하고 사용자 승인을 기다림
- 최종 답변을 종합하여 전달

**핵심 메서드:**
```
_orchestrate_step_planning()  → 계획 수립
_orchestrate_step_execution() → 단계별 실행
_request_next_speaker()       → 다음 에이전트 선택
handle_agent_response()       → 에이전트 응답 처리
```

---

### 2-2. WebSurfer (웹서퍼) — 웹 탐색 전문가

| 항목 | 내용 |
|---|---|
| **클래스** | `WebSurfer` |
| **파일 위치** | `src/magentic_ui/agents/web_surfer/_web_surfer.py` |
| **채팅에서 이름** | `web_surfer` |
| **실행 환경** | Docker (VNC 브라우저) 또는 로컬 (Playwright) |

**역할:**
- **웹 브라우저를 자동으로 조작**하여 정보를 검색하고 웹사이트와 상호작용
- Playwright 라이브러리로 실제 브라우저를 제어

**사용 가능한 도구 (Tools):**

| 도구 | 설명 |
|---|---|
| `visit_url` | URL로 직접 이동 |
| `web_search` | 웹 검색 (DuckDuckGo, Google 등) |
| `click` | 버튼/링크 클릭 |
| `type` | 텍스트 입력 (폼, 검색창 등) |
| `scroll_up` / `scroll_down` | 페이지 스크롤 |
| `hover` | 마우스 호버 |
| `select_option` | 드롭다운 메뉴 선택 |
| `read_page_and_answer` | 페이지 내용 읽고 질문에 답변 |
| `create_tab` / `switch_tab` | 브라우저 탭 관리 |
| `keypress` | 키보드 입력 시뮬레이션 |
| `refresh_page` | 페이지 새로고침 |
| `history_back` | 뒤로 가기 |

**사용자에게 보이는 행동:**
- "네이버에서 '날씨'를 검색합니다" 같은 행동 설명
- 브라우저 스크린샷이 실시간으로 표시됨 (조건 C, D)
- 웹 페이지 탐색 과정이 채팅에 메시지로 나타남

---

### 2-3. Coder (코더) — 코드 실행 전문가

| 항목 | 내용 |
|---|---|
| **클래스** | `CoderAgent` |
| **파일 위치** | `src/magentic_ui/agents/_coder.py` |
| **채팅에서 이름** | `coder_agent` |
| **실행 환경** | 기본 Docker / 선택적 로컬 |

**역할:**
- **Python 또는 Shell 코드를 작성하고 실행**
- 데이터 분석, 파일 처리, 계산 등 코드가 필요한 작업 수행
- 코드 오류 시 자동으로 디버깅 (최대 3회 재시도)

**사용 가능한 라이브러리:**
- numpy, pandas, scikit-learn (데이터 분석)
- matplotlib, pillow (시각화/이미지)
- requests, beautifulsoup4 (웹 크롤링)
- 기본 Python 표준 라이브러리

**사용자에게 보이는 행동:**
- 코드 블록이 채팅에 표시됨
- 실행 결과(출력, 에러)가 표시됨
- "코드를 실행합니다" 같은 진행 메시지

**코드 실행 흐름:**
```
1. Orchestrator가 Coder에게 작업 지시
2. Coder가 Python/Shell 코드 생성
3. Docker 컨테이너(또는 로컬)에서 코드 실행
4. 실행 결과 반환
5. 에러 시 → 디버깅 후 재실행 (최대 3회)
```

---

### 2-4. FileSurfer (파일서퍼) — 파일 분석 전문가

| 항목 | 내용 |
|---|---|
| **클래스** | `FileSurfer` |
| **파일 위치** | `src/magentic_ui/agents/file_surfer/_file_surfer.py` |
| **채팅에서 이름** | `file_surfer` |
| **실행 환경** | 기본 Docker / 선택적 로컬 |

**역할:**
- **로컬 파일을 읽고 분석** (수정은 불가 → Coder가 담당)
- 다양한 파일 형식을 텍스트로 변환하여 분석
- 디렉토리 탐색 및 파일 검색

**사용 가능한 도구 (Tools):**

| 도구 | 설명 |
|---|---|
| `open_path` | 파일 또는 디렉토리 열기 |
| `list_current_directory` | 현재 디렉토리 파일 목록 |
| `page_up` / `page_down` | 파일 내용 스크롤 |
| `find_on_page_ctrl_f` | 파일 내 텍스트 검색 |
| `find_file` | 파일명/패턴으로 파일 검색 |

**지원 파일 형식:**
- 텍스트 (`.txt`, `.md`, `.py`, `.json`, `.csv` 등)
- 오디오 (텍스트로 전사)
- 코드 파일
- Markitdown 라이브러리로 변환 가능한 모든 형식

**사용자에게 보이는 행동:**
- "파일을 열어 내용을 확인합니다" 같은 행동 설명
- 파일 내용이 채팅에 일부 표시됨
- 디렉토리 목록이 표시됨

---

### 2-5. UserProxy (유저프록시) — 사용자 대리인

| 항목 | 내용 |
|---|---|
| **클래스** | `UserProxyAgent` / `DummyUserProxy` / `MetadataUserProxy` |
| **파일 위치** | `src/magentic_ui/agents/_user_proxy.py`, `src/magentic_ui/agents/users/` |
| **채팅에서 이름** | `user_proxy` 또는 `user` |
| **실행 환경** | 로컬 (Docker 불필요) |

**역할:**
- 사용자의 입력을 에이전트 팀에 **중계**
- 에이전트들이 사용자에게 질문할 때 **사용자 응답을 전달**
- CAPTCHA 등 사람만 할 수 있는 작업 시 사용자에게 요청

**세 가지 구현체:**

| 구현체 | 용도 |
|---|---|
| `UserProxyAgent` | 실제 사용자 입력을 받아 전달 (프로덕션) |
| `DummyUserProxy` | 모든 요청을 자동 수락 (테스트용) |
| `MetadataUserProxy` | 과업 힌트/답을 자동 제공 (평가용) |

**사용자에게 보이는 행동:**
- 사용자의 메시지가 오른쪽에 표시됨
- 에이전트가 추가 정보를 요청하면 입력 프롬프트 표시
- 승인 요청 시 "승인/거부" 버튼 표시 (조건 D)

---

### 2-6. MCP Agent (선택적) — 확장 도구 에이전트

| 항목 | 내용 |
|---|---|
| **클래스** | `McpAgent` |
| **파일 위치** | `src/magentic_ui/agents/mcp/_agent.py` |
| **채팅에서 이름** | 설정에 따라 다름 |
| **실행 환경** | MCP 서버에 따라 다름 |

**역할:**
- **MCP(Model Context Protocol) 서버의 도구를 호출**하는 범용 에이전트
- 내장 에이전트 외 추가 기능이 필요할 때 확장 가능
- 여러 MCP 서버를 동시에 연결 가능

> 기본 실험 환경에서는 MCP Agent를 사용하지 않습니다.

---

## 3. 실험 조건별 에이전트 차이

### 3-1. 활성화되는 에이전트

| 에이전트 | 조건 A (단일) | 조건 B (블랙박스) | 조건 C (투명) | 조건 D (참여형) |
|---|:---:|:---:|:---:|:---:|
| **Orchestrator** | - | O | O | O |
| **WebSurfer** | O | O | O | O |
| **Coder** | - | O | O | O |
| **FileSurfer** | - | O | O | O |
| **UserProxy** | O | O | O | O |

- **조건 A**만 WebSurfer + UserProxy 2개로 동작
- **조건 B, C, D**는 모두 동일한 4개 에이전트 팀 (+ UserProxy)

### 3-2. 사용자에게 보이는 차이

```
조건 A: 단일 에이전트
┌──────────────────────────────────┐
│  사용자: "날씨 알려줘"             │
│                                  │
│  AI Assistant: 네이버에서 날씨를   │
│  검색하겠습니다...                 │
│                                  │
│  AI Assistant: 서울 현재 기온은    │
│  5도이며...                       │
└──────────────────────────────────┘
→ 에이전트가 1개인 것처럼 보임
→ 모든 메시지가 "AI Assistant"로 표시
→ 브라우저 뷰어 숨김
```

```
조건 B: 멀티에이전트 블랙박스
┌──────────────────────────────────┐
│  사용자: "날씨 알려줘"             │
│                                  │
│  (내부에서 Orchestrator 계획 수립) │  ← 숨김
│  (WebSurfer가 웹 탐색)            │  ← 숨김
│  (Orchestrator가 결과 종합)       │  ← 숨김
│                                  │
│  Orchestrator: 서울 현재 기온은   │  ← 최종 답변만 표시
│  5도이며...                       │
└──────────────────────────────────┘
→ 4개 에이전트가 일하지만 과정은 안 보임
→ 최종 결과만 표시
→ 브라우저 뷰어 숨김
```

```
조건 C: 멀티에이전트 투명
┌──────────────────────────────────┐
│  사용자: "날씨 알려줘"             │
│                                  │
│  Orchestrator: 계획을 수립합니다.  │  ← 보임
│  1단계: WebSurfer가 날씨 검색     │
│                                  │
│  WebSurfer: 네이버에서 날씨를      │  ← 보임
│  검색합니다...                    │
│  [🖥 브라우저 스크린샷]            │  ← 보임
│                                  │
│  Orchestrator: 서울 현재 기온은   │  ← 보임
│  5도이며...                       │
└──────────────────────────────────┘
→ 모든 에이전트의 작업 과정이 실시간 표시
→ 에이전트 이름이 각각 다르게 표시
→ 계획은 보이지만 수정 불가 (읽기 전용)
→ 브라우저 뷰어 표시
```

```
조건 D: 멀티에이전트 참여형 (Co-Planning)
┌──────────────────────────────────┐
│  사용자: "날씨 알려줘"             │
│                                  │
│  Orchestrator: 다음 계획을         │  ← 보임
│  제안합니다:                       │
│  ┌────────────────────────────┐  │
│  │ 계획 (편집 가능)             │  │  ← 사용자가 수정 가능
│  │ 1. 네이버 날씨 검색          │  │
│  │ 2. 결과 요약               │  │
│  │ [승인] [수정] [거부]        │  │
│  └────────────────────────────┘  │
│                                  │
│  WebSurfer: 네이버에서 날씨를      │  ← 보임
│  검색합니다...                    │
│  [🖥 브라우저 스크린샷]            │  ← 보임
│                                  │
│  ⚠️ 코드를 실행하려 합니다.        │  ← 승인 요청
│  [승인] [거부]                    │
│                                  │
│  Orchestrator: 서울 현재 기온은   │
│  5도이며...                       │
└──────────────────────────────────┘
→ 조건 C의 모든 투명성 + 사용자 참여
→ 계획 수정/승인 가능
→ 위험 동작 시 승인 요청 표시
```

### 3-3. 조건별 설정 비교표

| 설정 항목 | 조건 A | 조건 B | 조건 C | 조건 D |
|---|:---:|:---:|:---:|:---:|
| `cooperative_planning` | `false` | `false` | `false` | `true` |
| `autonomous_execution` | `true` | `true` | `true` | `false` |
| `approval_policy` | `never` | `never` | `never` | `auto-conservative` |
| `websurfer_loop` | `true` | - | - | - |
| 팀 구성 방식 | `RoundRobinGroupChat` | `GroupChat` | `GroupChat` | `GroupChat` |

---

## 4. 사용자에게 에이전트가 어떻게 보이는가

### 4-1. 에이전트 이름 표시 규칙

| 조건 | 에이전트 이름 표시 | 사용자가 인식하는 구조 |
|---|---|---|
| **조건 A** | 모두 "AI Assistant"로 통일 | "AI 1개가 일하고 있구나" |
| **조건 B** | 이름 자체가 안 보임 (메시지 숨김) | "AI가 뭔가 하는데 결과만 보이네" |
| **조건 C** | Orchestrator, WebSurfer, Coder, FileSurfer 각각 표시 | "여러 AI가 역할을 나눠서 일하는구나" |
| **조건 D** | 조건 C와 동일 + 계획/승인 UI | "여러 AI가 일하고 내가 참여할 수 있구나" |

### 4-2. 시나리오 안내에서의 설명

참여자는 과업 시작 전 **ExperimentScenario 화면**에서 자신에게 배정된 시스템 설명을 봅니다:

| 조건 | 시스템 이름 | 설명 문구 |
|---|---|---|
| A | "AI 어시스턴트" | "하나의 AI 어시스턴트가 과업을 수행합니다." |
| B | "AI 에이전트 팀" | "여러 AI 에이전트가 협력하여 과업을 수행합니다. 최종 결과가 표시됩니다." |
| C | "AI 에이전트 팀 (과정 공개)" | "여러 AI 에이전트가 협력하여 과업을 수행합니다. 에이전트들의 작업 과정을 실시간으로 확인할 수 있습니다." |
| D | "AI 에이전트 팀 (참여형)" | "여러 AI 에이전트가 협력하여 과업을 수행합니다. 에이전트들의 작업 과정을 확인하고, 계획 수립에 직접 참여할 수 있습니다." |

### 4-3. AgentTeamPanel 컴포넌트

조건 A에서는:
```
🤖 AI Assistant — 웹 브라우저를 사용해 과업을 수행합니다.
```

조건 B, C, D에서는:
```
🎯 Orchestrator — 전체 작업을 계획하고 조율합니다.
🌐 WebSurfer   — 웹 브라우저를 사용해 정보를 검색합니다.
💻 Coder       — 코드를 작성하고 실행합니다.
📁 FileSurfer  — 파일을 탐색하고 관리합니다.
```

---

## 5. 코드에서 확인하는 방법

### 5-1. 에이전트 이름이 바뀌는 곳

**파일:** `frontend/src/components/views/chat/rendermessage.tsx` (약 773~777행)

```typescript
// 조건 A: 모든 에이전트 메시지의 source를 "AI Assistant"로 교체
const effectiveMessage =
  isExperimentMode && condition === "single_agent" && !messageUtils.isUser(message.source)
    ? { ...message, source: "AI Assistant" }
    : message;
```

→ 조건 A에서만 에이전트 이름이 "AI Assistant"로 통일됩니다.

### 5-2. 메시지가 숨겨지는 곳

**파일:** `frontend/src/components/views/chat/rendermessage.tsx` (약 708~715행)

```typescript
// 조건 B: 사용자 메시지와 최종 답변만 표시
if (isExperimentMode && condition === "multi_blackbox") {
  const isUser = messageUtils.isUser(message.source);
  const isFinal = messageUtils.isFinalAnswer(message.metadata);
  if (!isUser && !isFinal) {
    return null;  // 중간 메시지 렌더링하지 않음
  }
}
```

→ 조건 B에서 중간 에이전트 메시지가 필터링됩니다.

### 5-3. 브라우저 뷰어/승인 버튼 숨김

**파일:** `frontend/src/components/views/chat/runview.tsx` (약 76~77행)

```typescript
// 브라우저 뷰어 숨김 (조건 A, B)
const hideDetailViewer = isExperimentMode &&
  (expCondition === "multi_blackbox" || expCondition === "single_agent");

// 승인 버튼 숨김 (조건 A, B, C — 조건 D만 표시)
const hideApprovalButtons = isExperimentMode && expCondition !== "multi_coplan";
```

### 5-4. 계획 편집 비활성화

**파일:** `frontend/src/components/views/chat/rendermessage.tsx` (약 793~796행)

```typescript
// 조건 A, B, C: 계획 편집 불가 (읽기 전용)
const effectiveIsEditable =
  isExperimentMode && (condition === "multi_transparent" || condition === "multi_blackbox" || condition === "single_agent")
    ? false
    : isEditable;
```

→ 조건 D만 계획 편집이 가능합니다.

### 5-5. 팀 구성 분기

**파일:** `src/magentic_ui/task_team.py` (약 210~286행)

```python
# 조건 A: WebSurfer + UserProxy만
if config.experiment_condition == "single_agent":
    team = RoundRobinGroupChat(
        participants=[web_surfer, user_proxy],
    )

# 조건 B, C, D: 전체 에이전트 팀
team_participants = [web_surfer, user_proxy, coder_agent, file_surfer]
team = GroupChat(
    participants=team_participants,
    orchestrator_config=orchestrator_config,
)
```

### 5-6. 시나리오 안내 화면

**파일:** `frontend/src/experiment/ExperimentScenario.tsx` (약 9~29행)

→ `CONDITION_DESCRIPTIONS` 객체에서 조건별 시스템 설명을 정의합니다.

### 5-7. 에이전트 팀 패널

**파일:** `frontend/src/experiment/AgentTeamPanel.tsx`

→ 조건 A는 `SINGLE_AGENT` 배열, 조건 B/C/D는 `MULTI_AGENTS` 배열을 사용합니다.

---

## 부록: 에이전트 메시지 흐름 예시

사용자가 "서울 날씨 알려줘"라고 입력했을 때의 내부 메시지 흐름:

```
[1] user_proxy → Orchestrator
    "서울 날씨 알려줘"

[2] Orchestrator → (계획 수립)
    Plan: [
      Step 1: web_surfer가 네이버 날씨 검색
      Step 2: web_surfer가 결과 읽기
      Step 3: 결과 요약하여 답변
    ]

[3] Orchestrator → web_surfer
    "네이버에서 서울 날씨를 검색해주세요"

[4] web_surfer → (Playwright 브라우저 조작)
    visit_url("https://search.naver.com/...")
    → 스크린샷 캡처
    read_page_and_answer("현재 날씨 정보를 알려주세요")

[5] web_surfer → Orchestrator
    "서울 현재 기온 5°C, 흐림, 미세먼지 보통..."

[6] Orchestrator → user_proxy (최종 답변)
    "서울의 현재 날씨입니다:
     기온: 5°C
     날씨: 흐림
     미세먼지: 보통"
```

**조건별로 사용자에게 보이는 단계:**
- **조건 A**: [1]과 [6]만 표시 (이름은 "AI Assistant")
- **조건 B**: [1]과 [6]만 표시
- **조건 C**: [1]~[6] 모두 표시 (읽기 전용)
- **조건 D**: [1]~[6] 모두 표시 + [2]에서 계획 수정 가능
