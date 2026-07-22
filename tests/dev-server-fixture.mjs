import { writeFileSync } from "node:fs";

const mode = process.argv[2] ?? "idle";
const pidFile = process.env.CAREER_HQ_GUARD_TEST_PID_FILE;

if (pidFile) {
  writeFileSync(pidFile, String(process.pid), "utf8");
}

if (mode === "exit-failure") {
  setTimeout(() => process.exit(7), 100);
} else if (mode === "allocate") {
  const blocks = [];
  setInterval(() => {
    blocks.push(Buffer.alloc(8 * 1024 * 1024, 1));
  }, 75);
} else {
  setInterval(() => {}, 1000);
}
