const apiUrl = "http://localhost:3000";
const urlParams = new URLSearchParams(window.location.search);
const tripId = urlParams.get("tripId");
const token = localStorage.getItem("token");
const user = JSON.parse(localStorage.getItem("user"));

let allMembers = [];
let allInvitations = [];

window.onload = () => {
  if (!tripId) {
    showAlert("No tripId found", "error");
    return;
  }

  fetchMembers();
  fetchInvitations();
};

// Fetch current members
function fetchMembers() {
  // Build headers - include token from localStorage if available
  const headers = {
    "Content-Type": "application/json"
  };
  
  // Add Authorization header only if token exists in localStorage
  if (token && token !== 'null' && token !== 'undefined') {
    headers["Authorization"] = `Bearer ${token}`;
  }
  
  fetch(`${apiUrl}/trip/${tripId}/members`, {
    headers: headers,
    credentials: 'include'
  })
    .then(res => res.json())
    .then(data => {
      allMembers = data;
      renderMembers(data);
    })
    .catch(err => {
      console.error("Error fetching members:", err);
      showAlert("Failed to load members", "error");
    });
}

// Fetch pending invitations
function fetchInvitations() {
  // Build headers - include token from localStorage if available
  const headers = {
    "Content-Type": "application/json"
  };
  
  // Add Authorization header only if token exists in localStorage
  if (token && token !== 'null' && token !== 'undefined') {
    headers["Authorization"] = `Bearer ${token}`;
  }
  
  fetch(`${apiUrl}/api/invite/trip/${tripId}/invitations`, {
    headers: headers,
    credentials: 'include' // Important: Send cookies for authentication
  })
    .then(res => {
      if (!res.ok) throw new Error('Failed to fetch invitations');
      return res.json();
    })
    .then(data => {
      allInvitations = data.invitations || [];
      renderInvitations(allInvitations);
    })
    .catch(err => {
      console.error("Error fetching invitations:", err);
      document.getElementById("invitationsTableBody").innerHTML = 
        `<tr><td colspan="6" class="empty-state">Failed to load invitations</td></tr>`;
    });
}

// Render members table
function renderMembers(members) {
  const tableBody = document.getElementById("membersTableBody");
  tableBody.innerHTML = "";

  // Ensure members is an array
  if (!members || !Array.isArray(members)) {
    tableBody.innerHTML = `<tr><td colspan="4" class="empty-state">Failed to load members</td></tr>`;
    return;
  }

  if (members.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="4" class="empty-state">No members yet</td></tr>`;
    return;
  }

  members.forEach(member => {
    const userId = member.user.id;
    const name = member.user.name || "Unknown";
    const email = member.user.email;
    const role = member.role;
    const isSelf = (userId === user.id);

    const row = document.createElement("tr");
    row.innerHTML = `
      <td><strong>${name}</strong></td>
      <td>${email}</td>
      <td><span class="badge badge-${role}">${role}</span></td>
      <td>
        ${
          isSelf
            ? `<span class="badge" style="background: #e0e7ff; color: #4338ca;">You</span>`
            : `<button class="btn btn-danger" onclick="removeMember('${member.id}')">Remove</button>`
        }
      </td>
      <td>
        <button onclick="viewPackingList('${tripId}', '${userId}')">View Packing List</button>
      </td>
    `;
    tableBody.appendChild(row);
  });
}

// Render invitations table
function renderInvitations(invitations) {
  const tableBody = document.getElementById("invitationsTableBody");
  tableBody.innerHTML = "";

  if (invitations.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="6" class="empty-state">No pending invitations</td></tr>`;
    return;
  }

  invitations.forEach(invitation => {
    const expiresAt = new Date(invitation.expiresAt);
    const now = new Date();
    const isExpired = expiresAt < now;
    
    const timeLeft = getTimeRemaining(expiresAt);

    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${invitation.email}</td>
      <td><span class="badge badge-${invitation.role}">${invitation.role}</span></td>
      <td><span class="badge badge-${invitation.status}">${invitation.status}</span></td>
      <td>
        <div>${expiresAt.toLocaleDateString()}</div>
        <div class="expires-text">${timeLeft}</div>
      </td>
      <td>${invitation.inviter?.name || 'Unknown'}</td>
      <td>
        <div class="action-buttons">
          <button class="btn btn-secondary" onclick="cancelInvitation('${invitation.id}')">Cancel</button>
        </div>
      </td>
    `;
    tableBody.appendChild(row);
  });
}

// Send invitation via email
async function sendInvitation() {
  const email = document.getElementById("inviteEmail").value.trim();
  const role = document.getElementById("inviteRole").value;

  if (!email) {
    showAlert("Please enter an email address", "error");
    return;
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    showAlert("Please enter a valid email address", "error");
    return;
  }

  // Default to editor if not specified
  const inviteRole = role || 'editor';

  const sendBtn = document.getElementById("sendInviteBtn");
  sendBtn.disabled = true;
  sendBtn.textContent = "Sending...";

  try {
    const headers = {
      "Content-Type": "application/json"
    };
    
    if (token && token !== 'null' && token !== 'undefined') {
      headers["Authorization"] = `Bearer ${token}`;
    }
    
    const response = await fetch(`${apiUrl}/api/invite/trip/${tripId}`, {
      method: "POST",
      headers: headers,
      credentials: 'include',
      body: JSON.stringify({ email, role: inviteRole })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to send invitation");
    }

    // Handle partial success (invitation created but email failed)
    if (data.emailSent === false) {
      showAlert(
        `Invitation created but email could not be sent to ${email}. ${data.emailError || 'Please configure email settings.'}`,
        "warning"
      );
    } else {
      showAlert(`Invitation sent to ${email} successfully!`, "success");
    }
    
    // Clear form
    document.getElementById("inviteEmail").value = "";
    document.getElementById("inviteRole").value = "editor";
    
    // Refresh invitations list
    fetchInvitations();

  } catch (error) {
    console.error("Error sending invitation:", error);
    showAlert(error.message || "Failed to send invitation", "error");
  } finally {
    sendBtn.disabled = false;
    sendBtn.textContent = "Send Invitation";
  }
}

// Cancel invitation
async function cancelInvitation(invitationId) {
  if (!confirm("Are you sure you want to cancel this invitation?")) {
    return;
  }

  try {
    const headers = {
      "Content-Type": "application/json"
    };
    
    if (token && token !== 'null' && token !== 'undefined') {
      headers["Authorization"] = `Bearer ${token}`;
    }
    
    const response = await fetch(`${apiUrl}/api/invite/${invitationId}`, {
      method: "DELETE",
      headers: headers,
      credentials: 'include'
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || "Failed to cancel invitation");
    }

    showAlert("Invitation cancelled successfully", "success");
    fetchInvitations();

  } catch (error) {
    console.error("Error cancelling invitation:", error);
    showAlert(error.message || "Failed to cancel invitation", "error");
  }
}

// Remove member from trip
async function removeMember(memberId) {
  if (!confirm("Remove this member from the trip?")) return;

  try {
    const headers = {
      "Content-Type": "application/json"
    };
    
    if (token && token !== 'null' && token !== 'undefined') {
      headers["Authorization"] = `Bearer ${token}`;
    }
    
    const response = await fetch(`${apiUrl}/trip/${tripId}/members/${memberId}`, {
      method: "DELETE",
      headers: headers,
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error("Failed to remove member");
    }

    showAlert("Member removed successfully", "success");
    fetchMembers();

  } catch (error) {
    console.error("Error removing member:", error);
    showAlert("Failed to remove member", "error");
  }
}

// Show alert message
function showAlert(message, type) {
  const alertContainer = document.getElementById("alertContainer");
  
  const alert = document.createElement("div");
  alert.className = `alert alert-${type}`;
  alert.textContent = message;
  
  alertContainer.appendChild(alert);
  
  // Auto-remove after 5 seconds
  setTimeout(() => {
    alert.remove();
  }, 5000);
}

// Get time remaining until expiry
function getTimeRemaining(expiresAt) {
  const now = new Date();
  const diff = expiresAt - now;
  
  if (diff <= 0) return "Expired";
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  
  if (days > 0) {
    return `${days} day${days > 1 ? 's' : ''} left`;
  } else if (hours > 0) {
    return `${hours} hour${hours > 1 ? 's' : ''} left`;
  } else {
    return "Expiring soon";
  }
}
