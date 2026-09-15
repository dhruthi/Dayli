import { create } from 'zustand';
import { FlowDefinition, SessionState, ChatMessage, UserProfile } from '../types/chatEngine';
import { WORKFLOWS } from '../flows';
import { ChatEngine } from '../engine/chatEngine';
import { useDevConsoleStore } from './useDevConsoleStore';

interface ChatStoreState {
  activeWorkflowId: string;
  activeFlow: FlowDefinition;
  chatEngine: ChatEngine | null;
  sessionState: SessionState | null;
  isTyping: boolean;

  // Actions
  selectWorkflow: (workflowId: string) => void;
  restartWorkflow: () => void;
  sendUserResponse: (response: any) => Promise<void>;
  updateUserProfile: (profile: Partial<UserProfile>) => void;
}

export const useChatStore = create<ChatStoreState>((set, get) => {
  const initialWorkflowId = 'general-care';
  const initialFlow = WORKFLOWS[initialWorkflowId];

  // Helper to construct new engine instance
  const createEngine = (flow: FlowDefinition, profile?: Partial<UserProfile>) => {
    const devStore = useDevConsoleStore.getState();
    const engine = new ChatEngine(
      flow,
      profile,
      (log) => devStore.addApiLog(log),
      (event) => devStore.addWebhookLog(event)
    );

    engine.subscribe((newState) => {
      devStore.updateSessionVariables(newState.variables);
      devStore.updateCurrentNode(flow.nodes[newState.currentNodeId || ''] || null);
      set({ sessionState: newState });
    });

    return engine;
  };

  const initialEngine = createEngine(initialFlow);

  return {
    activeWorkflowId: initialWorkflowId,
    activeFlow: initialFlow,
    chatEngine: initialEngine,
    sessionState: initialEngine.getState(),
    isTyping: false,

    selectWorkflow: (workflowId: string) => {
      const targetFlow = WORKFLOWS[workflowId] || WORKFLOWS['general-care'];
      const currentProfile = get().sessionState?.userProfile;
      useDevConsoleStore.getState().clearLogs();
      const newEngine = createEngine(targetFlow, currentProfile);

      set({
        activeWorkflowId: targetFlow.id,
        activeFlow: targetFlow,
        chatEngine: newEngine,
        sessionState: newEngine.getState(),
      });

      newEngine.start();
    },

    restartWorkflow: () => {
      const { chatEngine } = get();
      useDevConsoleStore.getState().clearLogs();
      if (chatEngine) {
        chatEngine.restart();
      }
    },

    sendUserResponse: async (response: any) => {
      const { chatEngine } = get();
      if (chatEngine) {
        set({ isTyping: true });
        await chatEngine.handleUserResponse(response);
        set({ isTyping: false });
      }
    },

    updateUserProfile: (profile: Partial<UserProfile>) => {
      const { sessionState } = get();
      if (sessionState) {
        const updated = { ...sessionState.userProfile, ...profile };
        set({
          sessionState: {
            ...sessionState,
            userProfile: updated,
          },
        });
      }
    },
  };
});
