import type { NextConfig } from "next";
import path from "node:path";

const config: NextConfig = {
  output: "export",
  distDir: "out",
  outputFileTracingRoot: path.join(__dirname, "../../"),
};
export default config;
