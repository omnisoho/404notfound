// public/map.js

// ===== Mapbox token from window (set in map.html) =====
mapboxgl.accessToken = window.MAPBOX_TOKEN;

// ===== Simple state =====
const appState = {
  map: null,
  activities: [],
  routeSourceId: "route-line",
  routeLayerId: "route-layer",
  startMarker: null,
  endMarker: null,
  activityMarkers: [],
  favourites: [],
  selectedActivityId: null,
  customActivities: [],           // array of {id, name, city, country, longitude, latitude}
  customActivityMarkers: {},      // id -> Marker instance
  customMode: false
};



const FAV_KEY = "activity_favourites";
const CUSTOM_KEY = "custom_activities";

function loadStateFromStorage() {
  try {
    const favRaw = localStorage.getItem(FAV_KEY);
    if (favRaw) {
      const favIds = JSON.parse(favRaw);
      if (Array.isArray(favIds)) {
        appState.favourites = favIds;
      }
    }

    const customRaw = localStorage.getItem(CUSTOM_KEY);
    if (customRaw) {
      const customArr = JSON.parse(customRaw);
      if (Array.isArray(customArr)) {
        appState.customActivities = customArr;
      }
    }
  } catch (e) {
    console.warn("Failed to load favourites/custom from storage", e);
  }
}

function saveStateToStorage() {
  try {
    localStorage.setItem(FAV_KEY, JSON.stringify(appState.favourites));
    localStorage.setItem(CUSTOM_KEY, JSON.stringify(appState.customActivities));
  } catch (e) {
    console.warn("Failed to save favourites/custom to storage", e);
  }
}


function getQueryParam(name) {
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
}

// ===== Initial load =====
window.addEventListener("DOMContentLoaded", async () => {
  loadStateFromStorage();
  showLoadingState();
  try {
    const res = await fetch("/api/activities/map");
    const activities = await res.json();
    if (!Array.isArray(activities)) {
      throw new Error("Invalid activities response");
    }
    appState.activities = activities;
    initMapWithActivities();

    // After map + activities are ready, focus on activityId (if provided)
    const activityIdParam = getQueryParam("activityId");
    if (activityIdParam) {
      const target = activities.find(a => String(a.id) === String(activityIdParam));
      if (target) {
        // Wait until map load handler has run
        appState.map.once("idle", () => {
          // Center on the activity
          appState.map.flyTo({
            center: [target.longitude, target.latitude],
            zoom: 7,
            essential: true
          });
          // Trigger route from airport
          requestRouteFromAirport(target.id);
        });
      }
    }
  } catch (err) {
    console.error(err);
    showMapError(err.message);
  }
});

// ===== Loading UI =====
function showLoadingState() {
  const el = document.getElementById("map");
  el.innerHTML = `
    <div class="w-full h-full flex items-center justify-center">
      <div class="text-slate-400 text-sm">Loading activities and map...</div>
    </div>
  `;
}

function clearLoadingState() {
  const el = document.getElementById("map");
  el.innerHTML = "";
}

function showMapError(message) {
  const el = document.getElementById("map");
  el.innerHTML = `
    <div class="w-full h-full flex items-center justify-center">
      <div class="text-red-400 text-sm">
        Failed to load map: ${message}
      </div>
    </div>
  `;
}

// ===== Map + markers =====
function initMapWithActivities() {
  const activities = appState.activities;
  clearLoadingState();

  appState.map = new mapboxgl.Map({
    container: "map",
    style: "mapbox://styles/mapbox/dark-v11",
    center: [0, 20],
    zoom: 1.5
  });

  appState.map.addControl(new mapboxgl.NavigationControl(), "top-right");

  appState.map.on("load", () => {
    appState.map.on("click", (e) => {
      if (!appState.customMode) return;
      onMapClickForCustomActivity(e);
    });
  
    const toggleBtn = document.getElementById("customActivityToggle");
    if (toggleBtn) {
      toggleBtn.onclick = () => {
        appState.customMode = !appState.customMode;
        toggleBtn.textContent = appState.customMode
          ? "Click on map to set point"
          : "Add custom activity";
        toggleBtn.classList.toggle("bg-slate-800", appState.customMode);
      };
    }
    // Route source
    appState.map.addSource(appState.routeSourceId, {
      type: "geojson",
      data: {
        type: "Feature",
        geometry: { type: "LineString", coordinates: [] }
      }
    });
    

    // Route layer
    appState.map.addLayer({
      id: appState.routeLayerId,
      type: "line",
      source: appState.routeSourceId,
      layout: {
        "line-cap": "round",
        "line-join": "round"
      },
      paint: {
        "line-color": "#22c55e",
        "line-width": 4
      }
    });

    // Activity markers
    activities.forEach(addActivityMarker);

    if (activities.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      activities.forEach(a => bounds.extend([a.longitude, a.latitude]));
      appState.map.fitBounds(bounds, { padding: 60, maxZoom: 5 });
    }

    for (const a of appState.customActivities) {
      const el = document.createElement("div");
      el.style.width = "14px";
      el.style.height = "14px";
      el.style.borderRadius = "999px";
      el.style.background = "#ec4899";
      el.style.boxShadow = "0 0 0 2px rgba(15,23,42,0.7)";
    
      const popupHtml = `
        <div style="font-size:12px; line-height:1.4; color:#0f0f0f;">
          <div style="font-size:13px; font-weight:600; color:#141414;">
            ${a.name}
          </div>
          <div style="font-size:11px; color:#2373eb; margin-top:2px;">
            ${a.city || ""}${a.city && a.country ? ", " : ""}${a.country || ""}
          </div>
          <button
            style="
              margin-top:8px;
              width:100%;
              border-radius:6px;
              background:#22c55e;
              color:#020617;
              font-size:11px;
              font-weight:600;
              padding:4px 0;
              border:none;
              cursor:pointer;
            "
            onclick="routeFromCustomActivity('${a.id}')"
          >
            Route from airport
          </button>
        </div>
      `;
    
      const marker = new mapboxgl.Marker(el)
        .setLngLat([a.longitude, a.latitude])
        .setPopup(new mapboxgl.Popup({ offset: 16 }).setHTML(popupHtml))
        .addTo(appState.map);
    
      appState.customActivityMarkers[a.id] = marker;
    }
    
    renderFavouritesBar();
    
  });
  
  async function onMapClickForCustomActivity(e) {
    const lng = e.lngLat.lng;
    const lat = e.lngLat.lat;
  
    const place = await reverseGeocodeCityCountry(lng, lat);
    const autoCity = place?.city || "";
    const autoCountry = place?.country || "";
    const defaultName = "Custom place";
  
    const id = `custom-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  
    const el = document.createElement("div");
    el.style.width = "14px";
    el.style.height = "14px";
    el.style.borderRadius = "999px";
    el.style.background = "#ec4899";
    el.style.boxShadow = "0 0 0 2px rgba(15,23,42,0.7)";
  
    const popupHtml = `
      <div style="font-size:12px; line-height:1.4; color:#0f0f0f;">
        <div style="font-size:13px; font-weight:600; color:#141414; margin-bottom:4px;">
          Custom activity
        </div>
  
        <label style="display:block; font-size:11px; color:#6b7280; margin-bottom:2px;">Name</label>
        <input
          id="customNameInput-${id}"
          type="text"
          value="${defaultName}"
          style="width:100%; font-size:11px; padding:3px 6px; border-radius:4px; border:1px solid #d1d5db; margin-bottom:4px;"
        />
  
        <label style="display:block; font-size:11px; color:#6b7280; margin-bottom:2px;">City</label>
        <input
          id="customCityInput-${id}"
          type="text"
          value="${autoCity}"
          style="width:100%; font-size:11px; padding:3px 6px; border-radius:4px; border:1px solid #d1d5db; margin-bottom:4px;"
        />
  
        <label style="display:block; font-size:11px; color:#6b7280; margin-bottom:2px;">Country</label>
        <input
          id="customCountryInput-${id}"
          type="text"
          value="${autoCountry}"
          style="width:100%; font-size:11px; padding:3px 6px; border-radius:4px; border:1px solid #d1d5db; margin-bottom:8px;"
        />
  
        <button
          style="
            width:100%;
            border-radius:6px;
            background:#22c55e;
            color:#020617;
            font-size:11px;
            font-weight:600;
            padding:4px 0;
            border:none;
            cursor:pointer;
          "
          onclick="saveCustomActivity('${id}', ${lng}, ${lat})"
        >
          Save custom activity
        </button>
      </div>
    `;
  
    const marker = new mapboxgl.Marker(el)
      .setLngLat([lng, lat])
      .setPopup(new mapboxgl.Popup({ offset: 16 }).setHTML(popupHtml))
      .addTo(appState.map);
  
    appState.customActivityMarkers[id] = marker;
  
    marker.togglePopup();
  
    appState.map.flyTo({ center: [lng, lat], zoom: 7, essential: true });
  }
  
  window.saveCustomActivity = function (id, lng, lat) {
    const nameInput = document.getElementById(`customNameInput-${id}`);
    const cityInput = document.getElementById(`customCityInput-${id}`);
    const countryInput = document.getElementById(`customCountryInput-${id}`);
  
    const name = (nameInput?.value || "Custom place").trim();
    const city = (cityInput?.value || "").trim();
    const country = (countryInput?.value || "").trim();
  
    const existingIndex = appState.customActivities.findIndex(c => c.id === id);
    const entry = { id, name, city, country, longitude: lng, latitude: lat };
  
    if (existingIndex === -1) {
      appState.customActivities.push(entry);
    } else {
      appState.customActivities[existingIndex] = entry;
    }
  
    if (!appState.favourites.includes(id)) {
      appState.favourites.push(id);
    }
  
    saveStateToStorage();
    renderFavouritesBar();
  
    const marker = appState.customActivityMarkers[id];
    if (marker) {
      const popupHtml = `
        <div style="font-size:12px; line-height:1.4; color:#0f0f0f;">
          <div style="font-size:13px; font-weight:600; color:#141414;">
            ${name}
          </div>
          <div style="font-size:11px; color:#2373eb; margin-top:2px;">
            ${city}${city && country ? ", " : ""}${country}
          </div>
          <button
            style="
              margin-top:8px;
              width:100%;
              border-radius:6px;
              background:#22c55e;
              color:#020617;
              font-size:11px;
              font-weight:600;
              padding:4px 0;
              border:none;
              cursor:pointer;
            "
            onclick="routeFromCustomActivity('${id}')"
          >
            Route from airport
          </button>
        </div>
      `;
      marker.setPopup(new mapboxgl.Popup({ offset: 16 }).setHTML(popupHtml));
    }
  };
  
  
  window.routeFromCustomActivity = async function (id) {
    const a = appState.customActivities.find(c => c.id === id);
    if (!a) return;
  
    const info = document.getElementById("route-info");
    info.textContent = "Loading route for custom activity...";
  
    try {
      const data = await requestRouteForCustomActivity({
        name: a.name,
        city: a.city,
        country: a.country,
        latitude: a.latitude,
        longitude: a.longitude
      });
      drawRouteOnMap(data);
      renderRouteInfo(data);
    } catch (err) {
      console.error(err);
      info.textContent = "Error: " + err.message;
    }
  };

  // Zoom out to earth button
  const zoomBtn = document.getElementById("zoomOutEarthBtn");
  if (zoomBtn) {
    zoomBtn.onclick = () => {
      appState.map.flyTo({
        center: [0, 20],
        zoom: 1.5,
        speed: 1.0,
        curve: 1.5,
        essential: true
      });
    };
  }
}

async function reverseGeocodeCityCountry(lng, lat) {
  const token = window.MAPBOX_TOKEN;
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json` +
              `?types=place,locality,region,country&limit=5&access_token=${encodeURIComponent(token)}`;

  const res = await fetch(url);
  if (!res.ok) return null;
  const json = await res.json();

  let city = "";
  let country = "";

  if (Array.isArray(json.features)) {
    for (const f of json.features) {
      const placeType = f.place_type[0];
      if (!city && (placeType === "place" || placeType === "locality")) {
        city = f.text;
      }
      if (!country && placeType === "country") {
        country = f.text;
      }
    }
  }

  return { city, country };
}
async function requestRouteForCustomActivity(custom) {
  const sizeSelect = document.getElementById("airportSizeSelect");
  const airportSize = sizeSelect ? sizeSelect.value : "large";

  const res = await fetch("/api/routes/custom", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: custom.name,
      city: custom.city,
      country: custom.country,
      lat: custom.latitude,
      lon: custom.longitude,
      airportSize
    })
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || res.statusText);
  }
  return data;
}


function addActivityMarker(a) {
  const el = document.createElement("div");
  el.className = "activity-marker";
  el.style.width = "14px";
  el.style.height = "14px";
  el.style.borderRadius = "999px";
  el.style.background = "#22c55e";
  el.style.boxShadow = "0 0 0 2px rgba(15,23,42,0.7)";

  const marker = new mapboxgl.Marker(el)
    .setLngLat([a.longitude, a.latitude])
    .setPopup(
      new mapboxgl.Popup({ offset: 16 }).setHTML(activityPopupHtml(a))
    )
    .addTo(appState.map);

  appState.activityMarkers.push(marker);
}

function activityPopupHtml(a) {
  const isFav = appState.favourites.includes(a.id);
  const favLabel = isFav ? "Remove from favourites" : "Add to favourites";

  return `
    <div style="font-size:12px; line-height:1.4; color:#e5e7eb;">
      <div style="font-size:13px; font-weight:600; color:#121112;">
        ${a.name}
      </div>
      <div style="font-size:11px; color:#2373eb; margin-top:2px;">
        ${a.city || ""}${a.city && a.country ? ", " : ""}${a.country || ""}
      </div>
      <div style="font-size:11px; color:#2373eb; margin-top:4px;">
        Type: <span style="color:#121112; font-weight:500;">${a.type || "N/A"}</span>
        · Rating: <span style="color:#fbbf24; font-weight:500;">${a.rating ?? "N/A"}</span>
      </div>
      <button
        style="
          margin-top:8px;
          width:100%;
          border-radius:6px;
          background:#22c55e;
          color:#020617;
          font-size:11px;
          font-weight:600;
          padding:4px 0;
          border:none;
          cursor:pointer;
        "
        onclick="onRouteFromAirportClick(${a.id})"
      >
        Route from airport
      </button>
      <button
        style="
          margin-top:6px;
          width:100%;
          border-radius:6px;
          background:#020617;
          color:#e5e7eb;
          font-size:11px;
          font-weight:500;
          padding:3px 0;
          border:1px solid #4b5563;
          cursor:pointer;
        "
        onclick="onToggleFavouriteClick(${a.id})"
      >
        ${favLabel}
      </button>
    </div>
  `;
}

window.onToggleFavouriteClick = function (activityId) {
  toggleFavourite(activityId);
};

function toggleFavourite(activityId) {
  const idx = appState.favourites.indexOf(activityId);
  if (idx === -1) {
    appState.favourites.push(activityId);
  } else {
    appState.favourites.splice(idx, 1);
  }
  saveStateToStorage();
  renderFavouritesBar();
  // Refresh any open popup so the button label updates
  const activity = appState.activities.find(a => a.id === activityId);
  if (activity) {
    // Find its marker and reset popup HTML
    const marker = appState.activityMarkers.find(m => {
      const lngLat = m.getLngLat();
      return lngLat.lng === activity.longitude && lngLat.lat === activity.latitude;
    });
    if (marker) {
      marker.setPopup(
        new mapboxgl.Popup({ offset: 16 }).setHTML(activityPopupHtml(activity))
      );
    }
  }
}

function renderFavouritesBar() {
  const container = document.getElementById("favouritesList");
  if (!container) return;

  if (appState.favourites.length === 0) {
    container.innerHTML = `<span class="text-slate-500 text-xs">No favourites yet</span>`;
    return;
  }

  container.innerHTML = appState.favourites
    .map(id => {
      let a;
      if (String(id).startsWith("custom-")) {
        a = appState.customActivities.find(c => c.id === id);
      } else {
        a = appState.activities.find(x => String(x.id) === String(id));
      }
      if (!a) return "";
      return `
        <button
          class="flex items-center gap-1 px-2 py-1 rounded-full bg-slate-900 border border-slate-700 text-slate-100 hover:bg-slate-800 whitespace-nowrap"
          onclick="onFavouriteItemClick('${id}')"
        >
          <span class="text-[11px]">★</span>
          <span class="text-[11px]">${a.name}</span>
          <span
            class="ml-1 text-[10px] text-slate-400 hover:text-red-400"
            onclick="onRemoveFavouriteClick(event, '${id}')"
          >
            ×
          </span>
        </button>
      `;
    })
    .join("");
}

window.onFavouriteItemClick = function (id) {
  let a;
  if (String(id).startsWith("custom-")) {
    a = appState.customActivities.find(c => c.id === id);
  } else {
    a = appState.activities.find(x => String(x.id) === String(id));
  }
  if (!a || !appState.map) return;

  appState.map.flyTo({
    center: [a.longitude, a.latitude],
    zoom: 8,
    essential: true
  });

  if (String(id).startsWith("custom-")) {
    routeFromCustomActivity(id);
  } else {
    appState.selectedActivityId = id;
    requestRouteFromAirport(id);
  }
};

window.onRemoveFavouriteClick = function (event, id) {
  event.stopPropagation();
  const idx = appState.favourites.indexOf(id);
  if (idx !== -1) appState.favourites.splice(idx, 1);

  if (String(id).startsWith("custom-")) {
    const ci = appState.customActivities.findIndex(c => c.id === id);
    if (ci !== -1) appState.customActivities.splice(ci, 1);
    const marker = appState.customActivityMarkers[id];
    if (marker) {
      marker.remove();
      delete appState.customActivityMarkers[id];
    }
  }

  saveStateToStorage();
  renderFavouritesBar();
};

window.onRouteFromAirportClick = function (id) {
  requestRouteFromAirport(id);
};

// ===== Routing =====
async function requestRouteFromAirport(activityId) {
  const info = document.getElementById("route-info");
  info.textContent = "Loading route...";

  const sizeSelect = document.getElementById("airportSizeSelect");
  const airportSize = sizeSelect ? sizeSelect.value : "all";

  try {
    const res = await fetch(
      `/api/routes/activity/${activityId}?airportSize=${encodeURIComponent(airportSize)}`
    );
    const data = await res.json();

    if (!res.ok) {
      info.textContent = "Error: " + (data.error || res.statusText);
      return;
    }

    drawRouteOnMap(data);
    renderRouteInfo(data);
  } catch (err) {
    console.error("Route request failed", err);
    info.textContent = "Route request failed: " + err.message;
  }
}

function drawRouteOnMap(data) {
    const map = appState.map;
    if (!data.route || !data.route.geometry) return;
  
    const geojson = {
      type: "Feature",
      geometry: data.route.geometry
    };
    map.getSource(appState.routeSourceId).setData(geojson);
  
    if (appState.startMarker) appState.startMarker.remove();
    if (appState.endMarker) appState.endMarker.remove();
  
    // Map CSV type -> readable label
    const rawType = data.start.type || "";
    const sizeLabel =
      rawType === "large_airport" ? "Large airport" :
      rawType === "medium_airport" ? "Medium airport" :
      rawType === "small_airport" ? "Small airport" :
      rawType === "heliport" ? "Heliport" :
      rawType || "Unknown";

    appState.startMarker = new mapboxgl.Marker({ color: "#3b82f6" })
      .setLngLat([data.start.lon, data.start.lat])
      .setPopup(
        new mapboxgl.Popup({ offset: 16 }).setHTML(
          `<div style="font-size:12px;color:#0f0f0f;">
             <strong>Airport:</strong> ${data.start.label}<br/>
             <span style="font-size:11px;color:#4b5563;">${sizeLabel}</span>
           </div>`
        )
      )
      .addTo(map);

  // End location (city centre or activity)
  const end =
    data.routeEnd && data.routeEnd.lon != null
      ? data.routeEnd
      : {
          type: "activity",
          label: data.activity.name,
          lon: data.activity.lon,
          lat: data.activity.lat
        };

  appState.endMarker = new mapboxgl.Marker({ color: "#f97316" })
    .setLngLat([end.lon, end.lat])
    .setPopup(
      new mapboxgl.Popup({ offset: 16 }).setHTML(
        `<div style="font-size:12px;color:#0f0f0f;">
           ${
             data.reroutedFromNonDrivable && end.type === "city_center"
               ? "<strong>Nearest drivable point</strong>"
               : "<strong>Activity:</strong> " + end.label
           }
         </div>`
      )
    )
    .addTo(map);

  // Fit bounds around route and endpoints
  const bounds = new mapboxgl.LngLatBounds();
  data.route.geometry.coordinates.forEach(c => bounds.extend(c));
  bounds.extend([data.start.lon, data.start.lat]);
  bounds.extend([end.lon, end.lat]);
  map.fitBounds(bounds, { padding: 60, maxZoom: 10 });
}

// ===== Route info panel =====
function renderRouteInfo(data) {
  const info = document.getElementById("route-info");
  if (!info || !data.route) return;

  const distance = data.route.distanceMeters || 0;
  const duration = data.route.durationSeconds || 0;

  const details = [];
  if (data.reroutedFromNonDrivable) {
    details.push(
      "Activity location is not directly drivable; route ends at the nearest drivable point (city centre)."
    );
  }

  const distanceLabel = (distance / 1000).toFixed(1) + " km";
  const durationLabel = Math.round(duration / 60) + " min";

  const fromLabel = data.start ? data.start.label : "Airport";
  const toLabel = data.activity ? data.activity.name : "Activity";
  const cityLabel =
    data.activity && (data.activity.city || data.activity.country)
      ? `${data.activity.city || ""}${
          data.activity.city && data.activity.country ? ", " : ""
        }${data.activity.country || ""}`
      : "";

  const rawType = data.start?.type || "";
  const sizeLabel =
    rawType === "large_airport" ? "Large airport" :
    rawType === "medium_airport" ? "Medium airport" :
    rawType === "small_airport" ? "Small airport" :
    rawType === "heliport" ? "Heliport" :
    rawType || "Unknown";

  info.innerHTML = `
    <div class="space-y-3 text-sm">
      <div>
        <div class="text-xs uppercase tracking-wide" style="color:#9ca3af;margin-bottom:0.25rem;">
          Destination
        </div>
        <div class="font-semibold" style="color:#f9fafb;">${toLabel}</div>
        <div class="text-xs" style="color:#9ca3af;">${cityLabel}</div>
      </div>

      <div class="rounded-lg bg-slate-900/80 border border-slate-800 px-3 py-2 text-xs" style="color:#d1d5db;">
        <div><span class="font-semibold">Journey type:</span> Airport → Activity</div>
        <div><span class="font-semibold">From:</span> ${fromLabel} <span style="color:#9ca3af;">· ${sizeLabel}</span></div>
        <div><span class="font-semibold">To:</span> ${toLabel}</div>
        ${details.length ? `<div class="mt-1" style="color:#9ca3af;">${details.join(" ")}</div>` : ""}
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div style="border-radius:0.5rem;background:#020617;border:1px solid #1f2937;padding:0.5rem 0.75rem;">
          <div class="text-xs" style="color:#9ca3af;">Total distance</div>
          <div class="text-sm font-semibold" style="color:#22c55e;">
            ${distanceLabel}
          </div>
        </div>
        <div style="border-radius:0.5rem;background:#020617;border:1px solid #1f2937;padding:0.5rem 0.75rem;">
          <div class="text-xs" style="color:#9ca3af;">Total duration</div>
          <div class="text-sm font-semibold" style="color:#22c55e;">
            ${durationLabel}
          </div>
        </div>
      </div>

      <div class="mt-1 text-xs" style="color:#9ca3af;">
        Approximate travel time and distance are based on current routing data and may vary with traffic and local conditions.
      </div>
    </div>
  `;
}