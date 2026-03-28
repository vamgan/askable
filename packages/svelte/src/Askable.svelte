<script lang="ts">
  export let meta: Record<string, unknown> | string;
  export let as: string = 'div';

  $: dataAskable = typeof meta === 'string' ? meta : JSON.stringify(meta);
</script>

<svelte:element this={as} data-askable={dataAskable} {...$$restProps}>
  <slot />
</svelte:element>
