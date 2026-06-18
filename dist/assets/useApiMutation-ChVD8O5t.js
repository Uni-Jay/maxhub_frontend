import{i as e,s}from"./index-B3tOpH8j.js";function n(n,i={}){const a=e(),{invalidateKeys:o=[],...t}=i;return s({mutationFn:n,onSuccess:(e,s,n,i)=>{o.forEach(e=>a.invalidateQueries({queryKey:e})),t.onSuccess?.(e,s,n,i)},...t})}export{n as u};
//# sourceMappingURL=useApiMutation-ChVD8O5t.js.map
