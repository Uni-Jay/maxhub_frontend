import{i as e,p as n}from"./index-_W8UYUB0.js";function s(s,i={}){const a=e(),{invalidateKeys:o=[],...t}=i;return n({mutationFn:s,onSuccess:(e,n,s,i)=>{o.forEach(e=>a.invalidateQueries({queryKey:e})),t.onSuccess?.(e,n,s,i)},...t})}export{s as u};
//# sourceMappingURL=useApiMutation-C-ujfBQi.js.map
