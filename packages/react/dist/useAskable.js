import { useState, useEffect, useRef } from 'react';
import { createAskableContext } from '@askable/core';
let globalCtx = null;
let refCount = 0;
function getGlobalCtx() {
    if (!globalCtx) {
        globalCtx = createAskableContext();
        globalCtx.observe(document);
    }
    return globalCtx;
}
export function useAskable() {
    const ctx = useRef(getGlobalCtx());
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