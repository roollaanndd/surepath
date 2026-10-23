// The prompt dialog replaces window.prompt() on the tier-decision path, where
// the text it collects is audit context. These cover the contract callers rely
// on: the value comes back on confirm, null on dismissal, and a required field
// cannot be submitted blank.
import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { ConfirmDialogProvider, usePromptDialog, useConfirmDialog } from '../../components/ui/ConfirmDialog';

const PromptHarness: React.FC<{ required?: boolean; onResult: (v: string | null) => void }> = ({ required, onResult }) => {
  const promptDialog = usePromptDialog();
  return (
    <button
      onClick={async () => {
        const v = await promptDialog({
          title: 'Tolak permintaan tier?',
          input: { label: 'Alasan penolakan', required },
          confirmLabel: 'Tolak',
        });
        onResult(v);
      }}
    >
      buka
    </button>
  );
};

const open = async (ui: React.ReactElement) => {
  render(<ConfirmDialogProvider>{ui}</ConfirmDialogProvider>);
  fireEvent.click(screen.getByRole('button', { name: 'buka' }));
  await screen.findByRole('dialog');
};

const type = (text: string) =>
  fireEvent.change(screen.getByLabelText('Alasan penolakan'), { target: { value: text } });

describe('usePromptDialog', () => {
  it('resolves with the text that was typed', async () => {
    let result: string | null | undefined;
    await open(<PromptHarness onResult={v => { result = v; }} />);

    type('Dokumen tidak lengkap');
    fireEvent.click(screen.getByRole('button', { name: 'Tolak' }));

    await waitFor(() => expect(result).toBe('Dokumen tidak lengkap'));
  });

  it('resolves to null when dismissed, so the caller can bail out', async () => {
    let result: string | null | undefined;
    await open(<PromptHarness onResult={v => { result = v; }} />);

    fireEvent.click(screen.getByRole('button', { name: 'Batal' }));

    await waitFor(() => expect(result).toBeNull());
  });

  it('accepts an empty answer when the field is optional', async () => {
    // Matches the window.prompt() semantics the tier screen relied on: cancel
    // means stop, an empty string means proceed with no reason recorded.
    let result: string | null | undefined;
    await open(<PromptHarness onResult={v => { result = v; }} />);

    fireEvent.click(screen.getByRole('button', { name: 'Tolak' }));

    await waitFor(() => expect(result).toBe(''));
  });

  it('blocks confirmation while a required field is blank or whitespace', async () => {
    let result: string | null | undefined;
    await open(<PromptHarness required onResult={v => { result = v; }} />);

    const submit = () => screen.getByRole('button', { name: 'Tolak' }) as HTMLButtonElement;
    expect(submit().disabled).toBe(true);

    type('   ');
    expect(submit().disabled).toBe(true);

    type('Alasan nyata');
    expect(submit().disabled).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: 'Tolak' }));

    await waitFor(() => expect(result).toBe('Alasan nyata'));
  });

  it('settles a stranded caller when a second dialog opens over the first', async () => {
    const seen: (string | null)[] = [];
    await open(<PromptHarness onResult={v => { seen.push(v); }} />);

    // Opening again while one is pending must not leave the first promise
    // hanging forever — it settles as a dismissal.
    fireEvent.click(screen.getByRole('button', { name: 'buka' }));
    await waitFor(() => expect(seen).toEqual([null]));
  });
});

describe('useConfirmDialog', () => {
  const BoolHarness: React.FC<{ onResult: (v: boolean) => void }> = ({ onResult }) => {
    const confirm = useConfirmDialog();
    return (
      <button onClick={async () => onResult(await confirm({ title: 'Nonaktifkan tier?', variant: 'danger' }))}>
        buka
      </button>
    );
  };

  it('still resolves to a plain boolean', async () => {
    let result: boolean | undefined;
    render(<ConfirmDialogProvider><BoolHarness onResult={v => { result = v; }} /></ConfirmDialogProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'buka' }));
    await screen.findByRole('dialog');

    fireEvent.click(screen.getByRole('button', { name: 'Konfirmasi' }));

    await waitFor(() => expect(result).toBe(true));
  });

  it('renders no input when none was asked for', async () => {
    render(<ConfirmDialogProvider><BoolHarness onResult={() => {}} /></ConfirmDialogProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'buka' }));
    await screen.findByRole('dialog');

    expect(screen.queryByRole('textbox')).toBeNull();
  });
});
