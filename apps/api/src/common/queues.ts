export const PUBLISH_QUEUE = 'publish-queue';
export const ANALYTICS_QUEUE = 'analytics-queue';

export type PublishJobData = {
  scheduledPostId: string;
  force?: boolean;
};

export type AnalyticsJobData = {
  platformPostVariantId: string;
};
