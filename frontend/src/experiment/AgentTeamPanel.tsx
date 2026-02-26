import React from "react";

interface AgentTeamPanelProps {
  condition: string;
}

interface AgentInfo {
  name: string;
  role: string;
  emoji: string;
}

const MULTI_AGENTS: AgentInfo[] = [
  {
    name: "Orchestrator",
    role: "전체 작업을 계획하고 조율합니다.",
    emoji: "🎯",
  },
  {
    name: "WebSurfer",
    role: "웹 브라우저를 사용해 정보를 검색합니다.",
    emoji: "🌐",
  },
  {
    name: "Coder",
    role: "코드를 작성하고 실행합니다.",
    emoji: "💻",
  },
  {
    name: "FileSurfer",
    role: "파일을 탐색하고 관리합니다.",
    emoji: "📁",
  },
];

const SINGLE_AGENT: AgentInfo[] = [
  {
    name: "AI Assistant",
    role: "웹 브라우저를 사용해 과업을 수행합니다.",
    emoji: "🤖",
  },
];

const AgentTeamPanel: React.FC<AgentTeamPanelProps> = ({ condition }) => {
  const agents = condition === "single_agent" ? SINGLE_AGENT : MULTI_AGENTS;

  return (
    <div className="bg-secondary rounded-lg p-4">
      <h3 className="font-semibold text-primary mb-3 text-sm">
        {condition === "single_agent" ? "AI 어시스턴트" : "AI 에이전트 팀 구성"}
      </h3>
      <div className="space-y-2">
        {agents.map((agent) => (
          <div
            key={agent.name}
            className="flex items-center gap-3 bg-tertiary rounded-lg p-2"
          >
            <span className="text-xl">{agent.emoji}</span>
            <div>
              <div className="font-medium text-primary text-sm">
                {agent.name}
              </div>
              <div className="text-xs text-secondary">{agent.role}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AgentTeamPanel;
