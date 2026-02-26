import { create } from "zustand";
import { getServerUrl } from "../components/utils";

export interface ExperimentConfig {
  experiment_mode: boolean;
  experiment_condition:
    | "single_agent"
    | "multi_blackbox"
    | "multi_transparent"
    | "multi_coplan"
    | "default";
  participant_id: string | null;
  experiment_task_scenario: string | null;
}

interface ExperimentState {
  config: ExperimentConfig;
  loaded: boolean;
  fetchConfig: () => Promise<void>;
}

const defaultConfig: ExperimentConfig = {
  experiment_mode: false,
  experiment_condition: "default",
  participant_id: null,
  experiment_task_scenario: null,
};

export const useExperimentStore = create<ExperimentState>()((set) => ({
  config: defaultConfig,
  loaded: false,
  fetchConfig: async () => {
    try {
      const response = await fetch(`${getServerUrl()}/experiment/config`);
      if (response.ok) {
        const result = await response.json();
        if (result.status && result.data) {
          set({ config: result.data, loaded: true });
          return;
        }
      }
    } catch (e) {
      // Silently fail — experiment config is optional
    }
    set({ config: defaultConfig, loaded: true });
  },
}));
