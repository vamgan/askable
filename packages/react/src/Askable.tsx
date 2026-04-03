import React from 'react';

type AnyTag = keyof JSX.IntrinsicElements;

type AskableProps<T extends AnyTag = 'div'> = {
  meta: Record<string, unknown> | string;
  as?: T;
  children?: React.ReactNode;
} & Omit<JSX.IntrinsicElements[T], 'children'>;

export function Askable<T extends AnyTag = 'div'>({
  meta,
  as,
  children,
  ...props
}: AskableProps<T>) {
  const Tag = (as ?? 'div') as AnyTag;
  const dataAskable = typeof meta === 'string' ? meta : JSON.stringify(meta);
  return React.createElement(Tag, { 'data-askable': dataAskable, ...props }, children);
}
