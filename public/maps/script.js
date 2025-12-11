// Initialize the map
const map = L.map("map").setView([45.761, 4.84], 16);
L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);

let start = null;
let end = null;
let poly = null;
let startMarker = null;
let endMarker = null;

// Function to find the nearest node from graph to a clicked point
async function nearestNode(latlng) {
  // Fetch all node IDs from the API once (optional: could cache nodes)
  // Here, we assume your API already loads the nodes in memory
  // We'll just approximate using the coordinate strings from graph keys
  // Since the API already has the nodes, we send raw lat/lon and let server find nearest
  return `${latlng.lat.toFixed(6)},${latlng.lng.toFixed(6)}`;
}

// Handle clicks on the map
map.on("click", async (e) => {
  if (!start) {
    start = e.latlng;
    startMarker = L.marker(start).addTo(map).bindPopup("Départ").openPopup();
  } else if (!end) {
    end = e.latlng;
    endMarker = L.marker(end).addTo(map).bindPopup("Arrivée").openPopup();
    await getRoute();
  } else {
    // Reset markers and path if clicking again
    if (startMarker) map.removeLayer(startMarker);
    if (endMarker) map.removeLayer(endMarker);
    if (poly) map.removeLayer(poly);

    start = e.latlng;
    end = null;
    startMarker = L.marker(start).addTo(map).bindPopup("Départ").openPopup();
    endMarker = null;
    poly = null;
  }
});

// Fetch route from serverless function
async function getRoute() {
  const modeSelect = document.getElementById("mode");
  const mode = modeSelect ? modeSelect.value : "normal";

  function nearestId(latlng) {
    // Send lat/lon to API; server should find the nearest graph node
    return `${latlng.lat.toFixed(6)},${latlng.lng.toFixed(6)}`;
  }

  const body = {
    start: nearestId(start),
    end: nearestId(end),
    mode: mode,
  };

  try {
    const res = await fetch("/api/route", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const json = await res.json();

    if (json.error) {
      alert(`Erreur: ${json.error}`);
      return;
    }

    if (poly) map.removeLayer(poly);

    poly = L.polyline(json.path.map((p) => [p.lat, p.lon]), { color: "blue" }).addTo(map);
    map.fitBounds(poly.getBounds());
  } catch (err) {
    console.error("Erreur lors de la récupération du chemin :", err);
  }
}
