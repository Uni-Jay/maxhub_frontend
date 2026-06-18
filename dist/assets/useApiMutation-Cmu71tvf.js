import{o as e,z as n}from"./index-Cvf23uLh.js";function s(s,o={}){const a=e(),{invalidateKeys:i=[],...t}=o;return n({mutationFn:s,onSuccess:(e,n,s,o)=>{i.forEach(e=>a.invalidateQueries({queryKey:e})),t.onSuccess?.(e,n,s,o)},...t})}export{s as u};
//# sourceMappingURL=useApiMutation-Cmu71tvf.js.map
