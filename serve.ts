import { serveDir, serveFile } from "jsr:@std/http/file-server";

const PORT = 8000;

function noCache(res: Response): Response {
  res.headers.set("Cache-Control", "no-store");
  return res;
}

Deno.serve({ port: PORT }, async (req) => {
  const url = new URL(req.url);

  if (url.pathname === "/" || url.pathname === "") {
    return noCache(await serveFile(req, new URL("./dying/index.html", import.meta.url).pathname));
  }

  return noCache(await serveDir(req, { fsRoot: ".", quiet: true }));
});

console.log(`Serving at http://localhost:${PORT}`);
