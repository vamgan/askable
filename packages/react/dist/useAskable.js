import { useState, useEffect, useRef } from 'react';
import { createAskableContext } from '@askable-ui/core';
let globalCtx = null;
let refCount = 0;
function getGlobalCtx(events) {
    if (!globalCtx) {
        globalCtx = createAskableContext();
        globalCtx.observe(document, { events });
    }
    return globalCtx;
}
export function useAskable(options) {
    const ctx = useRef(getGlobalCtx(options?.events));
    const [focus, setFocus] = useState(() => ctx.current.getFocus());
    useEffect(() => {
        refCount++;
        const current = ctx.current;
        const handler = (f) => setFocus(f);
        current.on('focus', handler);
        return () => {
            current.off('focus', handler);
            refCount--;
            if (refCount === 0) {
                globalCtx?.destroy();
                globalCtx = null;
            }
        };
    }, []);
    return {
        focus,
        promptContext: ctx.current.toPromptContext(),
        ctx: ctx.current,
    };
}
//# sourceMappingURL=useAskable.js.map