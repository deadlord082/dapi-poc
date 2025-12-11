const map = L.map("map").setView([45.761, 4.84], 16);
L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);


let start = null;
let end = null;
let poly = null;


map.on("click", (e) => {
if (!start) {
start = e.latlng;
L.marker(start).addTo(map).bindPopup("Départ").openPopup();
} else if (!end) {
end = e.latlng;
L.marker(end).addTo(map).bindPopup("Arrivée").openPopup();
getRoute();
}
});


async function getRoute() {
const mode = document.getElementById("mode").value;


function nearestId(latlng) {
return `${latlng.lat.toFixed(6)},${latlng.lng.toFixed(6)}`;
}


const body = {
start: nearestId(start),
end: nearestId(end),
mode,
};


const res = await fetch("/api/route", {
method: "POST",
headers: { "Content-Type": "application/json" },
body: JSON.stringify(body),
});


const json = await res.json();


if (poly) map.removeLayer(poly);


poly = L.polyline(json.path.map((p) => [p.lat, p.lon])).addTo(map);
map.fitBounds(poly.getBounds());
}