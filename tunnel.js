const { spawn } = require("child_process");

const proc = spawn("C:\\ngrok\\ngrok.exe", ["start", "stream", "--config", "C:\\ngrok\\ngrok.yml"], {
  stdio: "inherit"
});

proc.on("close", function(code) {
  process.exit(code);
});
