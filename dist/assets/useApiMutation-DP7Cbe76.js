import{o as e}from"./index-i8V55Av9.js";import{u as o}from"./useMutation-DbpuP15W.js";function s(s,n={}){const t=e(),{invalidateKeys:i=[],...u}=n;return o({mutationFn:s,onSuccess:(e,o,s,n)=>{i.forEach(e=>t.invalidateQueries({queryKey:e})),u.onSuccess?.(e,o,s,n)},...u})}export{s as u};
//# sourceMappingURL=useApiMutation-DP7Cbe76.js.map
