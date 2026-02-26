import React, { useState } from "react";
import { getServerUrl } from "../components/utils";

interface ExperimentSurveyProps {
  participantId: string;
  condition: string;
  sessionId: number | null;
  onComplete: () => void;
}

interface LikertQuestionProps {
  id: string;
  question: string;
  value: number | null;
  onChange: (value: number) => void;
}

const LIKERT_LABELS = [
  "전혀 그렇지 않다",
  "그렇지 않다",
  "보통이다",
  "그렇다",
  "매우 그렇다",
];

const LikertQuestion: React.FC<LikertQuestionProps> = ({
  id,
  question,
  value,
  onChange,
}) => (
  <div className="space-y-2">
    <p className="text-sm text-primary font-medium">{question}</p>
    <div className="flex gap-2 justify-between">
      {LIKERT_LABELS.map((label, idx) => (
        <label
          key={`${id}-${idx}`}
          className={`flex-1 text-center cursor-pointer rounded-lg p-2 text-xs transition-colors border ${
            value === idx + 1
              ? "bg-accent text-white border-accent"
              : "bg-secondary text-primary border-secondary hover:border-accent"
          }`}
        >
          <input
            type="radio"
            name={id}
            value={idx + 1}
            checked={value === idx + 1}
            onChange={() => onChange(idx + 1)}
            className="sr-only"
          />
          <div className="font-semibold mb-1">{idx + 1}</div>
          <div className="leading-tight">{label}</div>
        </label>
      ))}
    </div>
  </div>
);

const SURVEY_SECTIONS = [
  {
    title: "시스템 사용성",
    questions: [
      { id: "usability_1", text: "시스템이 사용하기 쉬웠다." },
      { id: "usability_2", text: "원하는 작업을 효과적으로 수행할 수 있었다." },
      { id: "usability_3", text: "시스템의 반응 속도가 적절했다." },
    ],
  },
  {
    title: "신뢰도",
    questions: [
      { id: "trust_1", text: "시스템의 결과를 신뢰할 수 있었다." },
      { id: "trust_2", text: "시스템이 정확한 정보를 제공했다." },
      { id: "trust_3", text: "시스템을 다시 사용하고 싶다." },
    ],
  },
  {
    title: "투명성",
    questions: [
      { id: "transparency_1", text: "시스템이 어떻게 작동하는지 이해할 수 있었다." },
      { id: "transparency_2", text: "시스템의 작업 과정을 충분히 파악할 수 있었다." },
      { id: "transparency_3", text: "시스템이 왜 그런 결과를 냈는지 이해할 수 있었다." },
    ],
  },
  {
    title: "통제감",
    questions: [
      { id: "control_1", text: "과업 수행 과정에서 내가 통제하고 있다는 느낌이 들었다." },
      { id: "control_2", text: "시스템의 행동을 예측할 수 있었다." },
      { id: "control_3", text: "필요할 때 시스템의 동작을 수정하거나 조정할 수 있었다." },
    ],
  },
  {
    title: "만족도",
    questions: [
      { id: "satisfaction_1", text: "전반적으로 시스템 사용 경험에 만족한다." },
      { id: "satisfaction_2", text: "과업 수행 결과에 만족한다." },
    ],
  },
];

const ExperimentSurvey: React.FC<ExperimentSurveyProps> = ({
  participantId,
  condition,
  sessionId,
  onComplete,
}) => {
  const [responses, setResponses] = useState<Record<string, number>>({});
  const [openResponse, setOpenResponse] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const totalQuestions = SURVEY_SECTIONS.reduce(
    (sum, section) => sum + section.questions.length,
    0
  );
  const answeredQuestions = Object.keys(responses).length;

  const handleChange = (questionId: string, value: number) => {
    setResponses((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleSubmit = async () => {
    if (answeredQuestions < totalQuestions) {
      setError("모든 문항에 응답해주세요.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const surveyData = {
        participant_id: participantId,
        experiment_condition: condition,
        session_id: sessionId,
        responses: {
          ...responses,
          open_response: openResponse,
        },
      };

      const res = await fetch(`${getServerUrl()}/experiment/survey`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(surveyData),
      });

      if (res.ok) {
        setSubmitted(true);
      } else {
        setError("설문 저장에 실패했습니다. 다시 시도해주세요.");
      }
    } catch (e) {
      setError("네트워크 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex items-center justify-center min-h-full p-8">
        <div className="max-w-xl w-full bg-tertiary rounded-2xl p-8 shadow-lg text-center">
          <h1 className="text-2xl font-bold text-primary mb-4">
            설문이 완료되었습니다
          </h1>
          <p className="text-primary mb-6">
            연구에 참여해주셔서 감사합니다.<br />
            응답이 성공적으로 저장되었습니다.
          </p>
          <button
            onClick={onComplete}
            className="px-8 py-3 rounded-lg bg-accent text-white font-semibold hover:opacity-90 transition-opacity"
          >
            완료
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-full p-8 overflow-y-auto">
      <div className="max-w-2xl w-full bg-tertiary rounded-2xl p-8 shadow-lg">
        <h1 className="text-2xl font-bold text-primary mb-2 text-center">
          사용 경험 설문
        </h1>
        <p className="text-sm text-secondary text-center mb-6">
          방금 사용한 AI 시스템에 대한 경험을 평가해주세요.
          ({answeredQuestions}/{totalQuestions} 응답 완료)
        </p>

        <div className="space-y-8">
          {SURVEY_SECTIONS.map((section) => (
            <div key={section.title}>
              <h2 className="font-semibold text-primary mb-3 border-b border-secondary pb-1">
                {section.title}
              </h2>
              <div className="space-y-4">
                {section.questions.map((q) => (
                  <LikertQuestion
                    key={q.id}
                    id={q.id}
                    question={q.text}
                    value={responses[q.id] || null}
                    onChange={(value) => handleChange(q.id, value)}
                  />
                ))}
              </div>
            </div>
          ))}

          {/* Open-ended question */}
          <div>
            <h2 className="font-semibold text-primary mb-3 border-b border-secondary pb-1">
              추가 의견
            </h2>
            <p className="text-sm text-primary mb-2">
              시스템 사용 경험에 대해 추가로 말씀하고 싶은 것이 있으시면
              자유롭게 작성해주세요. (선택)
            </p>
            <textarea
              value={openResponse}
              onChange={(e) => setOpenResponse(e.target.value)}
              rows={4}
              className="w-full px-4 py-2 rounded-lg border border-secondary bg-background text-primary focus:outline-none focus:ring-2 focus:ring-accent resize-none"
              placeholder="자유롭게 작성해주세요..."
            />
          </div>
        </div>

        {error && (
          <p className="text-red-500 text-sm mt-4">{error}</p>
        )}

        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="w-full mt-6 py-3 rounded-lg bg-accent text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {isSubmitting ? "제출 중..." : "설문 제출"}
        </button>
      </div>
    </div>
  );
};

export default ExperimentSurvey;
