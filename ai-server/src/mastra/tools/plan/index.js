export * from './add-flight-to-plan.tool.js';
export * from './add-hotel-to-plan.tool.js';
export * from './get-travel-plan.tool.js';
export * from './plan-schemas.js';
export * from './remove-flight-from-plan.tool.js';
export * from './remove-hotel-from-plan.tool.js';
export * from './replace-flight-in-plan.tool.js';
export * from './set-travel-plan.tool.js';
// Registration-key names (as they appear on the AG-UI wire as toolCallName) of
// the internal plan tools. Their tool-call events are hidden from the client:
// the plan reaches the UI via STATE_SNAPSHOT instead.
export const INTERNAL_PLAN_TOOL_NAMES = [
  'getTravelPlanTool',
  'setTravelPlanTool',
  'addFlightToPlanTool',
  'removeFlightFromPlanTool',
  'replaceFlightInPlanTool',
  'addHotelToPlanTool',
  'removeHotelFromPlanTool',
];
