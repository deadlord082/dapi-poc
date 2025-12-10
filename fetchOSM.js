import fetch from "node-fetch";
import fs from "fs";

const bbox = "45.7600,4.8400,45.7620,4.8420";

const query = `
[out:json][timeout:60];
way["highway"](45.7600,4.8400,45.7620,4.8420);
out body;
>;
out skel qt;
`;

async function fetchOSM() {
  console.log("⏳ Récupération des données OSM...");

  const response = await fetch("https://overpass.kumi.systems/api/interpreter", {
    method: "POST",
    body: query,
    headers: { "Content-Type": "text/plain" },
  });

  const text = await response.text();

  let json;
  try {
    json = JSON.parse(text);
  } catch (e) {
    console.error("Impossible de parser la réponse JSON. Voici la réponse brute :\n", text);
    return;
  }

  fs.writeFileSync("graph.json", JSON.stringify(json, null, 2));
  console.log("✅ Données enregistrées dans graph.json");
}

fetchOSM();
