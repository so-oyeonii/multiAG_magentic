import React, { useState } from "react";

interface ExperimentWelcomeProps {
  onConsent: (participantId: string) => void;
}

const ExperimentWelcome: React.FC<ExperimentWelcomeProps> = ({ onConsent }) => {
  const [participantId, setParticipantId] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = () => {
    if (!participantId.trim()) {
      setError("참여자 ID를 입력해주세요.");
      return;
    }
    if (!agreed) {
      setError("연구 참여에 동의해주세요.");
      return;
    }
    setError("");
    onConsent(participantId.trim());
  };

  return (
    <div className="flex items-center justify-center min-h-full p-8">
      <div className="max-w-2xl w-full bg-tertiary rounded-2xl p-8 shadow-lg">
        <h1 className="text-2xl font-bold text-primary mb-6 text-center">
          연구 참여 안내
        </h1>

        <div className="space-y-4 text-primary text-sm leading-relaxed mb-6">
          <p>
            안녕하세요. 본 연구는 <strong>성균관대학교 인터랙션사이언스학과</strong>에서
            진행하는 &quot;멀티에이전트 AI 시스템에 대한 사용자 수용&quot; 연구입니다.
          </p>

          <div className="bg-secondary rounded-lg p-4">
            <h2 className="font-semibold mb-2">연구 목적</h2>
            <p>
              AI 에이전트 시스템의 구성 방식과 상호작용 투명성이 사용자 경험에
              미치는 영향을 알아보고자 합니다.
            </p>
          </div>

          <div className="bg-secondary rounded-lg p-4">
            <h2 className="font-semibold mb-2">참여 방법</h2>
            <ol className="list-decimal list-inside space-y-1">
              <li>주어진 과업 시나리오를 확인합니다.</li>
              <li>AI 에이전트 시스템을 사용하여 과업을 수행합니다.</li>
              <li>과업 수행 후 간단한 설문에 응답합니다.</li>
            </ol>
          </div>

          <div className="bg-secondary rounded-lg p-4">
            <h2 className="font-semibold mb-2">참여자 권리</h2>
            <ul className="list-disc list-inside space-y-1">
              <li>참여는 자발적이며, 언제든 중단할 수 있습니다.</li>
              <li>수집된 데이터는 연구 목적으로만 사용됩니다.</li>
              <li>개인 식별 정보는 수집하지 않습니다.</li>
              <li>예상 소요 시간: 약 20~30분</li>
            </ul>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-primary mb-1">
              참여자 ID
            </label>
            <input
              type="text"
              value={participantId}
              onChange={(e) => setParticipantId(e.target.value)}
              placeholder="연구진에게 받은 참여자 ID를 입력하세요"
              className="w-full px-4 py-2 rounded-lg border border-secondary bg-background text-primary focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-secondary"
            />
            <span className="text-sm text-primary">
              위 안내를 충분히 읽었으며, 연구 참여에 자발적으로 동의합니다.
            </span>
          </label>

          {error && (
            <p className="text-red-500 text-sm">{error}</p>
          )}

          <button
            onClick={handleSubmit}
            className="w-full py-3 rounded-lg bg-accent text-white font-semibold hover:opacity-90 transition-opacity"
          >
            참여 시작
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExperimentWelcome;
