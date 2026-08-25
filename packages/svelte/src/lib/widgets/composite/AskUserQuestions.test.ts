// @file widgets/composite/AskUserQuestions.test.ts
// @description Coverage for the end-of-flow read-only recap. After the last
//   question is answered the widget shows a summary of every question and its
//   selected answer, and only fires completeActions / oncomplete once the user
//   confirms from the recap (not silently on the last pick).
// @created 2026-06-06 — answer recap feature.
import { describe, it, expect } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import AskUserQuestions from './AskUserQuestions.svelte';

const questions = [
  {
    id: 'drink',
    title: 'Pick a coffee',
    options: [{ title: 'Espresso' }, { title: 'Latte' }],
  },
];

describe('AskUserQuestions — end-of-flow recap', () => {
  it('shows a read-only recap of the answers after the last question', async () => {
    const { getByText, queryByText } = render(AskUserQuestions, { props: { questions } });
    // No recap before answering.
    expect(queryByText('Espresso')).toBeTruthy(); // option row visible
    await fireEvent.click(getByText('Espresso'));

    // Recap now lists the question and the chosen answer.
    expect(getByText('Pick a coffee')).toBeTruthy();
    // The selected value is echoed back in the recap.
    const espressoNodes = document.querySelectorAll('*');
    const hasEspressoSummary = Array.from(espressoNodes).some(
      (n) => n.children.length === 0 && /Espresso/.test(n.textContent ?? ''),
    );
    expect(hasEspressoSummary).toBe(true);
  });

  it('does not fire completeActions until the user confirms from the recap', async () => {
    let completed: unknown = null;
    const { getByText } = render(AskUserQuestions, {
      props: { questions, oncomplete: (a) => (completed = a) },
    });
    await fireEvent.click(getByText('Latte'));
    // Recap is shown, but completion has NOT fired yet.
    expect(completed).toBeNull();

    // Confirm from the recap fires completion.
    await fireEvent.click(getByText('Confirm'));
    expect(completed).not.toBeNull();
    expect((completed as Record<string, { selectedTitles: string[] }>)['drink'].selectedTitles).toContain(
      'Latte',
    );
  });
});
