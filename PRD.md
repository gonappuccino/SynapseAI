<앱 설명>
SynapseAI

진행과정(진행률 계속 확인 + 공부시간 확인) 0. Input을 받으면 concept extraction + prerequisite links로 변환 (주제는 node가 되고 관련된 수식, 선행지식, 하위 개념들을 연결 (노테이션은 인풋에서 사용된 것 그대로), 퀴즈 정답률을 데이터화하여 노드마다 이해도 점수 부여)
기초개념 베이스 확인용 퀴즈 (쉽고 개념적인)
Focus-based UI: key concepts are highlighted, while explanations are simplified and visually de-emphasized. (학습 시간 추척 + 특정 개념 오래걸리면 더 쉽게 알려주기)
핵심 논리 키워드 → 진하고 크게 + 뽀용용 (ESL: 개념의 vocab 그대로; Audio: 딩- + 큰소리)
부연설명 -> 반투명 / 흐리게 (ESL: 모국어가 반투명 / 흐리게; Audio: 평소소리)
퀴즈 (빈칸채우기, 키워드 연결 게임, 간단 예제 문제) + 장기기억용 재시험
출근길에 공부할 수 있도록 가상의 AI 멘토를 만들어서 사용자 정보를 기억 (ex. 어제는 어떤걸 공부했는지 등)
모든 퀴즈는 듀오링고같이 gamification
Learning Flow:
Each concept follows:

1. Pre-Quiz (diagnostic)
2. Study (visual + audio)
3. Post-Quiz (reinforcement)
   User mastery is updated after each step.

Data moats
사용자가 앱을 오래 쓸 수록 다른 코스에서 배운 개념이 다음 학기 코스에 사용될지 미리 예측 + 사용자의 스타일 학습 (내 뇌를 잘 아는 튜터)
사용자들이 모이면, 예를 들어 특정 코스에서 어떤 부분이 병목이고 어떻게 풀어나가야할지 자체 데이터가 생김 (코스 담당 튜터)

PRD
"The World's First Cognitive OS powered by Gemini 3 & Vertex AI"

1. Product Vision & Principles
   Vision: 인공지능이 사용자의 뇌 구조와 실시간으로 동기화되어, 지식 습단위(Notation)의 훼손 없이 인지 장벽을 제거하는 Adaptive Learning OS.
   Core Principle - "Fixed-Point Transformation": 수식, 변수명, 핵심 기술 용어는 **'불변의 상수'**로 고정하고, 그 외의 설명 맥락(Context)만 사용자의 인지 최적 상태에 맞춰 '가변적 굴절' 시킴.

2. Functional Specifications (상세 기능 명세)
   2.1. Omni-Input Semantic Graph Engine (Gemini 3 Ultra 기반)
   MVP 솔루션: '선행 지식 트리(Prerequisite Tree)' + 하위개념 트리 만들기
   Input 처리: PDF, 오디오, 이미지(손글씨 포함)를 Gemini 컨텍스트 윈도우를 활용해 통합 분석.
   Graph Mapping: \* Nodes: 주제 및 개념을 PostgreSQL(pgvector)에 고차원 벡터로 저장.
   Strict Preservation (고정 토큰): 모든 수학 표기($\mathcal{O}(n)$, $\int$, $\sum$), 물리 기호, 코드 변수명($theta$, $bias$), 핵심 전공 용어는 추출 단계에서 **'Protected Identifier'**로 태깅되어 변환 대상에서 완전 격리됨.
   2.2. Variable Fidelity Rendering (Gemini 3 Flash 기반)
   Focus Layer (강조): 핵심 노테이션은 200% 확대 + Bold 효과 + '뽀용용' 애니메이션.
   Faded Layer (완화): 부연 설명은 30% 투명도 처리.
   2.3. Personalized Multimodal Experience
   Customizable ESL Modes: 1. Original Mode: 원문 유지 + 노테이션 강조.
3. Terminology Master: 설명은 모국어, 전문 용어와 노테이션은 영어 원형 유지.
   2.4. Gamified Testing & Spaced Repetition
   Micro-Quests: 듀오링고 스타일의 빈칸 채우기, 수식 연결 게임, 간단한 예시 문제
   Retention Tracking: 사용자가 틀린 노드에 대해 에빙하우스 망각 곡선 기반의 '가짜 테스트' 자동 생성 및 푸시 알림.
   2.5 SSML 사용해서 오디오 Explanation → Question → Pause → Answer
   -> 출퇴근 시간에도 학습 가능

4. AI
   3.1. Model
   Gemini 2.5 flash
   3.2. Memory & Reasoning Layer
   POSTGRESQL: 사용자의 고유한 '지식 히트맵'과 이해도 점수를 벡터화하여 저장. 쓸수록 똑똑해지는 개인화 엔진.

5. Data Moats (NOT IN MVP)
   4.0 caching
   4.1. Predictive Cognitive Pathing
   미래 예측: 현재 코스의 이해도 데이터를 기반으로 다음 학기(예: CSCC11 $\rightarrow$ CSCD84)에서 발생할 병목을 90% 확률로 사전 예측하여 '선행 복습 퀘스트' 제공.
   4.2. Collective Bottleneck Intelligence (B2B 가치)
   사용자들의 익명화된 이해도 데이터를 집계하여 특정 교과서나 코스의 '최악의 병목 구간'을 파악. 이를 해결하는 **'Community-driven Path'**를 추천 엔진에 반영.

<tech stack>
1. Frontend: "The Visual Magic" (Next.js + Tailwind)
데모의 성패는 0.1초 만에 결정되네. '뽀용용' 효과와 '텍스트 굴절'을 가장 매끄럽게 보여줄 스택이네.
Framework: Next.js 15 (App Router) - 서버 사이드 렌더링으로 초기 속도를 잡고, AI 스트리밍 응답에 최적화되어 있네.
Styling: Tailwind CSS - 디자인 고민 시간을 90% 줄여주지.
Animation: Framer Motion - 자네가 원하는 '뽀용용' 팝업과 부드러운 흐림(Blur) 처리를 위한 필수 무기네.
Math Rendering: KaTeX - 수식을 웹에서 가장 빠르고 예쁘게 그려주네.
2. Backend: "The AI Brain" (FastAPI + Vertex AI)
자네가 다룰 Python 기반 AI 로직을 가장 빠르게 API로 만들어줄 도구네.
Language: Python 3.12+ (FastAPI) - 비동기 처리 덕분에 Gemini의 응답을 기다리는 동안 서버가 멈추지 않네.
AI SDK: Vertex AI 가볍게 with GEmini 2.5 flash
PDF Parsing: Marker 또는 LlamaParse - PDF 속 수식과 구조를 마크다운(Markdown)으로 완벽히 뽑아내어 AI에게 먹여주네.
3. Database: "The Knowledge Heart" (Cloud SQL for PostgreSQL)
가장 안정적이면서도 확장성이 좋은 선택이네.
Engine: PostgreSQL 16 (Cloud SQL).
Plugin: pgvector - 지식 노드들을 벡터화해서 저장하고, 사용자의 질문과 가장 유사한 개념을 찾음
Schema: * nodes: id, content, notation, vector_embedding, confidence_score
edges: source_id, target_id, relation_type (선행/하위 등)
오디오
	
“Students struggle because textbooks rewrite concepts in confusing ways.
We keep all formulas and key terms fixed, and only simplify the explanation.”
