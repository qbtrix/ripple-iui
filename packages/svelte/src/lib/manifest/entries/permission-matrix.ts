import type { WidgetManifestEntry } from '../index.js';

export const permissionMatrixEntry: WidgetManifestEntry = {
  type: 'permission-matrix',
  category: 'vertical',
  description: 'Grid of roles vs. permissions with toggle checkboxes. Stored as flat map { "roleId__permissionId": boolean }.',
  props: {
    roles: { type: 'Array<{ id: string; label: string; description?: string }>', required: true, description: 'Role columns.' },
    permissions: { type: 'Array<{ id: string; label: string; description?: string }>', required: true, description: 'Permission rows.' },
    value: { type: 'Record<string, boolean>', required: false, description: 'Flat key map "roleId__permissionId" → boolean.' },
    readonly: { type: 'boolean', required: false, description: 'Disable toggling.' },
  },
  example: {
    type: 'permission-matrix',
    props: {
      roles: [
        { id: 'admin', label: 'Admin' },
        { id: 'editor', label: 'Editor' },
        { id: 'viewer', label: 'Viewer' },
      ],
      permissions: [
        { id: 'read', label: 'Read' },
        { id: 'create', label: 'Create' },
        { id: 'update', label: 'Update' },
        { id: 'delete', label: 'Delete' },
      ],
      value: {
        admin__read: true,
        admin__create: true,
        admin__update: true,
        admin__delete: true,
        editor__read: true,
        editor__create: true,
        editor__update: true,
        editor__delete: false,
        viewer__read: true,
        viewer__create: false,
        viewer__update: false,
        viewer__delete: false,
      },
    },
  },
};
