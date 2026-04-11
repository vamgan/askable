# Third-Party Libraries

Libraries like AG Grid, TanStack Table, and chart libraries render their own DOM — you can't add `data-askable` attributes to internal rows or data points. Use `ctx.push()` to set focus from event callbacks instead.

## When to use `push()` vs `data-askable`

| Approach | When to use |
|---|---|
| `data-askable` attributes | You control the markup — custom tables, cards, lists |
| `ctx.push(meta, text)` | The library owns the DOM — AG Grid, TanStack, Recharts, etc. |

Both approaches produce the same `AskableFocus` objects, fire the same events, and work with all serialization methods.

## AG Grid

Wire AG Grid's event callbacks to `push()`:

### Row click tracking

```tsx
import { useAskable } from '@askable-ui/react';

function DealsTable({ rowData, columnDefs }) {
  const { ctx } = useAskable();

  return (
    <AgGridReact
      rowData={rowData}
      columnDefs={columnDefs}
      onRowClicked={(event) => {
        ctx.push(
          { widget: 'deals-table', rowIndex: event.rowIndex, ...event.data },
          `${event.data.company} — ${event.data.stage}`
        );
      }}
    />
  );
}
```

### Cell-level keyboard navigation

```tsx
<AgGridReact
  rowData={rowData}
  columnDefs={columnDefs}
  onCellFocused={(event) => {
    const row = event.api.getDisplayedRowAtIndex(event.rowIndex);
    if (row?.data) {
      ctx.push(
        { widget: 'deals-table', rowIndex: event.rowIndex, column: event.column?.colId },
        String(row.data[event.column?.colId] ?? '')
      );
    }
  }}
/>
```

### Row selection tracking

```tsx
<AgGridReact
  rowData={rowData}
  columnDefs={columnDefs}
  rowSelection="multiple"
  onSelectionChanged={(event) => {
    const selected = event.api.getSelectedRows();
    if (selected.length === 1) {
      ctx.push(
        { widget: 'deals-table', ...selected[0] },
        selected[0].company
      );
    } else if (selected.length > 1) {
      ctx.push(
        { widget: 'deals-table', selectedCount: selected.length },
        `${selected.length} rows selected`
      );
    }
  }}
/>
```

## TanStack Table

Use TanStack Table's row click handlers with `push()`:

```tsx
import { useAskable } from '@askable-ui/react';
import { flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';

function DataTable({ data, columns }) {
  const { ctx } = useAskable();
  const table = useReactTable({ data, columns, getCoreRowModel: getCoreRowModel() });

  return (
    <table>
      <tbody>
        {table.getRowModel().rows.map((row) => (
          <tr
            key={row.id}
            onClick={() => {
              ctx.push(
                { widget: 'data-table', rowIndex: row.index, ...row.original },
                Object.values(row.original).join(' — ')
              );
            }}
          >
            {row.getVisibleCells().map((cell) => (
              <td key={cell.id}>
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

## Chart libraries (Recharts, Chart.js, etc.)

Push context when a user clicks or hovers a data point:

### Recharts

```tsx
import { BarChart, Bar } from 'recharts';

function RevenueChart({ data }) {
  const { ctx } = useAskable();

  return (
    <BarChart data={data}>
      <Bar
        dataKey="revenue"
        onClick={(entry) => {
          ctx.push(
            { chart: 'revenue', period: entry.month },
            `${entry.month}: $${entry.revenue}`
          );
        }}
      />
    </BarChart>
  );
}
```

### Chart.js (via react-chartjs-2)

```tsx
import { Bar } from 'react-chartjs-2';

function SalesChart({ chartData }) {
  const { ctx } = useAskable();

  return (
    <Bar
      data={chartData}
      options={{
        onClick: (_event, elements) => {
          if (elements.length > 0) {
            const { index } = elements[0];
            const label = chartData.labels[index];
            const value = chartData.datasets[0].data[index];
            ctx.push({ chart: 'sales', label, value }, `${label}: ${value}`);
          }
        },
      }}
    />
  );
}
```

## Custom components (you control the markup)

When you control the rendered HTML, use `data-askable` directly — no `push()` needed:

```tsx
function CustomTable({ rows }) {
  return (
    <table>
      <tbody>
        {rows.map((row, i) => (
          <tr
            key={row.id}
            data-askable={JSON.stringify({ widget: 'table', rowIndex: i, ...row })}
            data-askable-text={`${row.company} — ${row.stage}`}
          >
            <td>{row.company}</td>
            <td>{row.stage}</td>
            <td>{row.value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

Clicks and hovers are tracked automatically — zero extra JavaScript.

## Vue and Svelte

The same `push()` pattern works in all frameworks:

::: code-group

```vue [Vue]
<script setup>
import { useAskable } from '@askable-ui/vue';

const { ctx } = useAskable();

function onRowClicked(event) {
  ctx.push(
    { widget: 'deals-table', rowIndex: event.rowIndex, ...event.data },
    event.data.company
  );
}
</script>

<template>
  <ag-grid-vue :rowData="rowData" @row-clicked="onRowClicked" />
</template>
```

```svelte [Svelte]
<script>
  import { createAskableStore } from '@askable-ui/svelte';

  const { ctx } = createAskableStore();

  function onRowClicked(event) {
    ctx.push(
      { widget: 'deals-table', rowIndex: event.detail.rowIndex, ...event.detail.data },
      event.detail.data.company
    );
  }
</script>

<AgGridSvelte {rowData} on:rowClicked={onRowClicked} />
```

:::

## Filtering by source

Use the `source` field to differentiate behavior based on how focus was set:

```ts
ctx.on('focus', (focus) => {
  if (focus.source === 'push') {
    // Programmatic — maybe update a sidebar without auto-opening chat
    updateSidebar(ctx.toPromptContext());
  } else if (focus.source === 'select') {
    // Explicit "Ask AI" — open the chat panel
    openChatPanel(ctx.toContext({ history: 5 }));
  }
  // 'dom' — passive observation, update context silently
});
```
