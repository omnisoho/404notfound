const apiUrl = "http://localhost:3000";

document.getElementById("tripForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const token = localStorage.getItem("token");
    if (!token) {
        document.getElementById("message").textContent = "You are not logged in.";
        return;
    }

    const tripData = {
        tripName: document.getElementById("tripName").value,
        startDate: document.getElementById("startDate").value,
        endDate: document.getElementById("endDate").value,
        budgetTotal: parseFloat(document.getElementById("budgetTotal").value) || 0,
        currency: document.getElementById("currency").value
    };

    try {
        const res = await fetch(`${apiUrl}/trip`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(tripData)
        });

        const result = await res.json();

        if (!res.ok) {
            throw new Error(result.message || "Failed to create trip");
        }

        document.getElementById("message").textContent = "Trip created successfully!";

        setTimeout(() => {
            window.location.href = "tripList.html";
        }, 1000);

    } catch (err) {
        document.getElementById("message").textContent = "Error: " + err.message;
    }
});
