// src/lib/widgets/input/FileUpload.test.ts
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import FileUpload from './FileUpload.svelte';

function makeFile(name: string, size: number, type = 'text/plain') {
  const f = new File([new Uint8Array(size)], name, { type });
  Object.defineProperty(f, 'size', { value: size });
  return f;
}

describe('FileUpload', () => {
  it('renders the dropzone with a label and default copy', () => {
    const { container, getByText } = render(FileUpload, {
      props: { label: 'Upload', helperText: 'PNG up to 5MB' }
    });
    expect(getByText('Upload')).not.toBeNull();
    expect(container.textContent).toContain('Drop a file here or');
    expect(container.textContent).toContain('PNG up to 5MB');
  });

  it('renders chips for files passed via `value`', () => {
    const f = makeFile('hello.txt', 1234);
    const { container } = render(FileUpload, {
      props: { value: [{ name: f.name, size: f.size, type: f.type, file: f }] }
    });
    expect(container.textContent).toContain('hello.txt');
    expect(container.textContent).toContain('1.2 KB');
  });

  it('does not render the file list when hideFileList is true', () => {
    const f = makeFile('secret.txt', 100);
    const { container } = render(FileUpload, {
      props: {
        hideFileList: true,
        value: [{ name: f.name, size: f.size, type: f.type, file: f }]
      }
    });
    expect(container.textContent).not.toContain('secret.txt');
  });

  it('emits onchange with the remaining files when remove is clicked', async () => {
    const onchange = vi.fn();
    const a = makeFile('a.txt', 10);
    const b = makeFile('b.txt', 20);
    const { container } = render(FileUpload, {
      props: {
        value: [
          { name: a.name, size: a.size, type: a.type, file: a },
          { name: b.name, size: b.size, type: b.type, file: b }
        ],
        onchange
      }
    });
    const removeBtn = container.querySelector('[aria-label="Remove a.txt"]') as HTMLElement;
    expect(removeBtn).not.toBeNull();
    await fireEvent.click(removeBtn);
    expect(onchange).toHaveBeenCalledTimes(1);
    expect(onchange.mock.calls[0][0]).toHaveLength(1);
    expect(onchange.mock.calls[0][0][0].name).toBe('b.txt');
  });

  it('shows "Drop files here" plural copy when multiple is true', () => {
    const { container } = render(FileUpload, { props: { multiple: true } });
    expect(container.textContent).toContain('Drop files here or');
  });
});
