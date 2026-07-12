import {
  type AngularActivityContentSchema,
  CopilotOpenGenerativeUIActivityRenderer,
  OPEN_GENERATIVE_UI_ACTIVITY_TYPE,
  type OpenGenerativeUIContent,
  OpenGenerativeUIContentSchema,
  type RenderActivityMessageConfig,
} from '@copilotkit/angular';

const openGenerativeUiContentSchema: AngularActivityContentSchema<OpenGenerativeUIContent> =
  {
    safeParse: (content) => {
      const result = OpenGenerativeUIContentSchema.safeParse(content);
      return result.success
        ? { success: true, data: result.data }
        : { success: false };
    },
  };

export const openGenerativeUiActivityRendererConfig: RenderActivityMessageConfig<OpenGenerativeUIContent> =
  {
    activityType: OPEN_GENERATIVE_UI_ACTIVITY_TYPE,
    content: openGenerativeUiContentSchema,
    component: CopilotOpenGenerativeUIActivityRenderer,
  };
