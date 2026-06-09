const PORT = 8000;

const bundler = new Deno.Command("deno", {
  args: ["bundle", "--watch", "dying/main.ts", "--output", "dying/bundle.js", "--platform", "browser"],
  stdout: "inherit",
  stderr: "inherit",
}).spawn();

Deno.addSignalListener("SIGINT",  () => { bundler.kill("SIGTERM"); Deno.exit(0); });
Deno.addSignalListener("SIGTERM", () => { bundler.kill("SIGTERM"); Deno.exit(0); });

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js":   "application/javascript; charset=utf-8",
  ".css":  "text/css; charset=utf-8",
  ".png":  "image/png",
  ".svg":  "image/svg+xml",
  ".ico":  "image/x-icon",
};

const TEXT_EXTS = new Set([".html", ".js", ".css"]);

async function serve(path: string): Promise<Response> {
  try {
    const ext     = path.slice(path.lastIndexOf("."));
    const headers = {
      "Content-Type":  MIME[ext] ?? "application/octet-stream",
      "Cache-Control": "no-store",
    };
    if (TEXT_EXTS.has(ext)) {
      // Derive the directory portion of the path for placeholder substitution.
      // e.g. "./dying/index.html" → dir = "dying/" → %PLACEHOLDER_INDEX_DIR% = "/dying/"
      const dir  = path.replace(/^\.\//, "").replace(/[^/]+$/, "");
      const text = (await Deno.readTextFile(path))
        .replaceAll("%PLACEHOLDER_INDEX_DIR%", `/${dir}`);
      return new Response(text, { headers });
    }
    return new Response(await Deno.readFile(path), { headers });
  } catch {
    return new Response("not found", { status: 404 });
  }
}

Deno.serve({ port: PORT }, (req) => {
  const pathname = new URL(req.url).pathname;
  const path = pathname === "/" ? "./dying/index.html" : "." + pathname;
  return serve(path);
});

console.log(`http://localhost:${PORT}`);
