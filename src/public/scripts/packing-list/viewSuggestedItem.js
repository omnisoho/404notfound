const apiUrl = "http://localhost:3000";
const urlParams = new URLSearchParams(window.location.search);
const tripId = urlParams.get("tripId");

window.onload = () => {
    fetchTripInformation(tripId);
    fetch(`${apiUrl}/packingList/recommend/${tripId}`, {
      method: "GET",
      credentials: "include"
    })
    .then(res => res.ok ? res.json() : Promise.reject(`HTTP ${res.status}`))
    .then(recommendation => {
        console.log("Fetched recommendations:", recommendation);
        renderTable(recommendation)
    })
    .catch(err => {
        console.error(err);
    document.getElementById("suggestedItemsBody").innerHTML =
      '<tr><td colspan="5">Failed to load suggested items.</td></tr>';
  });
};

function renderTable(items) {
  const tbody = document.getElementById("suggestedItemsBody");
  tbody.innerHTML = "";


  if (!items || items.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5">No suggested items.</td></tr>';
    return;
  }

  items.forEach(item => {
    const tr = document.createElement("tr");

    const itemName = item.customName || (item.template ? item.template.name : "Unknown");
    const suggestedBy = item.suggestedBy?.name || "Unknown";
    const status = item.status;

    let actionBtns = "";
    if (status === "PENDING") {
      actionBtns = `
        <button onclick="approveItem('${item.id}')">Approve</button>
        <button onclick="rejectItem('${item.id}')">Reject</button>
      `;
    }

    tr.innerHTML = `
      <td>${itemName}</td>
      <td>${suggestedBy}</td>
      <td>${status}</td>
      <td>${actionBtns}</td>
    `;

    tbody.appendChild(tr);
  });
}

function fetchTripInformation(id) {
  fetch(`${apiUrl}/trip/${id}`, { credentials: "include" })
    .then(res => res.ok ? res.json() : Promise.reject(`HTTP ${res.status}`))
    .then(trip => {
      
      const tripName = trip[0]?.tripName || "Trip";
      
      // 👇 If viewing your own list, do NOT fetch a user

        document.getElementById("TripName").innerHTML =
          `Recommended Item for Packing List for Trip: ${tripName}`;
        return;
      

    })
    .catch(err => console.error("Error fetching trip:", err));
}

// Approve recommendation
async function approveItem(itemId) {
  try {
    const res = await fetch(`${apiUrl}/packingList/recommend/approve/${itemId}`, {
      method: "PUT",
      credentials: "include"
    });
    if (!res.ok) throw new Error("Failed to approve");
    alert("Item approved!");
    window.location.reload();
  } catch (err) {
    console.error(err);
    alert("Error approving item");
  }
}

// Reject recommendation
async function rejectItem(itemId) {
  try {
    const res = await fetch(`${apiUrl}/packingList/recommend/reject/${itemId}`, {
      method: "PUT",
      credentials: "include"
    });
    if (!res.ok) throw new Error("Failed to reject");
    alert("Item rejected!");
    window.location.reload();
  } catch (err) {
    console.error(err);
    alert("Error rejecting item");
  }
}
