const { spawn } = require("node:child_process");

const mode = (process.argv[2] || "dev").toLowerCase();
const isProdMode = mode === "start" || mode === "prod" || mode === "production" || mode === "serve";
const frontendScript = isProdMode ? "start" : "dev";
const npmCli = process.env.npm_execpath;

if (!npmCli) {
  console.error("Unable to locate npm executable from npm_execpath.");
  process.exit(1);
}

const child = spawn(process.execPath, [npmCli, "--prefix", "frontend", "run", frontendScript], {
  stdio: "inherit",
});

child.on("exit", (code) => {
  process.exit(code ?? 0);
});

child.on("error", (error) => {
  console.error("Failed to start frontend:", error.message);
  process.exit(1);
});
