// ---------- DARK/LIGHT TOGGLE ----------
const themeBtn = document.getElementById('themeToggle');

// dark default
document.body.classList.add('dark-theme');
document.body.classList.remove('light-theme');
themeBtn.textContent = 'Light Theme';

themeBtn.onclick = () => {
  document.body.classList.toggle('light-theme');
  document.body.classList.toggle('dark-theme');
  themeBtn.textContent = document.body.classList.contains('light-theme')
    ? 'Dark Theme'
    : 'Light Theme';
};

// ---------------------------- DATA FROM API ----------------------------
let SAMPLE_PLACES = [];

async function loadPlaces() {
  const start = performance.now();

  try {
    const res = await fetch('/api/activities');

    if (!res.ok) {
      console.error('Failed to fetch /api/activities, status:', res.status);
      SAMPLE_PLACES = [];
    } else {
      const data = await res.json();
      SAMPLE_PLACES = Array.isArray(data) ? data : [];
    }

    initializeFiltersAndRender();
  } catch (e) {
    console.error('Failed to load activities', e);
    SAMPLE_PLACES = [];
    initializeFiltersAndRender();
  } finally {
    const minDuration = 500;
    const elapsed = performance.now() - start;
    const remaining = Math.max(0, minDuration - elapsed);

    setTimeout(() => {
      const loader = document.getElementById('appLoader');
      const shell = document.getElementById('appShell');
      if (loader) loader.style.display = 'none';
      if (shell) {
        shell.style.opacity = '1';
        shell.style.pointerEvents = 'auto';
      }
    }, remaining);
  }
}

// ---------------------------- CONFIG & HELPERS ----------------------------
const PERSONALITY_PRESETS = [
  { id:"balanced",label:"Balanced" },
  { id:"luxury",label:"Luxury" },
  { id:"adventure",label:"Adventure" },
  { id:"foodie",label:"Foodie" }
];

let currentPreset = "balanced";

function priceToDollar(amount) {
  if (amount == null) return "💲";
  let lvl;
  if (amount <= 0) lvl = 1;
  else if (amount <= 50) lvl = 1;
  else if (amount <= 100) lvl = 2;
  else if (amount <= 500) lvl = 3;
  else lvl = 4;
  return "💲".repeat(lvl);
}

function friendlyPriorityBadges(contrib) {
  let badges = [];
  if (!contrib) return "";
  if (contrib["Price"]) badges.push(`<span class="px-2 py-0.5 text-[10px] rounded-full border border-green-400/60 bg-green-500/10 text-green-200">Price preference: ${contrib["PriceValue"]}</span>`);
  if (contrib["Luxury preset"]) badges.push(`<span class="px-2 py-0.5 text-[10px] rounded-full border border-sky-400/60 bg-sky-500/10 text-sky-200">Preset: Luxury</span>`);
  if (contrib["Adventure preset"]) badges.push(`<span class="px-2 py-0.5 text-[10px] rounded-full border border-sky-400/60 bg-sky-500/10 text-sky-200">Preset: Adventure</span>`);
  if (contrib["Foodie preset"]) badges.push(`<span class="px-2 py-0.5 text-[10px] rounded-full border border-sky-400/60 bg-sky-500/10 text-sky-200">Preset: Foodie</span>`);
  if (contrib["TagMatches"]) badges.push(...contrib["TagMatches"].map(t=>`<span class="px-2 py-0.5 text-[10px] rounded-full border border-amber-400/60 bg-amber-500/10 text-amber-200">${t}</span>`));
  if (contrib["Region"]) badges.push(`<span class="px-2 py-0.5 text-[10px] rounded-full border border-slate-400/60 bg-slate-500/10 text-slate-200">Region match</span>`);
  if (contrib["Type"]) badges.push(`<span class="px-2 py-0.5 text-[10px] rounded-full border border-slate-400/60 bg-slate-500/10 text-slate-200">Type match</span>`);
  if (contrib["Indoor"]) badges.push(`<span class="px-2 py-0.5 text-[10px] rounded-full border border-slate-400/60 bg-slate-500/10 text-slate-200">Indoor</span>`);
  if (contrib["Outdoor"]) badges.push(`<span class="px-2 py-0.5 text-[10px] rounded-full border border-slate-400/60 bg-slate-500/10 text-slate-200">Outdoor</span>`);
  return badges.join(" ");
}

// ---------------------------- SCORING FUNCTION ----------------------------
function scorePlace(p, filters) {
  let s = p.rating * 10;
  let contrib = {};

  // price prefs
  contrib["Price"]=true;
  contrib["PriceValue"]=filters.price.charAt(0).toUpperCase()+filters.price.slice(1);

  if (filters.price === "cheap") {
    if (p.price_level <= 1) s += 25;
    else if (p.price_level == 2) s += 10;
    else s -= 10;
  }

  if (filters.price === "balanced") {
    if (p.price_level == 2 || p.price_level == 3) s += 20;
  }

  if (filters.price === "expensive") {
    if (p.price_level >= 3) {
      s += 25;
      if (p.price_level > 500) s += 15;
    } else {
      s -= 10;
    }
  }

  // presets
  if (currentPreset === "luxury" && (p.tags.includes("luxury") || p.price_level >= 4)) { s += 30; contrib["Luxury preset"]=true; }
  if (currentPreset === "adventure" && (p.tags.includes("hiking") || p.tags.includes("nature"))) { s += 30; contrib["Adventure preset"]=true; }
  if (currentPreset === "foodie" && p.type === "food") { s += 35; contrib["Foodie preset"]=true; }

  // tags
  const matchedTags = filters.tags.filter(t => p.tags.includes(t));
  if (matchedTags.length > 0) contrib["TagMatches"]=matchedTags;

  // region/type
  if (filters.region !== "All" && p.region === filters.region) { s += 15; contrib["Region"]=true; }
  if (filters.type !== "any" && p.type === filters.type) { s += 15; contrib["Type"]=true; }

  // indoor preference
  if (filters.indoor === "indoor" && p.indoor) { s += 5; contrib["Indoor"]=true; }
  if (filters.indoor === "outdoor" && !p.indoor) { s += 5; contrib["Outdoor"]=true; }

  return { _score: s, contrib };
}

// ---------------------------- RENDER ----------------------------
function render() {
  const minPriceEl = document.getElementById("minPrice");
  const maxPriceEl = document.getElementById("maxPrice");

  const filters = {
    region: document.getElementById("region").value,
    type: document.getElementById("typeFilter").value,
    price: document.querySelector('.priceBtn.chip-active')?.dataset.price || "balanced",
    indoor: document.querySelector('.indoorBtn.chip-active')?.dataset.indoor || "any",
    tags: [...document.querySelectorAll(".tagBtn.chip-active")].map(b => b.dataset.tag),
    query: document.getElementById("searchBox").value.toLowerCase(),
    minPrice: minPriceEl ? Number(minPriceEl.value) : 0,
    maxPrice: maxPriceEl ? Number(maxPriceEl.value) : 2000
  };

  const results = SAMPLE_PLACES
    .map(p => {
      const scored = scorePlace(p, filters);
      return {...p, _score: scored._score, contrib: scored.contrib};
    })
    .filter(p => {
      const matchesQuery = !filters.query ||
        p.name.toLowerCase().includes(filters.query) ||
        p.region.toLowerCase().includes(filters.query) ||
        p.tags.some(t => t.toLowerCase().includes(filters.query)) ||
        p.type.toLowerCase().includes(filters.query);

      const matchesTags =
        filters.tags.length === 0 ||
        filters.tags.every(tag => p.tags.includes(tag));

      const matchesIndoor =
        filters.indoor === "any" ||
        (filters.indoor === "indoor" && p.indoor) ||
        (filters.indoor === "outdoor" && !p.indoor);

      const price = p.price_level ?? 0;
      const matchesRange =
        price >= filters.minPrice &&
        price <= filters.maxPrice;

      return matchesQuery && matchesTags && matchesIndoor && matchesRange;
    });

  results.sort((a,b)=>b._score - a._score);

  const top = document.getElementById("topPicks");
  top.innerHTML = results.slice(0,6).map(p => `
    <a href="/map?activityId=${p.id}" class="block">
      <div class="place-card">
        <img 
          src="${p.img}" 
          onerror="this.onerror=null;this.src='/assets/images/activity-placeholder.jpg';" 
          class="w-full h-40 object-cover" 
        />
        <div class="p-4 space-y-2">
          <h3 class="place-card-title font-semibold text-slate-50 text-sm line-clamp-1">${p.name}</h3>
          <div class="place-card-meta text-[11px] text-slate-400">${p.region} • ${p.tags.join(', ')}</div>
          <div class="flex items-center gap-2 text-[11px] text-slate-300">
            <span>${priceToDollar(p.price_level)}</span>
            <span class="text-slate-400">· ~${p.price_level}</span>
          </div>
          <p class="place-card-rating text-xs text-slate-300">⭐ ${p.rating}</p>
          <div class="flex flex-wrap gap-1 mt-1 text-[10px]">${friendlyPriorityBadges(p.contrib)}</div>
        </div>
      </div>
    </a>
  `).join("");

  const list = document.getElementById("allMatches");
  list.innerHTML = results.map(p => `
    <a href="/map?activityId=${p.id}" class="block">
      <div class="place-card flex items-center gap-4 p-4">
        <img 
          src="${p.img}" 
          onerror="this.onerror=null;this.src='/assets/images/activity-placeholder.jpg';" 
          class="w-28 h-20 object-cover rounded-xl" 
        />
        <div class="flex-1">
          <div class="flex justify-between gap-4">
            <div>
              <div class="place-card-title font-semibold text-slate-50 text-sm line-clamp-1">${p.name}</div>
              <div class="place-card-meta text-[11px] text-slate-400">${p.type} • ${p.region}</div>
            </div>
            <div class="place-card-rating text-right text-xs text-slate-200">⭐ ${p.rating}</div>
          </div>
          <div class="place-card-meta text-[11px] text-slate-400 mt-1">${p.tags.join(' • ')}</div>
          <div class="flex gap-2 mt-2 text-[11px] text-slate-200 items-center">
            <span>${priceToDollar(p.price_level)}</span>
            <span class="text-slate-400">· ~${p.price_level}</span>
          </div>
          <div class="flex flex-wrap gap-1 mt-1 text-[10px]">${friendlyPriorityBadges(p.contrib)}</div>
        </div>
      </div>
    </a>
  `).join("");
}

// ---------------------------- FILTER INIT AFTER DATA ----------------------------
function initializeFiltersAndRender() {
  if (!Array.isArray(SAMPLE_PLACES)) {
    SAMPLE_PLACES = [];
  }
  // region options
  const regions = ["All", ...new Set(SAMPLE_PLACES.map(p => p.region))];
  const regionSel = document.getElementById("region");
  regionSel.innerHTML = "";
  regions.forEach(r => regionSel.innerHTML += `<option value="${r}">${r}</option>`);

  // presets
  const personalityDiv = document.getElementById("personalityContainer");
  personalityDiv.innerHTML = PERSONALITY_PRESETS
    .map(p => `<button data-preset="${p.id}" class="presetBtn chip">${p.label}</button>`)
    .join("");
  document.querySelector('[data-preset="balanced"]').classList.add("chip-active");
  currentPreset = "balanced";

  // city tags from data
  const allTags = [...new Set(SAMPLE_PLACES.flatMap(p => p.tags))];
  const tagsContainer = document.getElementById("tagsContainer");
  tagsContainer.innerHTML = "";
  allTags.forEach(t => { 
    tagsContainer.innerHTML += `<button data-tag="${t}" class="tagBtn chip">${t}</button>`; 
  });

  // preset chip handlers
  document.querySelectorAll('.presetBtn').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.presetBtn').forEach(b=>b.classList.remove('chip-active'));
      btn.classList.add('chip-active');
      currentPreset = btn.dataset.preset;
      render();
    }
  });

  // price chip handlers
  document.querySelectorAll('.priceBtn').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.priceBtn').forEach(b => b.classList.remove('chip-active'));
      btn.classList.add('chip-active');
      render();
    };
  });

  // indoor chip handlers
  document.querySelectorAll('.indoorBtn').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.indoorBtn').forEach(b => b.classList.remove('chip-active'));
      btn.classList.add('chip-active');
      render();
    };
  });

  // tag chips
  Array.from(document.getElementsByClassName('tagBtn')).forEach(btn => {
    btn.onclick = () => { 
      btn.classList.toggle('chip-active'); 
      render(); 
    }
  });

  // dropdowns + search
  ['region','typeFilter','searchBox'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.oninput = render;
  });

  // price slider
  const maxPriceInput = document.getElementById('maxPrice');
  const maxPriceLabel = document.getElementById('maxPriceLabel');

  if (maxPriceInput && maxPriceLabel) {
    const updateMaxPrice = () => {
      const val = Number(maxPriceInput.value);
      if (val >= 2000) {
        maxPriceLabel.textContent = 'Any';
      } else {
        maxPriceLabel.textContent = `≤ ${val}`;
      }
      render();
    };
    maxPriceInput.oninput = updateMaxPrice;
    updateMaxPrice();
  }
}

// INITIAL LOAD
loadPlaces();
