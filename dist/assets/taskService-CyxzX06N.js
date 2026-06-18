import{q as s}from"./index-_W8UYUB0.js";const t={getAll:(t={})=>s.getRaw("/tasks",t),getById:t=>s.get(`/tasks/${t}`),create:t=>s.post("/tasks",t),update:(t,a)=>s.patch(`/tasks/${t}`,a),updateStatus:(t,a)=>s.patch(`/tasks/${t}/status`,{status:a}),assign:(t,a)=>s.patch(`/tasks/${t}/assign`,{assigneeId:a}),remove:t=>s.delete(`/tasks/${t}`)};export{t};
//# sourceMappingURL=taskService-CyxzX06N.js.map
