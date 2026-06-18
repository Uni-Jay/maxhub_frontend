import{q as e}from"./index-_W8UYUB0.js";const t={getAll:(t={})=>e.getRaw("/projects",t),getById:t=>e.get(`/projects/${t}`),create:t=>e.post("/projects",t),update:(t,s)=>e.patch(`/projects/${t}`,s),getTasks:t=>e.get(`/projects/${t}/tasks`),getMilestones:t=>e.get(`/projects/${t}/milestones`),getTeam:t=>e.get(`/projects/${t}/team`)};export{t as p};
//# sourceMappingURL=projectService-x9EcwEx0.js.map
