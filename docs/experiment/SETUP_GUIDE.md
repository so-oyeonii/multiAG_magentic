# 환경설정 및 시스템 변경 가이드

## 1. 우리가 바꾸고 있는 것 — 전체 그림

Magentic-UI 원본을 그대로 유지하면서, **실험 조건 전환 레이어**를 얹는 작업입니다.

```
┌─────────────────────────────────────────────────┐
│  원본 Magentic-UI (변경 없음)                     │
│  ┌───────────────────────────────────────────┐   │
│  │  우리가 추가하는 실험 레이어               │   │
│  │  - experiment_mode = True 일 때만 활성화   │   │
│  │  - False면 원본과 100% 동일                │   │
│  └───────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

### 변경 대상 파일 요약

| Phase | 파일 | 변경 유형 | 설명 |
|-------|------|----------|------|
| **1** | `src/magentic_ui/magentic_ui_config.py` | 필드 추가 | experiment_condition, experiment_mode 등 4개 필드 |
| **1** | `src/magentic_ui/task_team.py` | 분기 추가 | 조건별 에이전트 팀 구성 (single vs multi) |
| **1** | `configs/*.yaml` (4개) | 신규 생성 | 4개 실험 조건 설정 파일 |
| **2** | `src/magentic_ui/backend/datamodel/db.py` | 테이블 추가 | ExperimentLog, ExperimentSurvey 테이블 |
| **2** | `src/magentic_ui/experiment_logger.py` | 신규 생성 | 상호작용 로그 수집 모듈 |
| **2** | `src/magentic_ui/backend/web/routes/experiment.py` | 신규 생성 | 실험 데이터 API 엔드포인트 |
| **3** | `frontend/src/components/views/chat/rendermessage.tsx` | 조건부 수정 | 에이전트 이름 표시 분기 |
| **3** | `frontend/src/components/views/chat/runview.tsx` | 조건부 수정 | 블랙박스 메시지 필터링 |
| **3** | `frontend/src/components/views/chat/plan.tsx` | 조건부 수정 | Co-Planning UI 숨김 |
| **4** | `frontend/src/components/experiment/*.tsx` (4개) | 신규 생성 | Welcome, Scenario, Survey, AgentTeamPanel |
| **5** | `scripts/export_experiment_data.py` | 신규 생성 | 데이터 CSV 내보내기 |

---

## 2. 필수 환경설정 — 반드시 해야 할 것

### 2-1. OpenAI API Key (필수)

Magentic-UI는 기본적으로 GPT-4 모델을 사용합니다. API 키가 없으면 아무것도 동작하지 않습니다.

```bash
# 터미널에서 설정
export OPENAI_API_KEY="sk-your-api-key-here"

# 또는 영구 설정 (~/.magentic_ui/.env 파일에 추가)
echo 'OPENAI_API_KEY=sk-your-api-key-here' >> ~/.magentic_ui/.env
```

**비용 참고:**
- 기본 모델: `gpt-4.1-2025-04-14` (Orchestrator, WebSurfer, Coder, FileSurfer)
- Action Guard: `gpt-4.1-nano-2025-04-14` (저렴)
- 실험 참여자 1명당 예상 비용: 과업에 따라 다르지만 약 $1~5 정도

### 2-2. Docker (필수 — 없으면 기능 제한)

Magentic-UI는 Docker 안에서 브라우저와 코드 실행 환경을 구동합니다.

```bash
# Docker 설치 확인
docker --version

# Docker가 실행 중인지 확인
docker ps
```

**Docker 이미지 (자동 다운로드):**
- `ghcr.io/microsoft/magentic-ui-browser:0.0.2` (~1.5GB) — Playwright 브라우저
- `ghcr.io/microsoft/magentic-ui-python-env:0.0.1` (~500MB) — Python 실행 환경

**Docker 없이 실행하려면:**
```bash
magentic-ui --port 8081 --run-without-docker
# ⚠️ 제한: Coder, FileSurfer 비활성화, 라이브 브라우저 없음
```

**macOS (Colima 사용 시):**
```bash
export DOCKER_HOST=unix://$HOME/.docker/desktop/docker.sock
```

### 2-3. Python 3.10+ (필수)

```bash
# Python 버전 확인
python3 --version  # 3.10 이상이어야 함

# 추천: pyenv로 3.12 설치
pyenv install 3.12
pyenv local 3.12
```

---

## 3. 설치 방법

### 방법 A: pip 설치 (가장 간단)

```bash
# 가상환경 생성
python3 -m venv .venv
source .venv/bin/activate

# 설치
pip install magentic-ui

# API 키 설정
export OPENAI_API_KEY="sk-..."

# 실행
magentic-ui --port 8081
```

### 방법 B: 소스에서 설치 (우리 프로젝트)

```bash
# 이 레포를 클론한 상태에서
cd multiAG_magentic

# uv 사용 (추천)
uv venv --python=3.12 .venv
source .venv/bin/activate
uv sync --all-extras

# 프론트엔드 빌드
cd frontend
npm install -g gatsby-cli yarn
yarn install
yarn build
cd ..

# 실행 (기본 모드 — 원본 Magentic-UI 그대로)
magentic-ui --port 8081

# 실험 조건 A로 실행
magentic-ui --port 8081 --config configs/condition_a_single.yaml

# 실험 조건 D로 실행
magentic-ui --port 8081 --config configs/condition_d_coplan.yaml
```

---

## 4. 시스템 아키텍처 — 설정이 흐르는 경로

```
사용자가 CLI에서 실행
  │
  ▼
magentic-ui --config configs/condition_b_blackbox.yaml --port 8081
  │
  ▼
[CLI: backend/cli.py]
  │  --config 값을 환경변수 _CONFIG에 저장
  ▼
[FastAPI 서버: backend/web/app.py]
  │  _CONFIG 환경변수에서 YAML 파일 읽기
  │  yaml.safe_load() → dict
  ▼
[WebSocket Manager: backend/web/managers/connection.py]
  │  config dict를 TeamManager에 전달
  ▼
[TeamManager: backend/teammanager/teammanager.py]
  │  MagenticUIConfig(**config_params) 로 객체 생성
  ▼
[task_team.py: get_task_team()]
  │  config.experiment_condition 에 따라 팀 구성
  │  - "single_agent" → WebSurfer + UserProxy만
  │  - "multi_*" → 전체 에이전트 팀
  ▼
[프론트엔드]
  │  /api/settings/config-info 호출해서 현재 조건 확인
  │  조건에 따라 UI 분기
  ▼
참여자에게 보이는 화면
```

---

## 5. 포트 사용 현황

| 포트 | 용도 | 설정 방법 |
|------|------|----------|
| **8081** | 메인 UI (기본) | `--port 8081` |
| **8000** | 프론트엔드 개발 서버 | `yarn start` (개발 시만) |
| **6080** | noVNC 브라우저 인터페이스 | Docker 내부, 자동 할당 |
| **37367** | Playwright 서버 | Docker 내부, 자동 할당 |

---

## 6. 실험 조건별 실행 명령어

```bash
# 조건 A: 단일 에이전트 (WebSurfer만)
magentic-ui --port 8081 --config configs/condition_a_single.yaml

# 조건 B: 멀티에이전트 블랙박스 (중간 과정 숨김)
magentic-ui --port 8081 --config configs/condition_b_blackbox.yaml

# 조건 C: 멀티에이전트 투명 (전체 과정 노출)
magentic-ui --port 8081 --config configs/condition_c_transparent.yaml

# 조건 D: 멀티에이전트 참여형 (Co-Planning)
magentic-ui --port 8081 --config configs/condition_d_coplan.yaml

# 기본 모드 (실험 아님, 원본 Magentic-UI)
magentic-ui --port 8081
```

---

## 7. 체크리스트 — 실험 전 확인사항

### 필수 (이것 없으면 안 됨)
- [ ] Python 3.10+ 설치됨
- [ ] `OPENAI_API_KEY` 환경변수 설정됨
- [ ] Docker Desktop/Engine 실행 중
- [ ] `pip install magentic-ui` 또는 소스에서 설치 완료
- [ ] `magentic-ui --port 8081` 로 기본 모드 정상 실행 확인

### 선택 (없어도 동작은 함)
- [ ] Node.js + Yarn (프론트엔드 수정 시에만 필요)
- [ ] uv (빠른 Python 패키지 관리, pip으로 대체 가능)

### 다운로드가 필요한 것
- [ ] Docker 이미지: 첫 실행 시 자동 다운로드 (~2GB)
- [ ] Playwright 브라우저: Docker 이미지에 포함됨 (별도 설치 불필요)

### 다운로드가 필요 없는 것
- SQLite: Python 표준 라이브러리에 포함
- 프론트엔드: `pip install magentic-ui` 시 빌드된 파일 포함
- 추가 Python 패키지: 모두 magentic-ui 의존성에 포함

---

## 8. 문제 해결

| 증상 | 원인 | 해결 |
|------|------|------|
| `OPENAI_API_KEY not set` | API 키 미설정 | `export OPENAI_API_KEY="sk-..."` |
| `docker not found` | Docker 미설치/미실행 | Docker Desktop 설치 또는 `--run-without-docker` |
| 포트 충돌 | 8081 사용 중 | `--port 8082` 로 변경 |
| 프론트엔드 빌드 실패 | Node.js 미설치 | `nvm install node` |
| DB 오류 | 스키마 변경 | `--upgrade-database` 플래그 추가 |
| 브라우저 안 보임 | Docker 이미지 미다운로드 | 첫 실행 시 자동 다운로드 대기 |

---

## 9. 비용 관련 참고

**OpenAI API 비용 (2024년 기준):**
- GPT-4.1: Input ~$2/1M tokens, Output ~$8/1M tokens
- GPT-4.1-nano: Input ~$0.1/1M tokens, Output ~$0.4/1M tokens
- 실험 1회(참여자 1명) 예상: 과업 복잡도에 따라 $1~5
- 전체 실험(참여자 N명): 약 $N × $3 (평균)

**절약 팁:**
- Action Guard는 이미 nano 모델 사용 (저렴)
- `max_turns: 20` (기본값)으로 무한 루프 방지
- 테스트 시 `gpt-4.1-mini` 로 대체 가능 (config YAML에서 변경)
