import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { useAskable, useAskableScreen } from '../index';
import type { AskableContext } from '@askable-ui/core';

describe('useAskable (React Native)', () => {
  it('returns null focus initially', () => {
    let seenFocus: unknown = Symbol('unset');

    function Consumer() {
      const { focus } = useAskable();
      seenFocus = focus;
      return null;
    }

    TestRenderer.create(<Consumer />);
    expect(seenFocus).toBeNull();
  });

  it('returns a context with push-based focus updates', () => {
    let seenCtx: AskableContext | null = null;
    let seenFocus: unknown = null;

    function Consumer() {
      const { ctx, focus } = useAskable();
      seenCtx = ctx;
      seenFocus = focus;
      return null;
    }

    act(() => {
      TestRenderer.create(<Consumer />);
    });

    act(() => {
      seenCtx!.push({ screen: 'analytics-card' }, 'Revenue card');
    });

    expect(seenFocus).toMatchObject({
      meta: { screen: 'analytics-card' },
      text: 'Revenue card',
      source: 'push',
    });
  });

  it('pushes active screen context into the shared askable context', () => {
    let seenCtx: AskableContext | null = null;

    function Consumer() {
      const { ctx } = useAskable();
      seenCtx = ctx;
      useAskableScreen({
        ctx,
        meta: { screen: 'RevenueScreen' },
        text: 'Revenue screen',
        active: true,
      });
      return null;
    }

    act(() => {
      TestRenderer.create(<Consumer />);
    });

    expect(seenCtx!.getFocus()).toMatchObject({
      meta: { screen: 'RevenueScreen' },
      text: 'Revenue screen',
      source: 'push',
    });
  });

  it('clears screen context when the screen becomes inactive', () => {
    let seenCtx: AskableContext | null = null;
    let renderer: TestRenderer.ReactTestRenderer;

    function Consumer({ active }: { active: boolean }) {
      const { ctx } = useAskable();
      seenCtx = ctx;
      useAskableScreen({
        ctx,
        meta: { screen: 'RevenueScreen' },
        text: 'Revenue screen',
        active,
      });
      return null;
    }

    act(() => {
      renderer = TestRenderer.create(<Consumer active={true} />);
    });

    expect(seenCtx!.getFocus()).toMatchObject({
      meta: { screen: 'RevenueScreen' },
      text: 'Revenue screen',
      source: 'push',
    });

    act(() => {
      renderer!.update(<Consumer active={false} />);
    });

    expect(seenCtx!.getFocus()).toBeNull();
  });
});
