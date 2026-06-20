import{q as e}from"./index-CQ5SdRvu.js";import{u as s}from"./useMutation-BSdEcUx4.js";function n(n,o={}){const t=e(),{invalidateKeys:i=[],...u}=o;return s({mutationFn:n,onSuccess:(e,s,n,o)=>{i.forEach(e=>t.invalidateQueries({queryKey:e})),u.onSuccess?.(e,s,n,o)},...u})}export{n as u};
//# sourceMappingURL=useApiMutation-CbVpUQ62.js.map
