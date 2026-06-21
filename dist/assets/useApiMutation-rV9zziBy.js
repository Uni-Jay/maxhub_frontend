import{q as e}from"./index-DM-s16al.js";import{u as s}from"./useMutation-B20N8b6h.js";function n(n,o={}){const t=e(),{invalidateKeys:i=[],...u}=o;return s({mutationFn:n,onSuccess:(e,s,n,o)=>{i.forEach(e=>t.invalidateQueries({queryKey:e})),u.onSuccess?.(e,s,n,o)},...u})}export{n as u};
//# sourceMappingURL=useApiMutation-rV9zziBy.js.map
