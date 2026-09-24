import type { WidgetManifestEntry } from '../index.js';

export const commentThreadEntry: WidgetManifestEntry = {
  type: 'comment-thread',
  category: 'vertical',
  description: 'Nested comment thread with avatars, timestamps, and optional reply buttons. Supports arbitrary depth.',
  props: {
    comments: { type: 'Array<{ id: string | number; author: string; avatar?: string; body: string; timestamp?: string; replies?: Comment[] }>', required: true, description: 'Hierarchical comment tree.' },
    canReply: { type: 'boolean', required: false, description: 'Show reply button. Default true.' },
  },
  example: {
    type: 'comment-thread',
    props: {
      canReply: true,
      comments: [
        {
          id: '1',
          author: 'Sarah Chen',
          body: 'Great work on the design system!',
          timestamp: '2 hours ago',
          replies: [
            { id: '1a', author: 'Alex Rodriguez', body: 'Thanks Sarah! Spent a lot of time on accessibility.', timestamp: '1 hour ago' },
          ],
        },
        { id: '2', author: 'Jordan Kim', body: 'Any plans to support custom tokens?', timestamp: '45 minutes ago' },
      ],
    },
  },
};
