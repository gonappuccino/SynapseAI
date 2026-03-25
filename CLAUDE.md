# SynapseAI — CLAUDE.md

## 프로젝트 개요

**SynapseAI**는 AI 기반 Adaptive Learning OS다. 사용자가 PDF/이미지/오디오를 업로드하면 개념을 추출해 지식 그래프(prerequisite tree)로 변환하고, 각 노드를 학습 → 퀴즈 플로우로 제공한다.

**핵심 원칙 — Fixed-Point Transformation**: 수식, 변수명, 핵심 전공 용어는 절대 변환하지 않는 "Protected Identifier"로 고정. 설명 맥락(Context)만 사용자 인지 수준에 맞게 조정한다.

---

## Critical Rules

- .env, credentials.json 등 시크릿 파일 절대 커밋 금지
- If ambiguity affects architecture, DB schema, or API contract, ask the user.
- Otherwise, choose the simplest MVP-safe implementation.
- over engineering 하지 말 것

## Tech Stack

| Layer       | 기술                                                        |
| ----------- | ----------------------------------------------------------- |
| Frontend    | Next.js 15 (App Router), Tailwind CSS, Framer Motion, KaTeX |
| Backend     | Python 3.12+, FastAPI                                       |
| AI          | Gemini 2.5 Flash (Vertex AI)                                |
| DB          | PostgreSQL 16 + pgvector (Cloud SQL)                        |
| PDF Parsing | Marker 또는 LlamaParse                                      |
| Audio       | Google Cloud TTS (SSML)                                     |

---

## 디렉토리 구조

```
SynapseAI/
├── frontend/                         # Next.js 15 (App Router)
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx                  # 홈 (업로드 진입점)
│   │   ├── upload/
│   │   │   └── page.tsx              # 파일 업로드 & 처리 대기
│   │   └── learn/[sessionId]/
│   │       ├── page.tsx              # Prerequisite map 뷰
│   │       └── node/[nodeId]/
│   │           ├── page.tsx          # 학습 페이지 (Focus/Faded layer)
│   │           ├── pre-quiz/
│   │           │   └── page.tsx      # Pre-Quiz (diagnostic)
│   │           └── post-quiz/
│   │               └── page.tsx      # Post-Quiz (reinforcement)
│   ├── components/
│   │   ├── graph/
│   │   │   ├── PrerequisiteMap.tsx   # Prerequisite map 시각화 (최대 10노드)
│   │   │   └── GraphNode.tsx         # 노드 (이해도 점수 표시)
│   │   ├── study/
│   │   │   ├── FocusLayer.tsx        # 핵심 노테이션: 200% Bold + 뽀용용 애니메이션
│   │   │   ├── FadedLayer.tsx        # 부연설명: 30% opacity
│   │   │   └── NotationDisplay.tsx   # KaTeX 수식 렌더링
│   │   ├── quiz/
│   │   │   ├── FillInBlank.tsx       # 빈칸 채우기
│   │   │   ├── KeywordMatch.tsx      # 키워드 연결 게임
│   │   │   └── QuizProgress.tsx      # 듀오링고 스타일 진행바
│   │   └── audio/
│   │       └── AudioPlayer.tsx       # SSML 오디오 플레이어
│   ├── lib/
│   │   └── api.ts                    # Backend API 클라이언트
│   ├── public/
│   ├── package.json
│   ├── tailwind.config.ts
│   └── next.config.ts
│
├── backend/                          # FastAPI
│   ├── app/
│   │   ├── main.py                   # FastAPI 앱 진입점, 라우터 등록
│   │   ├── api/
│   │   │   ├── routes/
│   │   │   │   ├── upload.py         # POST /upload — 파일 업로드 → session_id 반환
│   │   │   │   ├── graph.py          # GET /sessions/{id}/graph — prerequisite map 조회
│   │   │   │   ├── quiz.py           # GET/POST /nodes/{id}/quiz — 퀴즈 생성 & 오답 큐 관리
│   │   │   │   └── audio.py          # GET /nodes/{id}/audio — SSML 오디오 생성
│   │   │   └── deps.py               # 공통 의존성 (DB 세션 등)
│   │   ├── core/
│   │   │   └── config.py             # 환경변수 설정 (Pydantic Settings)
│   │   ├── services/
│   │   │   ├── gemini.py             # Gemini 2.5 Flash API 래퍼
│   │   │   ├── concept_extractor.py  # 입력 → 개념 추출 → Node/Edge 생성, Protected Identifier 태깅
│   │   │   ├── quiz_generator.py     # 퀴즈 생성 + 오답 큐 (N 스텝 후 재출제)
│   │   │   ├── audio_generator.py    # SSML 생성 (Explanation → Question → Pause → Answer)
│   │   │   └── pdf_parser.py         # PDF/이미지/오디오 → Markdown 변환 (Marker/LlamaParse)
│   │   ├── models/                   # SQLAlchemy ORM 모델
│   │   │   ├── node.py               # id, session_id, content, notation, vector_embedding, confidence_score
│   │   │   └── edge.py               # source_id, target_id, relation_type (prerequisite/sub_concept)
│   │   ├── schemas/                  # Pydantic 스키마 (request/response)
│   │   │   ├── graph.py
│   │   │   └── quiz.py
│   │   └── db/
│   │       ├── session.py            # DB 세션 팩토리
│   │       └── migrations/           # Alembic 마이그레이션
│   ├── requirements.txt
│   └── Dockerfile
│
├── .env.example
├── docker-compose.yml
├── CLAUDE.md
└── PRD.md
```

---

## 핵심 기능 명세

### 1. Input Processing (upload.py → concept_extractor.py)

- 지원 입력: PDF, 이미지(손글씨 포함), 오디오
- pdf_parser.py가 원문을 Markdown으로 변환
  (pdf_parser.py 섹션에 \*\*"반드시 수식을 LaTeX 형식($...$)으로 보존하여 추출할 )
- concept_extractor.py가 Gemini를 통해 개념 추출 → Node/Edge 생성, session_id 반환
- **Protected Identifier**: `$수식$`, 코드 변수명, 핵심 전공 용어는 추출 시점에 태깅하여 이후 변환 대상에서 제외

### 2. Knowledge Graph (graph.py)

- **최대 노드 수: 20개** (UI 가독성 유지)
- `relation_type` = `prerequisite` 또는 `sub_concept`
- sub_concept 노드는 **최대 depth 1** — 부모 노드 아래 작은 자식 노드로만 표시
- prerequisite 엣지는 일반 화살표, sub_concept은 부모 아래 들여쓰기 형태로 시각화
- 편집, 드래그, 복잡한 레이아웃 로직 없음 — 학습 순서와 구조의 시각적 표현에만 집중
- pgvector 저장은 유지 (향후 확장용)

### 3. Learning Flow (각 node마다 순서 고정)

```
Pre-Quiz (diagnostic) → Study (Focus/Faded layer) → Post-Quiz (reinforcement)
```

퀴즈 결과로 해당 노드의 `confidence_score` 업데이트

### 4. Variable Fidelity Rendering (FocusLayer / FadedLayer)

- **Focus Layer**: Protected Identifier → 200% 크기 + Bold + Framer Motion 뽀용용 애니메이션
- **Faded Layer**: 부연 설명 → `opacity-30`
- **ESL Terminology Master 모드**: 설명은 사용자 모국어로, 전공 용어/노테이션은 영어 원형 유지

### 5. Gamified Quiz (quiz_generator.py)

- 퀴즈 타입: 빈칸 채우기, 키워드 연결 게임, 간단 예시 문제
- 듀오링고 스타일 진행 UI (QuizProgress.tsx)
- **틀린 문제 재출제**: 오답 노드를 큐에 기록 → N 스텝 후 동일 문제 재출제. 복잡한 망각 곡선 계산 없음

### 6. Audio Mode (audio_generator.py)

- SSML 구조: Explanation → Question → Pause → Answer
- 출퇴근 중 귀로만 학습 가능하도록 설계
- AudioPlayer.tsx에서 재생

---

## DB 스키마 요약

```sql
-- nodes
id, session_id, content TEXT, notation TEXT,
vector_embedding vector(768), confidence_score FLOAT

-- edges
source_id, target_id, relation_type TEXT  -- 'prerequisite' | 'sub_concept'
```

오답 재출제는 DB 없이 세션 내 in-memory 큐로 관리 (quiz_generator.py)

---

## Priority Order

1. Learning Loop (Pre-Quiz → Study → Post-Quiz)
2. Fixed-Point Transformation
3. Prerequisite-based progression
4. Visual polish
5. Audio

## MVP 범위 (데모 기준)

**포함**

- 파일 업로드 → 지식 그래프 생성
- 그래프 시각화 (노드별 이해도 표시)
- 학습 페이지 (Focus/Faded layer + KaTeX)
- Pre/Post 퀴즈 (빈칸 채우기, 키워드 연결)
- SSML 오디오
- ESL Terminology Master 모드

**제외 (MVP 이후)**

- Auth / 로그인
- AI Mentor
- Data Moats (Predictive Cognitive Pathing, Collective Bottleneck Intelligence)
- 캐싱 레이어

---

## 환경변수 (.env)

```
GEMINI_API_KEY=
VERTEX_AI_PROJECT=
DATABASE_URL=postgresql+asyncpg://...
GOOGLE_APPLICATION_CREDENTIALS=
```
