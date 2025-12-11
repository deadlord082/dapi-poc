// api/route.js

import fs from "fs";
import path from "path";

let graphData = null;
let nodes = {};
let graph = {};

// --------- Charger le graph.json une seule fois ---------
function loadGraph() {
  if (graphData) return;

  const filePath = path.join(process.cwd(), "graph.json");
  graphData = JSON.parse(fs.readFileSync(filePath, "utf8"));

  graphData.elements.forEach((el) => {
    if (el.type === "way" && el.geometry) {
      const isStairs = el.tags?.highway === "steps";
      const isFootway = el.tags?.highway === "footway";
      const isCycle = el.tags?.highway === "cycleway";

      const dangerBase = (() => {
        if (isStairs) return 10;
        if (isFootway) return 2;
        if (isCycle) return 1;
        return 3;
      })();

      for (let i = 0; i < el.geometry.length - 1; i++) {
        const a = el.geometry[i];
        const b = el.geometry[i + 1];

        const idA = `${a.lat},${a.lon}`;
        const idB = `${b.lat},${b.lon}`;

        nodes[idA] = a;
        nodes[idB] = b;

        const dist = Math.sqrt((a.lat - b.lat)**2 + (a.lon - b.lon)**2);

        graph[idA] ||= [];
        graph[idB] ||= [];

        graph[idA].push({ to: idB, weight: dist, danger: dangerBase });
        graph[idB].push({ to: idA, weight: dist, danger: dangerBase });
      }
    }
  });
}

// --------- Dijkstra ---------
function dijkstra(startId, endId, mode) {
  const dist = {};
  const visited = {};
  const prev = {};

  Object.keys(graph).forEach((n) => (dist[n] = Infinity));
  dist[startId] = 0;

  while (true) {
    let u = null;
    let best = Infinity;
    for (const n in dist) {
      if (!visited[n] && dist[n] < best) {
        best = dist[n];
        u = n;
      }
    }

    if (!u || u === endId) break;

    visited[u] = true;

    for (const edge of graph[u]) {
      const cost = mode === "safe" ? edge.weight * (1 + edge.danger) : edge.weight;
      const nd = dist[u] + cost;
      if (nd < dist[edge.to]) {
        dist[edge.to] = nd;
        prev[edge.to] = u;
      }
    }
  }

  const path = [];
  let cur = endId;
  while (cur) {
    path.unshift(cur);
    cur = prev[cur];
  }

  return path;
}

// --------- Endpoint Serverless ---------
export default function handler(req, res) {
  loadGraph();

  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST only" });
  }

  const { start, end, mode } = req.body;

  if (!nodes[start] || !nodes[end]) {
    return res.status(400).json({ error: "Invalid nodes" });
  }

  const path = dijkstra(start, end, mode);
  const coords = path.map((id) => nodes[id]);

  return res.status(200).json({ path: coords });
}
