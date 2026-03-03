import React, {
  useCallback,
  useEffect,
  useState,
  useContext,
  useMemo,
} from "react";
import { message, Spin } from "antd";
import { useConfigStore } from "../../hooks/store";
import { useExperimentStore } from "../../hooks/useExperimentStore";
import { appContext } from "../../hooks/provider";
import { sessionAPI } from "./api";
import { SessionEditor } from "./session_editor";
import type { Session } from "../types/datamodel";
import ChatView from "./chat/chat";
import { Sidebar } from "./sidebar";
import { getServerUrl } from "../utils";
import { RunStatus } from "../types/datamodel";
import ContentHeader from "../contentheader";
import PlanList from "../features/Plans/PlanList";
import McpServersList from "../features/McpServersConfig/McpServersList";
import ExperimentWelcome from "../../experiment/ExperimentWelcome";
import ExperimentScenario from "../../experiment/ExperimentScenario";
import ExperimentSurvey from "../../experiment/ExperimentSurvey";
import ApiKeySetup from "./ApiKeySetup";

interface SessionWebSocket {
  socket: WebSocket;
  runId: string;
}

type SessionWebSockets = {
  [sessionId: number]: SessionWebSocket;
};

export const SessionManager: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<Session | undefined>();
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("sessionSidebar");
      return stored !== null ? JSON.parse(stored) : true;
    }
    return true;
  });
  const [messageApi, contextHolder] = message.useMessage();
  const [sessionSockets, setSessionSockets] = useState<SessionWebSockets>({});
  const [sessionRunStatuses, setSessionRunStatuses] = useState<{
    [sessionId: number]: RunStatus;
  }>({});
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeSubMenuItem, setActiveSubMenuItem] = useState("");

  // API Key check state
  const [apiKeyChecked, setApiKeyChecked] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);

  // Experiment flow state: "welcome" → "scenario" → "chat" → "survey" → "done"
  const [experimentPhase, setExperimentPhase] = useState<
    "welcome" | "scenario" | "chat" | "survey" | "done"
  >("welcome");
  const [experimentParticipantId, setExperimentParticipantId] = useState("");

  const { user } = useContext(appContext);
  const { session, setSession, sessions, setSessions } = useConfigStore();
  const experimentConfig = useExperimentStore((state) => state.config);
  const experimentLoaded = useExperimentStore((state) => state.loaded);
  const fetchExperimentConfig = useExperimentStore(
    (state) => state.fetchConfig
  );
  const isExperimentMode = experimentConfig.experiment_mode;

  // Check API key status on mount
  useEffect(() => {
    const checkApiKey = async () => {
      try {
        const response = await fetch(`${getServerUrl()}/settings/api-key-status`);
        const data = await response.json();
        if (data.status && data.data.has_api_key) {
          setHasApiKey(true);
        }
      } catch {
        // Server might not be ready yet, will show setup screen
      } finally {
        setApiKeyChecked(true);
      }
    };
    checkApiKey();
  }, []);

  // Fetch experiment config on mount
  useEffect(() => {
    fetchExperimentConfig();
  }, [fetchExperimentConfig]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("sessionSidebar", JSON.stringify(isSidebarOpen));
    }
  }, [isSidebarOpen]);

  const fetchSessions = useCallback(async () => {
    if (!user?.email) return;

    try {
      setIsLoading(true);
      const data = await sessionAPI.listSessions(user.email);
      setSessions(data);

      // Only set first session if there's no sessionId in URL
      const params = new URLSearchParams(window.location.search);
      const sessionId = params.get("sessionId");
      if (!session && data.length > 0 && !sessionId) {
        setSession(data[0]);
      } else {
        if (data.length === 0) {
          createDefaultSession();
        }
      }
    } catch (error) {
      console.error("Error fetching sessions:", error);
      messageApi.error("Error loading sessions");
    } finally {
      setIsLoading(false);
    }
  }, [user?.email, setSessions, session, setSession]);

  // Handle initial URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("sessionId");

    if (sessionId && !session) {
      handleSelectSession({ id: parseInt(sessionId) } as Session);
    }
  }, []);

  // Handle browser back/forward
  useEffect(() => {
    const handleLocationChange = () => {
      const params = new URLSearchParams(window.location.search);
      const sessionId = params.get("sessionId");

      if (!sessionId && session) {
        setSession(null);
      }
    };

    window.addEventListener("popstate", handleLocationChange);
    return () => window.removeEventListener("popstate", handleLocationChange);
  }, [session]);

  const handleSaveSession = async (sessionData: Partial<Session>) => {
    if (!user || !user.email) return;

    try {
      setIsLoading(true);
      if (sessionData.id) {
        const updated = await sessionAPI.updateSession(
          sessionData.id,
          sessionData,
          user.email
        );
        setSessions(sessions.map((s) => (s.id === updated.id ? updated : s)));
        if (session?.id === updated.id) {
          setSession(updated);
        }
      } else {
        const created = await sessionAPI.createSession(
          {
            ...sessionData,
            name:
              "Default Session - " +
              new Date().toLocaleDateString(undefined, {
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              }),
          },
          user.email
        );
        setSessions([created, ...sessions]);
        setSession(created);
        // Clear the active submenu item to switch from MCP Servers or Saved Plans tabs to the new session
        setActiveSubMenuItem("");
      }
      setIsEditorOpen(false);
      setEditingSession(undefined);
    } catch (error) {
      messageApi.error("Error saving session");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditSession = (session?: Session) => {
    setIsLoading(true);
    if (session) {
      setEditingSession(session);
      setIsEditorOpen(true);
    } else {
      // this means we are creating a new session
      handleSaveSession({});
    }
    setIsLoading(false);
  };

  const handleDeleteSession = async (sessionId: number) => {
    if (!user?.email) return;

    try {
      setIsLoading(true);
      // Close and remove socket if it exists
      if (sessionSockets[sessionId]) {
        sessionSockets[sessionId].socket.close();
        setSessionSockets((prev) => {
          const updated = { ...prev };
          delete updated[sessionId];
          return updated;
        });
      }

      const response = await sessionAPI.deleteSession(sessionId, user.email);
      setSessions(sessions.filter((s) => s.id !== sessionId));
      if (session?.id === sessionId || sessions.length === 0) {
        setSession(sessions[0] || null);
        window.history.pushState({}, "", window.location.pathname); // Clear URL params
      }
      messageApi.success("Session deleted");
    } catch (error) {
      console.error("Error deleting session:", error);
      messageApi.error("Error deleting session");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectSession = async (selectedSession: Session) => {
    if (!user?.email || !selectedSession.id) return;

    try {
      setActiveSubMenuItem("");
      setIsLoading(true);
      const data = await sessionAPI.getSession(selectedSession.id, user.email);
      if (!data) {
        // Session not found
        messageApi.error("Session not found");
        window.history.pushState({}, "", window.location.pathname); // Clear URL
        if (sessions.length > 0) {
          setSession(sessions[0]); // Fall back to first session
        } else {
          setSession(null);
        }
        return;
      }
      setSession(data);
      window.history.pushState({}, "", `?sessionId=${selectedSession.id}`);
    } catch (error) {
      console.error("Error loading session:", error);
      messageApi.error("Error loading session");
      window.history.pushState({}, "", window.location.pathname); // Clear invalid URL
      if (sessions.length > 0) {
        setSession(sessions[0]); // Fall back to first session
      } else {
        setSession(null);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSessionName = async (sessionData: Partial<Session>) => {
    if (!sessionData.id || !user?.email) return;

    // Check if current session name matches default pattern
    const currentSession = sessions.find((s) => s.id === sessionData.id);
    if (!currentSession) return;

    // Only update if it starts with "Default Session - "
    if (currentSession.name.startsWith("Default Session - ")) {
      try {
        const updated = await sessionAPI.updateSession(
          sessionData.id,
          sessionData,
          user.email
        );
        setSessions(sessions.map((s) => (s.id === updated.id ? updated : s)));
        if (session?.id === updated.id) {
          setSession(updated);
        }
      } catch (error) {
        console.error("Error updating session name:", error);
        messageApi.error("Error updating session name");
      }
    }
  };

  const getBaseUrl = (url: string): string => {
    try {
      let baseUrl = url.replace(/(^\w+:|^)\/\//, "");
      if (baseUrl.startsWith("localhost")) {
        baseUrl = baseUrl.replace("/api", "");
      } else if (baseUrl === "/api") {
        baseUrl = window.location.host;
      } else {
        baseUrl = baseUrl.replace("/api", "").replace(/\/$/, "");
      }
      return baseUrl;
    } catch (error) {
      console.error("Error processing server URL:", error);
      throw new Error("Invalid server URL configuration");
    }
  };

  const setupWebSocket = (sessionId: number, runId: string): WebSocket => {
    // Close existing socket for this session if it exists
    if (sessionSockets[sessionId]) {
      sessionSockets[sessionId].socket.close();
    }

    const serverUrl = getServerUrl();
    const baseUrl = getBaseUrl(serverUrl);
    const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${wsProtocol}//${baseUrl}/api/ws/runs/${runId}`;

    const socket = new WebSocket(wsUrl);

    // Store the new socket
    setSessionSockets((prev) => ({
      ...prev,
      [sessionId]: { socket, runId },
    }));

    return socket;
  };

  const getSessionSocket = (
    sessionId: number,
    runId: string,
    fresh_socket: boolean = false,
    only_retrieve_existing_socket: boolean = false
  ): WebSocket | null => {
    if (fresh_socket) {
      return setupWebSocket(sessionId, runId);
    } else {
      const existingSocket = sessionSockets[sessionId];

      if (
        existingSocket?.socket.readyState === WebSocket.OPEN &&
        existingSocket.runId === runId
      ) {
        return existingSocket.socket;
      }
      if (only_retrieve_existing_socket) {
        return null;
      }
      return setupWebSocket(sessionId, runId);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const updateSessionRunStatus = (sessionId: number, status: RunStatus) => {
    setSessionRunStatuses((prev) => ({
      ...prev,
      [sessionId]: status,
    }));
  };

  const createDefaultSession = async () => {
    if (!user?.email) return;

    try {
      setIsLoading(true);
      const defaultName = `Default Session - ${new Date().toLocaleDateString(
        undefined,
        {
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }
      )}`;

      const created = await sessionAPI.createSession(
        {
          name: defaultName,
        },
        user.email
      );

      setSessions([created, ...sessions]);
      setSession(created);
      window.history.pushState({}, "", `?sessionId=${created.id}`);
    } catch (error) {
      console.error("Error creating default session:", error);
      messageApi.error("Error creating default session");
    } finally {
      setIsLoading(false);
    }
  };

  const chatViews = useMemo(() => {
    return sessions.map((s: Session) => {
      const status = (s.id ? sessionRunStatuses[s.id] : undefined) as RunStatus;
      const isSessionPotentiallyActive = [
        "active",
        "awaiting_input",
        "pausing",
        "paused",
      ].includes(status);

      if (!isSessionPotentiallyActive && session?.id !== s.id) return null;

      return (
        <div
          key={s.id}
          className={`${session?.id === s.id ? "block" : "hidden"} relative`}
        >
          {isLoading && session?.id === s.id && (
            <div className="absolute inset-0 z-10 flex items-center justify-center">
              <Spin size="large" tip="Loading session..." />
            </div>
          )}
          <ChatView
            session={s}
            onSessionNameChange={handleSessionName}
            getSessionSocket={getSessionSocket}
            visible={session?.id === s.id}
            onRunStatusChange={updateSessionRunStatus}
            onSubMenuChange={setActiveSubMenuItem}
          />
        </div>
      );
    });
  }, [
    sessions,
    session?.id,
    handleSessionName,
    getSessionSocket,
    updateSessionRunStatus,
    isLoading,
    sessionRunStatuses,
  ]);

  // Add cleanup handlers for page unload and connection loss
  useEffect(() => {
    const closeAllSockets = () => {
      Object.values(sessionSockets).forEach(({ socket }) => {
        try {
          socket.close();
        } catch (error) {
          console.error("Error closing socket:", error);
        }
      });
    };

    // Handle page unload/refresh
    window.addEventListener("beforeunload", closeAllSockets);

    // Handle connection loss
    window.addEventListener("offline", closeAllSockets);

    return () => {
      window.removeEventListener("beforeunload", closeAllSockets);
      window.removeEventListener("offline", closeAllSockets);
      closeAllSockets(); // Clean up on component unmount too
    };
  }, []); // Empty dependency array since we want this to run once on mount

  const handleCreateSessionFromPlan = (
    sessionId: number,
    sessionName: string,
    planData: any
  ) => {
    // First select the session
    handleSelectSession({ id: sessionId } as Session);

    // Then dispatch the plan data to the chat component
    setTimeout(() => {
      window.dispatchEvent(
        new CustomEvent("planReady", {
          detail: {
            planData: planData,
            sessionId: sessionId,
            messageId: `plan_${Date.now()}`,
          },
        })
      );
    }, 2000); // Give time for session selection to complete
  };

  // === API Key gate: show setup screen if no API key ===
  if (apiKeyChecked && !hasApiKey) {
    return (
      <div className="relative flex flex-col h-full w-full">
        <ApiKeySetup
          onApiKeySet={() => {
            setHasApiKey(true);
          }}
        />
      </div>
    );
  }

  // === Experiment flow: Welcome → Scenario → Chat → Survey ===
  if (isExperimentMode && experimentLoaded) {
    if (experimentPhase === "welcome") {
      return (
        <div className="relative flex flex-col h-full w-full">
          {contextHolder}
          <ContentHeader
            isMobileMenuOpen={false}
            onMobileMenuToggle={() => {}}
            isSidebarOpen={false}
            onToggleSidebar={() => {}}
            onNewSession={() => {}}
            experimentMode={true}
          />
          <div className="flex-1 overflow-y-auto">
            <ExperimentWelcome
              onConsent={(pid) => {
                setExperimentParticipantId(pid);
                // Log consent event
                fetch(`${getServerUrl()}/experiment/log`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    event_type: "consent_given",
                    participant_id: pid,
                    event_data: { timestamp: new Date().toISOString() },
                  }),
                }).catch(() => {});
                setExperimentPhase("scenario");
              }}
            />
          </div>
        </div>
      );
    }

    if (experimentPhase === "scenario") {
      return (
        <div className="relative flex flex-col h-full w-full">
          {contextHolder}
          <ContentHeader
            isMobileMenuOpen={false}
            onMobileMenuToggle={() => {}}
            isSidebarOpen={false}
            onToggleSidebar={() => {}}
            onNewSession={() => {}}
            experimentMode={true}
          />
          <div className="flex-1 overflow-y-auto">
            <ExperimentScenario
              condition={experimentConfig.experiment_condition}
              scenario={experimentConfig.experiment_task_scenario}
              onStart={() => {
                // Log scenario_read event
                fetch(`${getServerUrl()}/experiment/log`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    event_type: "scenario_read",
                    participant_id: experimentParticipantId,
                    event_data: { condition: experimentConfig.experiment_condition },
                  }),
                }).catch(() => {});
                setExperimentPhase("chat");
              }}
            />
          </div>
        </div>
      );
    }

    if (experimentPhase === "survey") {
      return (
        <div className="relative flex flex-col h-full w-full">
          {contextHolder}
          <ContentHeader
            isMobileMenuOpen={false}
            onMobileMenuToggle={() => {}}
            isSidebarOpen={false}
            onToggleSidebar={() => {}}
            onNewSession={() => {}}
            experimentMode={true}
          />
          <div className="flex-1 overflow-y-auto">
            <ExperimentSurvey
              participantId={experimentParticipantId}
              condition={experimentConfig.experiment_condition}
              sessionId={session?.id || null}
              onComplete={() => setExperimentPhase("done")}
            />
          </div>
        </div>
      );
    }

    if (experimentPhase === "done") {
      return (
        <div className="relative flex flex-col h-full w-full">
          {contextHolder}
          <ContentHeader
            isMobileMenuOpen={false}
            onMobileMenuToggle={() => {}}
            isSidebarOpen={false}
            onToggleSidebar={() => {}}
            onNewSession={() => {}}
            experimentMode={true}
          />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-primary">
              <h1 className="text-2xl font-bold mb-4">실험이 종료되었습니다</h1>
              <p className="text-secondary">
                참여해주셔서 감사합니다. 이 창을 닫아주세요.
              </p>
            </div>
          </div>
        </div>
      );
    }

    // experimentPhase === "chat" — show normal UI but with experiment tweaks
    // Hide sidebar, show survey button when task is complete
    return (
      <div className="relative flex flex-col h-full w-full">
        {contextHolder}

        <ContentHeader
          isMobileMenuOpen={isMobileMenuOpen}
          onMobileMenuToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          isSidebarOpen={false}
          onToggleSidebar={() => {}}
          onNewSession={() => {}}
          experimentMode={true}
        />

        <div className="flex flex-1 relative">
          <div className="flex-1 transition-all -mr-4 duration-200 w-[200px] ml-0">
            {session && sessions.length > 0 ? (
              <div className="pl-4">
                {chatViews}
                {/* Survey button — visible when a run is complete */}
                {session?.id &&
                  sessionRunStatuses[session.id] &&
                  ["complete", "stopped"].includes(
                    sessionRunStatuses[session.id]
                  ) && (
                    <div className="fixed bottom-24 right-8 z-50">
                      <button
                        onClick={() => setExperimentPhase("survey")}
                        className="px-6 py-3 rounded-full bg-accent text-white font-semibold shadow-lg hover:opacity-90 transition-opacity"
                      >
                        설문 시작하기
                      </button>
                    </div>
                  )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-secondary">
                <Spin size="large" tip={"Loading..."} />
              </div>
            )}
          </div>

          <SessionEditor
            session={editingSession}
            isOpen={isEditorOpen}
            onSave={handleSaveSession}
            onCancel={() => {
              setIsEditorOpen(false);
              setEditingSession(undefined);
            }}
          />
        </div>
      </div>
    );
  }

  // === Default (non-experiment) rendering ===
  return (
    <div className="relative flex flex-col h-full w-full">
      {contextHolder}

      <ContentHeader
        isMobileMenuOpen={isMobileMenuOpen}
        onMobileMenuToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        onNewSession={() => handleEditSession()}
      />

      <div className="flex flex-1 relative">
        <div
          className={`absolute left-0 top-0 h-full transition-all duration-200 ease-in-out ${
            isSidebarOpen ? "w-77" : "w-0"
          }`}
        >
          <Sidebar
            isOpen={isSidebarOpen}
            sessions={sessions}
            currentSession={session}
            onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
            onSelectSession={handleSelectSession}
            onEditSession={handleEditSession}
            onDeleteSession={handleDeleteSession}
            isLoading={isLoading}
            sessionRunStatuses={sessionRunStatuses}
            activeSubMenuItem={activeSubMenuItem}
            onSubMenuChange={setActiveSubMenuItem}
            onStopSession={(sessionId: number) => {
              if (sessionId === undefined || sessionId === null) return;
              const id = Number(sessionId);
              // Find the session's socket and close it, update status
              const ws = sessionSockets[id]?.socket;
              if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(
                  JSON.stringify({
                    type: "stop",
                    reason: "Cancelled by user (sidebar)",
                  })
                );
                ws.close();
              }
              setSessionRunStatuses((prev) => ({
                ...prev,
                [id]: "stopped",
              }));
            }}
          />
        </div>

        <div
          className={`flex-1 transition-all -mr-4 duration-200 w-[200px] ${
            isSidebarOpen ? "ml-64" : "ml-0"
          }`}
        >
          {
          activeSubMenuItem === "mcp_servers" ? (
            <div className="h-full overflow-hidden pl-4">
              <McpServersList />
            </div>
          ) : activeSubMenuItem === "saved_plan" ? (
            <div className="h-full overflow-hidden pl-4">
              <PlanList
                onTabChange={setActiveSubMenuItem}
                onSelectSession={handleSelectSession}
                onCreateSessionFromPlan={handleCreateSessionFromPlan}
              />
            </div>
          ) : session && sessions.length > 0 ? (
            <div className="pl-4">{chatViews}</div>
          ) : (
            <div className="flex items-center justify-center h-full text-secondary">
              <Spin size="large" tip={"Loading..."} />
            </div>
          )}
        </div>

        <SessionEditor
          session={editingSession}
          isOpen={isEditorOpen}
          onSave={handleSaveSession}
          onCancel={() => {
            setIsEditorOpen(false);
            setEditingSession(undefined);
          }}
        />
      </div>
    </div>
  );
};
