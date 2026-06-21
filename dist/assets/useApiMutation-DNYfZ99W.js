import{q as e}from"./index-D1keo-Yr.js";import{u as s}from"./useMutation-CJVSWcBi.js";function n(n,o={}){const t=e(),{invalidateKeys:i=[],...u}=o;return s({mutationFn:n,onSuccess:(e,s,n,o)=>{i.forEach(e=>t.invalidateQueries({queryKey:e})),u.onSuccess?.(e,s,n,o)},...u})}export{n as u};
//# sourceMappingURL=useApiMutation-DNYfZ99W.js.map
