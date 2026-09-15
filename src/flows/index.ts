import generalCareFlow from './general-care.json';
import referralFlow from './referral.json';
import medicationFlow from './medication.json';
import { FlowDefinition } from '../types/chatEngine';

export const WORKFLOWS: Record<string, FlowDefinition> = {
  'general-care': generalCareFlow as FlowDefinition,
  referral: referralFlow as FlowDefinition,
  medication: medicationFlow as FlowDefinition,
};

export const WORKFLOW_LIST = Object.values(WORKFLOWS);

export function getWorkflowById(id: string): FlowDefinition | undefined {
  return WORKFLOWS[id];
}
