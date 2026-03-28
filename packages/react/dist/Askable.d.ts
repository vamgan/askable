import React from 'react';
type AnyTag = keyof JSX.IntrinsicElements;
type AskableProps<T extends AnyTag = 'div'> = {
    meta: Record<string, unknown> | string;
    as?: T;
    children?: React.ReactNode;
} & Omit<JSX.IntrinsicElements[T], 'children'>;
export declare function Askable<T extends AnyTag = 'div'>({ meta, as, children, ...props }: AskableProps<T>): React.ReactElement<{
    'data-askable': string;
} & Omit<AskableProps<T>, "meta" | "children" | "as">, string | React.JSXElementConstructor<any>>;
export {};
//# sourceMappingURL=Askable.d.ts.map