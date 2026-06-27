import { defineRailway, github, project, service } from "railway/iac";

export default defineRailway(() => {
  const web = service("web", {
    source: github("archers-technologies/Velon_ERP"),
    build: "bun run build",
  });

  return project("Velon_ERP", {
    resources: [web],
  });
});
