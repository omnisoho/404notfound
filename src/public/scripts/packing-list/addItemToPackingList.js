const apiUrl = "http://localhost:3000";
const urlParams = new URLSearchParams(window.location.search);
const tripId = urlParams.get("tripId");
const userId = urlParams.get("userId");

// ❌ REMOVE TOKEN — HTTP-only cookie cannot be read anyway
// const token = localStorage.getItem("token")  || cookieStore.get("token")?.value;

// Will hold all catalog items for searching
let catalogItems = [];

window.onload = () => {
  if (!tripId) return alert("No trip selected");

  fetchCatalog();

  // 🔍 Attach search filter
  document.getElementById("searchInput").addEventListener("input", filterCatalog);
};

// Fetch catalog items
function fetchCatalog() {
  fetch(`${apiUrl}/packingItemTemplate`, {
    method: "GET",
    credentials: "include" // ✅ SEND COOKIE AUTOMATICALLY
  })
    .then(res => {
      if (!res.ok) throw new Error("Failed to fetch catalog");
      return res.json();
    })
    .then(items => {
      catalogItems = items; // store for searching
      renderCatalog(items); // display all
    })
    .catch(err => {
      console.error("Error fetching catalog:", err);
      document.getElementById("noCatalogMsg").style.display = "block";
    });
}

// Render items into the list
function renderCatalog(items) {
  const catalogList = document.getElementById("catalogList");
  const noMsg = document.getElementById("noCatalogMsg");

  catalogList.innerHTML = ""; // Clear list first

  if (!items || items.length === 0) {
    noMsg.style.display = "block";
    return;
  }

  noMsg.style.display = "none";

  items.forEach(item => {
    const li = document.createElement("li");
    li.textContent = item.name;
    const addBtn = document.createElement("button");
if(userId != null) {
    addBtn.textContent = "Suggest to User";
    addBtn.onclick = () => addSuggestToTrip(item.id, null, userId);
}else{
    addBtn.textContent = "Add to Trip";
    addBtn.onclick = () => addItemToTrip(item.id, null);
}


    li.appendChild(addBtn);
    catalogList.appendChild(li);
  });
}

// 🔍 Filter catalog on search input
function filterCatalog() {
  const query = document.getElementById("searchInput").value.toLowerCase();

  const filtered = catalogItems.filter(item =>
    item.name.toLowerCase().includes(query)
  );

  renderCatalog(filtered);
}

// Add item to trip
function addItemToTrip(templateId = null, customName = null) {
  fetch(`${apiUrl}/packingList`, {
    method: "POST",
    credentials: "include", // ✅ COOKIE AUTH
    headers: { 
      "Content-Type": "application/json"
      // ❌ Remove Authorization — cookies handle token
    },
    body: JSON.stringify({
      tripId,
      templateId,
      customName
    })
  })
  .then(res => {
    if (!res.ok) throw new Error("Failed to add item");
    return res.json();
  })
  .then(() => {
    alert("Item added!");
    window.location.href = `packingList.html?tripId=${tripId}`;
  })
  .catch(err => console.error("Error adding item:", err));
}

// Handle custom item submission
if(userId == null){
  document.getElementById("addItemForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const name = document.getElementById("customName").value.trim();
  if (!name) return alert("Enter item name");
  addItemToTrip(null, name);
});
}
else{
document.getElementById("addItemForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const name = document.getElementById("customName").value.trim();
  if (!name) return alert("Enter item name");
  addSuggestToTrip(null, name, userId);
});
}






// Add item to trip
function addSuggestToTrip(templateId = null, customName = null, user_id) {
  fetch(`${apiUrl}/packingList/recommend`, {
    method: "POST",
    credentials: "include", // ✅ COOKIE AUTH
    headers: { 
      "Content-Type": "application/json"
      // ❌ Remove Authorization — cookies handle token
    },
    body: JSON.stringify({
      tripId,
      templateId,
      customName,
      user_id
    })
  })
  .then(res => {
    if (!res.ok) throw new Error("Failed to add item");
    return res.json();
  })
  .then(() => {
    alert("Item Recommended!");
    window.location.href = `addItemToPackingList.html?tripId=${tripId}&userId=${user_id}`;
  })
  .catch(err => console.error("Error adding item:", err));
}