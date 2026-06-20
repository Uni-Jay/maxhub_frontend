import{q as e}from"./index-Dr0QjRxq.js";import{u as s}from"./useMutation-CvkKlhsH.js";function n(n,o={}){const t=e(),{invalidateKeys:i=[],...u}=o;return s({mutationFn:n,onSuccess:(e,s,n,o)=>{i.forEach(e=>t.invalidateQueries({queryKey:e})),u.onSuccess?.(e,s,n,o)},...u})}export{n as u};
//# sourceMappingURL=useApiMutation-D7i-GRiN.js.map
