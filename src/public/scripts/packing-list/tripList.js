const apiUrl = "http://localhost:3000";

window.onload = populateTripList;

function populateTripList() {
  fetch(`${apiUrl}/trip`, {
    method: "GET",
    credentials: "include", // ✅ include cookies automatically
  })
    .then(async (response) => {
      if (!response.ok) {
        if (response.status === 401) {
          alert("You are not logged in");
          window.location.href = "/auth";
        }
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return response.json();
    })
    .then((trips) => {
      const tableBody = document.getElementById("itemsTableBody");
      tableBody.innerHTML = "";

      trips.forEach((trip) => {
        const row = document.createElement("tr");

        row.innerHTML = `
          <td>${trip.tripName}</td>
          <td>
              <button onclick="goToPackingList('${trip.id}')">View</button>
          </td>
          <td>
              <button onclick="manageMembers('${trip.id}')">Members</button>
          </td>
        `;

        tableBody.appendChild(row);
      });
    })
    .catch((error) => console.error("Error fetching trips:", error));
}

function goToPackingList(id) {
  window.location.href = `packingList.html?tripId=${id}`;
}

function manageMembers(tripId) {
  window.location.href = `memberList.html?tripId=${tripId}`;
}
