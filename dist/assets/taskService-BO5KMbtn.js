import{t as s}from"./index-B3tOpH8j.js";const t={getAll:(t={})=>s.getRaw("/tasks",t),getById:t=>s.get(`/tasks/${t}`),create:t=>s.post("/tasks",t),update:(t,a)=>s.patch(`/tasks/${t}`,a),updateStatus:(t,a)=>s.patch(`/tasks/${t}/status`,{status:a}),assign:(t,a)=>s.patch(`/tasks/${t}/assign`,{assigneeId:a}),remove:t=>s.delete(`/tasks/${t}`)};export{t};
//# sourceMappingURL=taskService-BO5KMbtn.js.map
