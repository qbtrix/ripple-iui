import type { WidgetManifestEntry } from '../index.js';

export const fileUploadEntry: WidgetManifestEntry = {
  type: 'file-upload',
  category: 'input',
  description: 'Drag-and-drop file upload with file list display, accept-type filtering, and size limits.',
  props: {
    label: { type: 'string', required: false, description: 'Label text.' },
    bind: { type: 'string', required: false, description: 'Two-way state path for files array.' },
    accept: { type: 'string', required: false, description: 'Accept attribute (e.g. "image/*", ".pdf,.docx").' },
    multiple: { type: 'boolean', required: false, description: 'Allow multiple files.' },
    maxSize: { type: 'number', required: false, description: 'Max bytes per file.' },
    maxFiles: { type: 'number', required: false, description: 'Max number of files.' },
    helperText: { type: 'string', required: false, description: 'Helper text below dropzone.' },
    hideFileList: { type: 'boolean', required: false, description: 'Hide file list under dropzone.' },
    disabled: { type: 'boolean', required: false, description: 'Disable upload.' },
    on_change: { type: 'EventAction', required: false, description: 'Fired when files are added.' },
    on_error: { type: 'EventAction', required: false, description: 'Fired on validation error.' },
  },
  example: { type: 'file-upload', props: { label: 'Upload documents', accept: '.pdf,.docx', multiple: true, maxSize: 10485760, maxFiles: 5, bind: '{state.uploadedFiles}' } },
};
