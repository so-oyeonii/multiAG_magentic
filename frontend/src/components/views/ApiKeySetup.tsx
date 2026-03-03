import React, { useState } from "react";

interface ApiKeySetupProps {
  onApiKeySet: () => void;
}

const ApiKeySetup: React.FC<ApiKeySetupProps> = ({ onApiKeySet }) => {
  const [apiKey, setApiKey] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedKey = apiKey.trim();
    if (!trimmedKey) {
      setError("API Key를 입력해주세요.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const { getServerUrl } = await import("../utils");
      const response = await fetch(`${getServerUrl()}/settings/api-key`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ api_key: trimmedKey }),
      });
      const data = await response.json();
      if (!data.status) {
        throw new Error(data.detail || "Failed to set API key");
      }
      onApiKeySet();
    } catch (err: any) {
      setError(err.message || "API Key 설정에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex items-center justify-center h-full bg-primary">
      <div className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-primary mb-2">
            Magentic-UI
          </h1>
          <p className="text-secondary text-sm">
            시작하려면 OpenAI API Key를 입력해주세요.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="apiKey"
              className="block text-sm font-medium text-secondary mb-1"
            >
              OpenAI API Key
            </label>
            <input
              id="apiKey"
              type="password"
              value={apiKey}
              onChange={(e) => {
                setApiKey(e.target.value);
                setError("");
              }}
              placeholder="sk-..."
              className="w-full px-4 py-2 border border-secondary rounded-lg bg-secondary text-primary focus:outline-none focus:ring-2 focus:ring-accent"
              autoFocus
              disabled={isSubmitting}
            />
          </div>

          {error && (
            <p className="text-red-500 text-sm">{error}</p>
          )}

          <button
            type="submit"
            disabled={isSubmitting || !apiKey.trim()}
            className="w-full py-2 px-4 rounded-lg bg-accent text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "설정 중..." : "시작하기"}
          </button>
        </form>

        <p className="text-xs text-secondary mt-4 text-center">
          API Key는 서버 메모리에만 저장되며, 서버 재시작 시 다시 입력해야 합니다.
        </p>
      </div>
    </div>
  );
};

export default ApiKeySetup;
