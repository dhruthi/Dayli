import { useEffect, useRef } from 'react';
import { useChatStore } from '../store/useChatStore';
import { usePresentationStore } from '../store/usePresentationStore';

export function usePresentationAutoPlay() {
  const { sessionState, activeFlow, sendUserResponse } = useChatStore();
  const { isPresentationMode, isPlaying, speedMultiplier } = usePresentationStore();
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isPresentationMode || !isPlaying || !sessionState || !activeFlow) {
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    if (sessionState.status !== 'waiting_user_input') {
      return;
    }

    const currentNodeId = sessionState.currentNodeId;
    if (!currentNodeId) return;

    const currentNode = activeFlow.nodes[currentNodeId];
    if (!currentNode || !currentNode.presentationAutoResponse) return;

    const autoResp = currentNode.presentationAutoResponse;
    const baseDelay = autoResp.delayMs || 2000;
    const adjustedDelay = Math.max(400, Math.round(baseDelay / speedMultiplier));

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      if (!usePresentationStore.getState().isPlaying) return;

      if (autoResp.action === 'click_button') {
        const btn = [...(currentNode.buttons || []), ...(currentNode.quickReplies || [])].find(
          (b) => b.id === autoResp.value
        );
        sendUserResponse({
          type: 'button_click',
          buttonId: autoResp.value,
          buttonTitle: btn?.title || 'Option',
        });
      } else if (autoResp.action === 'select_list') {
        sendUserResponse({
          type: 'list_select',
          optionId: autoResp.value,
        });
      } else if (autoResp.action === 'send_location') {
        sendUserResponse({
          type: 'send_location',
          location: {
            latitude: 28.6139,
            longitude: 77.209,
            name: 'New Delhi Central GPS',
          },
        });
      } else if (autoResp.action === 'submit_form') {
        sendUserResponse({
          type: 'submit_form',
          formData: autoResp.formData || { riskScore: 'High', symptomsList: ['Dizziness', 'Fever'] },
        });
      }
    }, adjustedDelay);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [
    isPresentationMode,
    isPlaying,
    speedMultiplier,
    sessionState?.currentNodeId,
    sessionState?.status,
    sessionState?.messages.length,
  ]);
}
