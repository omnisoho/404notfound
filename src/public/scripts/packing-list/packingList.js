const apiUrl = "http://localhost:3000";

// URL params
const urlParams = new URLSearchParams(window.location.search);
const tripId = urlParams.get("tripId");
let targetUserId = urlParams.get("userId"); // optional, if viewing someone else's list
let userSelf = null;
// Store items for searching
let packingItems = [];

window.onload = () => {
  fetch(`${apiUrl}/packingList/user/me`, { method: "GET", credentials: "include" })
    .then(res => res.ok ? res.json() : Promise.reject(`HTTP ${res.status}`))
    .then(myself => {
      console.log("Fetched current user:", myself);
      userSelf = myself;

      if (!tripId) {
        console.error("Invalid or missing tripId in URL");
        document.getElementById("itemsTableBody").innerHTML =
          '<tr><td colspan="4">Invalid trip selected.</td></tr>';
        return;
      }

      if(targetUserId == userSelf.userId) {
        targetUserId = null; // viewing own list
      }
      // ✅ Only show Suggest button if viewing someone else's list
      if (targetUserId) {
        document.getElementById("suggestItemButton").style.display = "inline-block";
      }

      fetchTripInformation(tripId);
      fetchPackingList(tripId, targetUserId);

      document.getElementById("searchInput").addEventListener("input", filterPackingList);

      // Add item button only visible for own list
      if (!targetUserId) {
        document.getElementById("viewSuggestedItemButton").style.display = "inline-block";
        document.getElementById("addItemButton").style.display = "inline-block";
      } else {
        document.getElementById("viewSuggestedItemButton").style.display = "none";
        document.getElementById("addItemButton").style.display = "none";
      }

      document.getElementById("suggestItemButton").onclick = () => {
        window.location.href =
          `addItemToPackingList.html?tripId=${tripId}&userId=${targetUserId}`;
      };
    })
    .catch(err => console.error("Error fetching current user:", err));
};


// Fetch trip info
function fetchTripInformation(id) {
  fetch(`${apiUrl}/trip/${id}`, { credentials: "include" })
    .then(res => res.ok ? res.json() : Promise.reject(`HTTP ${res.status}`))
    .then(trip => {
      
      const tripName = trip[0]?.tripName || "Trip";
      
      // 👇 If viewing your own list, do NOT fetch a user
      if (!targetUserId) {
        document.getElementById("TripName").innerHTML =
          `Packing List for Trip: ${tripName}`;
        return;
      }

      // 👇 Only fetch user if targetUserId is a real UUID
      fetch(`${apiUrl}/packingList/user/${targetUserId}`, { credentials: "include" })
        .then(res => res.ok ? res.json() : Promise.reject(`HTTP ${res.status}`))
        .then(user => {
          console.log("Fetched user:", user);
          document.getElementById("TripName").innerHTML =
            `Packing List for ${tripName} - User: ${user.name}`;
        })
        .catch(err => console.error("Error fetching user:", err));
    })
    .catch(err => console.error("Error fetching trip:", err));
}

// Fetch packing list
function fetchPackingList(tripId, userId = null) {
  const url = userId
    ? `${apiUrl}/packingList/${tripId}?userId=${userId}`
    : `${apiUrl}/packingList/${tripId}`;

  fetch(url, { credentials: "include" })
    .then(res => res.ok ? res.json() : Promise.reject("Failed to fetch packing list"))
    .then(items => {
      packingItems = items;
      renderPackingList(items);
    })
    .catch(err => {
      console.error("Error fetching packing list:", err);
      document.getElementById("itemsTableBody").innerHTML =
        `<tr><td colspan="4">Failed to load packing list.</td></tr>`;
    });
}

// Render packing list
function renderPackingList(items) {
  const tableBody = document.getElementById("itemsTableBody");
  tableBody.innerHTML = "";

  if (!items || items.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="4">No items in packing list.</td></tr>';
    return;
  }

  items.forEach(item => {
    const row = document.createElement("tr");
    const itemName = item.customName || (item.template ? item.template.name : "");

    let actionBtns = "";

    if (!targetUserId) {
      // Own list → edit/delete
      actionBtns = `
        ${item.customName ? `<button onclick="editItem('${item.id}')">Edit</button>` : ""}
        <button onclick="deleteItem('${item.id}')">Delete</button>
      `;
    } else {
  // Viewing other's list → no actions
  actionBtns = "";
}

    row.innerHTML = `
      <td>${item.id}</td>
      <td id="name-${item.id}">${itemName}</td>
      <td>
        ${!targetUserId 
          ? `<input type="checkbox" ${item.isChecked ? "checked" : ""} onchange="toggleCheck('${item.id}', this.checked)">`
          : item.isChecked ? "✅" : "❌"
        }
      </td>
      <td>${actionBtns}</td>
    `;

    row.setAttribute("id", `row-${item.id}`);
    tableBody.appendChild(row);
  });
}

// Filter items
function filterPackingList() {
  const query = document.getElementById("searchInput").value.toLowerCase();
  const filtered = packingItems.filter(item =>
    (item.customName || (item.template ? item.template.name : ""))
      .toLowerCase()
      .includes(query)
  );
  renderPackingList(filtered);
}

// Add item
document.getElementById("viewSuggestedItemButton").onclick = () => {
  window.location.href = `viewSuggestedItem.html?tripId=${tripId}`;
};
document.getElementById("addItemButton").onclick = () => {
  window.location.href = `addItemToPackingList.html?tripId=${tripId}`;
};

// Edit / Save / Cancel / Delete
function editItem(itemId) {
  const nameCell = document.getElementById(`name-${itemId}`);
  const originalName = nameCell.textContent;
  nameCell.innerHTML = `<input type="text" id="edit-${itemId}" value="${originalName}" style="width:150px;">`;

  const row = document.getElementById(`row-${itemId}`);
  row.children[3].innerHTML = `
    <button onclick="saveItem('${itemId}')">Save</button>
    <button onclick="cancelEdit('${itemId}', '${originalName}')">Cancel</button>
  `;
}

function saveItem(itemId) {
  const newName = document.getElementById(`edit-${itemId}`).value.trim();
  if (!newName) return alert("Name cannot be empty");

  fetch(`${apiUrl}/packingList/${itemId}`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ customName: newName })
  })
    .then(res => res.ok ? fetchPackingList(tripId) : Promise.reject("Failed to update"))
    .catch(err => console.error(err));
}

function cancelEdit(itemId, originalName) {
  const nameCell = document.getElementById(`name-${itemId}`);
  nameCell.textContent = originalName;

  const row = document.getElementById(`row-${itemId}`);
  row.children[3].innerHTML = `
    ${item.customName ? `<button onclick="editItem('${itemId}')">Edit</button>` : ""}
    <button onclick="deleteItem('${itemId}')">Delete</button>
  `;
}

function deleteItem(itemId) {
  if (!confirm("Are you sure you want to delete this item?")) return;

  fetch(`${apiUrl}/packingList/${itemId}`, { method: "DELETE", credentials: "include" })
    .then(res => res.ok ? fetchPackingList(tripId) : Promise.reject("Failed to delete"))
    .catch(err => console.error(err));
}

function toggleCheck(itemId, isChecked) {
  fetch(`${apiUrl}/api/packingList/${itemId}`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isChecked })
  })
  .then(res => { if (!res.ok) throw new Error("Failed to update checkbox"); })
  .catch(err => console.error(err));
}

// ✅ Recommend item to other user
function recommendItem(itemId) {
  const targetId = targetUserId;
  if (!targetId) return alert("Cannot recommend to yourself");

  fetch(`${apiUrl}/packingList/recommend`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ itemId, targetUserId: targetId })
  })
    .then(res => res.ok ? alert("Item recommended!") : Promise.reject("Failed to recommend"))
    .catch(err => console.error(err));
}
