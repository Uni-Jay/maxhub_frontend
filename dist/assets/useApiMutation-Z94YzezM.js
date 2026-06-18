import{l as e,x as n}from"./index-CIz7ZMwr.js";function s(s,a={}){const i=e(),{invalidateKeys:o=[],...t}=a;return n({mutationFn:s,onSuccess:(e,n,s,a)=>{o.forEach(e=>i.invalidateQueries({queryKey:e})),t.onSuccess?.(e,n,s,a)},...t})}export{s as u};
//# sourceMappingURL=useApiMutation-Z94YzezM.js.map
