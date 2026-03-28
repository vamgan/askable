import type { VueWrapper } from '@vue/test-utils';

const wrappers: VueWrapper[] = [];

export function track(w: VueWrapper): VueWrapper {
  wrappers.push(w);
  return w;
}

export function cleanup(): void {
  wrappers.forEach((w) => w.unmount());
  wrappers.length = 0;
}
