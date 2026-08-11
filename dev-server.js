const http = require("http");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

const ROOT = __dirname;
const SITE = path.join(ROOT, "site");
const PORT = Number(process.env.PORT || 3000);
const apiHandler = require(path.join(ROOT, "api", "reading-status", "index.js"));
const qaHandler = require(path.join(ROOT, "api", "q-and-a", "index.js"));
const relationshipHandler = require(path.join(ROOT, "api", "relationship-package", "index.js"));
const deepReadingHandler = require(path.join(ROOT, "api", "deep-reading", "index.js"));
const specialHandler = require(path.join(ROOT, "api", "special-pack", "index.js"));
const callHandler = require(path.join(ROOT, "api", "call-pack", "index.js"));

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
};

function send(res, status, body, type = "text/plain; charset=utf-8") {
  res.writeHead(status, { "Content-Type": type, "X-Content-Type-Options": "nosniff" });
  res.end(body);
}

function serveStatic(req, res, pathname) {
  const requested = pathname === "/" ? "/index.html" : pathname;
  const filePath = path.resolve(SITE, "." + requested);
  if (!filePath.startsWith(path.resolve(SITE) + path.sep)) return send(res, 403, "Forbidden");

  fs.readFile(filePath, (error, data) => {
    if (error) return send(res, 404, "Not found");
    const type = MIME[path.extname(filePath).toLowerCase()] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": type, "X-Content-Type-Options": "nosniff" });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);

  if (url.pathname === "/api/reading-status") {
    req.query = Object.fromEntries(url.searchParams.entries());
    return apiHandler(req, res);
  }
  if (url.pathname === "/api/q-and-a") return qaHandler(req, res);
  if (url.pathname === "/api/relationship-package") return relationshipHandler(req, res);
  if (url.pathname === "/api/deep-reading") return deepReadingHandler(req, res);
  if (url.pathname === "/api/special-pack") return specialHandler(req, res);
  if (url.pathname === "/api/call-pack") return callHandler(req, res);
  if (url.pathname === "/q-and-a") return serveStatic(req, res, "/q-and-a.html");
  if (url.pathname === "/relationship-package") return serveStatic(req, res, "/relationship-package.html");
  if (url.pathname === "/deep-reading") return serveStatic(req, res, "/deep-reading.html");
  if (url.pathname === "/special-pack") return serveStatic(req, res, "/special-pack.html");
  if (url.pathname === "/call-pack") return serveStatic(req, res, "/call-pack.html");
  if (url.pathname === "/agreement") return serveStatic(req, res, "/agreement.html");

  if (req.method !== "GET" && req.method !== "HEAD") return send(res, 405, "Method not allowed");
  return serveStatic(req, res, url.pathname);
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Turboztarot168 Reading local server: http://127.0.0.1:${PORT}`);
  console.log(`Reading Status: http://127.0.0.1:${PORT}/reading-status.html`);
  console.log(`API: http://127.0.0.1:${PORT}/api/reading-status?bookingCode=TEST-BR-0001`);
});

