import{q as e}from"./index-K_2-P69G.js";import{u as s}from"./useMutation-d1uTc2yx.js";function n(n,o={}){const t=e(),{invalidateKeys:i=[],...u}=o;return s({mutationFn:n,onSuccess:(e,s,n,o)=>{i.forEach(e=>t.invalidateQueries({queryKey:e})),u.onSuccess?.(e,s,n,o)},...u})}export{n as u};
//# sourceMappingURL=useApiMutation-UqqxEn06.js.map
