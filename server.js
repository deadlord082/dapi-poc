// server.js
import express from "express";
import fs from "fs";
import path from "path";


const app = express();
app.use(express.json());
app.use(express.static("public"));


// ------ CHARGEMENT DES DONNÉES OSM ------
const raw = JSON.parse(fs.readFileSync("graph.json", "utf8"));


// Construction du graphe
const nodes = {}; // clé : id OSM ; valeur : {lat, lon}
const graph = {}; // adjacency list : graph[nodeId] = [ { to, weight, danger } ]


raw.elements.forEach((el) => {
if (el.type === "way" && el.geometry) {
const isStairs = el.tags?.highway === "steps";
const isFootway = el.tags?.highway === "footway";
const isCycle = el.tags?.highway === "cycleway";


const dangerBase = (() => {
if (isStairs) return 10; // très inaccessible
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


const dist = Math.sqrt(Math.pow(a.lat - b.lat, 2) + Math.pow(a.lon - b.lon, 2));


graph[idA] ||= [];
graph[idB] ||= [];


graph[idA].push({ to: idB, weight: dist, danger: dangerBase });
graph[idB].push({ to: idA, weight: dist, danger: dangerBase });
}
}
});


// ------ DIJKSTRA ------
function dijkstra(startId, endId, mode) {
  const dist = {};
  const visited = {};
  const prev = {};

  Object.keys(graph).forEach((n) => (dist[n] = Infinity));
  dist[startId] = 0;

  while (true) {
    let u = null;
    let best = Infinity;
    for (const n of Object.keys(graph)) {
      if (!visited[n] && dist[n] < best) {
        best = dist[n];
        u = n;
      }
    }
    if (!u) break;
    if (u === endId) break;

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

// ------ ROUTE API ------
app.post("/route", (req, res) => {
  const { start, end, mode } = req.body;

  if (!nodes[start] || !nodes[end]) {
    return res.json({ error: "Invalid nodes" });
  }

  const path = dijkstra(start, end, mode);
  const coords = path.map((id) => nodes[id]);

  res.json({ path: coords });
});

// ------ LANCEMENT SERVEUR ------
app.listen(3000, () => console.log("🚀 Serveur démarré sur http://localhost:3000"));
