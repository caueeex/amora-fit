// Inicia o Vitest com o cwd normalizado.
// No Windows, um caminho com a letra da unidade em minúscula ("c:\...", comum em
// terminais do VS Code) faz o Vitest carregar o runner duas vezes e falhar com
// "Cannot read properties of undefined (reading 'config')".
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";

const cwd = process.cwd().replace(/^([a-z]):/, (_, d) => `${d.toUpperCase()}:`);
const require = createRequire(path.join(cwd, "package.json"));
const bin = path.join(path.dirname(require.resolve("vitest/package.json")), "vitest.mjs");

const child = spawn(process.execPath, [bin, ...process.argv.slice(2)], { cwd, stdio: "inherit" });
child.on("exit", (code) => process.exit(code ?? 1));
