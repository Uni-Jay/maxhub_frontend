import{o as e}from"./index-DsuvpTFq.js";import{u as o}from"./useMutation-C_kkJiW1.js";function s(s,n={}){const t=e(),{invalidateKeys:i=[],...u}=n;return o({mutationFn:s,onSuccess:(e,o,s,n)=>{i.forEach(e=>t.invalidateQueries({queryKey:e})),u.onSuccess?.(e,o,s,n)},...u})}export{s as u};
//# sourceMappingURL=useApiMutation-Bx1Y1pMa.js.map
