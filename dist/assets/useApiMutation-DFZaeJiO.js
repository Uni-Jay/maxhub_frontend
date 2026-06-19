import{o as e}from"./index-CqxzKTgL.js";import{u as o}from"./useMutation-DyucjPAd.js";function s(s,n={}){const t=e(),{invalidateKeys:i=[],...u}=n;return o({mutationFn:s,onSuccess:(e,o,s,n)=>{i.forEach(e=>t.invalidateQueries({queryKey:e})),u.onSuccess?.(e,o,s,n)},...u})}export{s as u};
//# sourceMappingURL=useApiMutation-DFZaeJiO.js.map
