import React from "react";

interface ExperimentScenarioProps {
  condition: string;
  scenario: string | null;
  onStart: () => void;
}

const CONDITION_DESCRIPTIONS: Record<string, { title: string; description: string }> = {
  single_agent: {
    title: "AI 어시스턴트",
    description: "하나의 AI 어시스턴트가 과업을 수행합니다.",
  },
  multi_blackbox: {
    title: "AI 에이전트 팀",
    description:
      "여러 AI 에이전트가 협력하여 과업을 수행합니다. 최종 결과가 표시됩니다.",
  },
  multi_transparent: {
    title: "AI 에이전트 팀 (과정 공개)",
    description:
      "여러 AI 에이전트가 협력하여 과업을 수행합니다. 에이전트들의 작업 과정을 실시간으로 확인할 수 있습니다.",
  },
  multi_coplan: {
    title: "AI 에이전트 팀 (참여형)",
    description:
      "여러 AI 에이전트가 협력하여 과업을 수행합니다. 에이전트들의 작업 과정을 확인하고, 계획 수립에 직접 참여할 수 있습니다.",
  },
};

const DEFAULT_SCENARIO = `다음 과업을 AI 시스템을 사용하여 수행해주세요.

채팅 입력창에 요청을 입력하면, AI가 웹 브라우저를 사용하여 과업을 수행합니다.
과업이 완료되면 결과를 확인하고, 설문에 응답해주세요.`;

const ExperimentScenario: React.FC<ExperimentScenarioProps> = ({
  condition,
  scenario,
  onStart,
}) => {
  const conditionInfo = CONDITION_DESCRIPTIONS[condition] || {
    title: "AI 시스템",
    description: "AI가 과업을 수행합니다.",
  };

  return (
    <div className="flex items-center justify-center min-h-full p-8">
      <div className="max-w-2xl w-full bg-tertiary rounded-2xl p-8 shadow-lg">
        <h1 className="text-2xl font-bold text-primary mb-6 text-center">
          과업 안내
        </h1>

        <div className="space-y-4 mb-6">
          {/* AI System Info */}
          <div className="bg-secondary rounded-lg p-4">
            <h2 className="font-semibold text-primary mb-2">
              사용하실 AI 시스템
            </h2>
            <div className="text-primary">
              <p className="font-medium text-lg">{conditionInfo.title}</p>
              <p className="text-sm mt-1 opacity-80">
                {conditionInfo.description}
              </p>
            </div>
          </div>

          {/* Scenario */}
          <div className="bg-secondary rounded-lg p-4">
            <h2 className="font-semibold text-primary mb-2">과업 시나리오</h2>
            <div className="text-primary text-sm whitespace-pre-wrap leading-relaxed">
              {scenario || DEFAULT_SCENARIO}
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-secondary rounded-lg p-4">
            <h2 className="font-semibold text-primary mb-2">안내 사항</h2>
            <ul className="text-primary text-sm list-disc list-inside space-y-1">
              <li>채팅 입력창에 요청 사항을 자유롭게 입력하세요.</li>
              <li>AI가 작업하는 동안 기다려주세요.</li>
              <li>필요시 추가 요청이나 수정 사항을 입력할 수 있습니다.</li>
              <li>과업 완료 후 &quot;설문 시작&quot; 버튼이 표시됩니다.</li>
            </ul>
          </div>
        </div>

        <button
          onClick={onStart}
          className="w-full py-3 rounded-lg bg-accent text-white font-semibold hover:opacity-90 transition-opacity"
        >
          과업 시작하기
        </button>
      </div>
    </div>
  );
};

export default ExperimentScenario;
