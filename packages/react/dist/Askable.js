import React from 'react';
export function Askable({ meta, as, children, ...props }) {
    const Tag = (as ?? 'div');
    const dataAskable = typeof meta === 'string' ? meta : JSON.stringify(meta);
    return React.createElement(Tag, { 'data-askable': dataAskable, ...props }, children);
}
//# sourceMappingURL=Askable.js.map