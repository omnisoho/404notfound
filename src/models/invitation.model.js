const prisma = require('./prismaClient');
const crypto = require('crypto');

// Create invitation and send to email
async function createInvitation(tripId, email, invitedBy, role = 'editor') {
  // Generate unique token
  const token = crypto.randomBytes(32).toString('hex');
  
  // Expires in 7 days
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const invitation = await prisma.tripInvitation.create({
    data: {
      tripId,
      email: email.toLowerCase(),
      token,
      role,
      invitedBy,
      expiresAt,
      status: 'pending'
    },
    include: {
      trip: {
        select: {
          id: true,
          tripName: true,
          startDate: true,
          endDate: true
        }
      },
      inviter: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    }
  });

  return invitation;
}

// Get invitation by token
async function getInvitationByToken(token) {
  const invitation = await prisma.tripInvitation.findUnique({
    where: { token },
    include: {
      trip: {
        select: {
          id: true,
          tripName: true,
          startDate: true,
          endDate: true,
          budgetTotal: true
        }
      },
      inviter: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    }
  });

  return invitation;
}

// Accept invitation and add user to trip
async function acceptInvitation(token, userId) {
  const invitation = await getInvitationByToken(token);

  if (!invitation) {
    throw new Error('Invitation not found');
  }

  if (invitation.status !== 'pending') {
    throw new Error(`Invitation is ${invitation.status}`);
  }

  if (new Date() > new Date(invitation.expiresAt)) {
    // Mark as expired
    await prisma.tripInvitation.update({
      where: { id: invitation.id },
      data: { status: 'expired' }
    });
    throw new Error('Invitation has expired');
  }

  // Update invitation and create member in one transaction
  const result = await prisma.$transaction(async (tx) => {
    // Update invitation status
    await tx.tripInvitation.update({
      where: { id: invitation.id },
      data: { status: 'accepted' }
    });

    // Add user to trip
    const member = await tx.tripMember.create({
      data: {
        tripId: invitation.tripId,
        userId: userId,
        role: invitation.role
      },
      include: {
        trip: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    return member;
  });

  return result;
}

// Reject invitation
async function rejectInvitation(token) {
  const invitation = await getInvitationByToken(token);

  if (!invitation) {
    throw new Error('Invitation not found');
  }

  if (invitation.status !== 'pending') {
    throw new Error(`Invitation is ${invitation.status}`);
  }

  const updated = await prisma.tripInvitation.update({
    where: { id: invitation.id },
    data: { status: 'rejected' }
  });

  return updated;
}

// Get pending invitations for a trip
async function getPendingInvitationsByTrip(tripId) {
  const invitations = await prisma.tripInvitation.findMany({
    where: {
      tripId,
      status: 'pending',
      expiresAt: {
        gt: new Date() // Only non-expired ones
      }
    },
    include: {
      inviter: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  return invitations;
}

// Get invitations sent by user
async function getInvitationsByInviter(userId) {
  const invitations = await prisma.tripInvitation.findMany({
    where: { invitedBy: userId },
    include: {
      trip: {
        select: {
          id: true,
          tripName: true
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  return invitations;
}

// Mark expired invitations (run via cron or on-demand)
async function expireOldInvitations() {
  const result = await prisma.tripInvitation.updateMany({
    where: {
      status: 'pending',
      expiresAt: {
        lt: new Date()
      }
    },
    data: {
      status: 'expired'
    }
  });

  return result.count;
}

// Delete invitation (must be inviter or trip owner)
async function deleteInvitation(invitationId, userId) {
  // Check if user can delete this
  const invitation = await prisma.tripInvitation.findUnique({
    where: { id: invitationId },
    include: {
      trip: {
        select: {
          createdBy: true
        }
      }
    }
  });

  if (!invitation) {
    throw new Error('Invitation not found');
  }

  if (invitation.invitedBy !== userId && invitation.trip.createdBy !== userId) {
    throw new Error('Unauthorized to delete this invitation');
  }

  const deleted = await prisma.tripInvitation.delete({
    where: { id: invitationId }
  });

  return deleted;
}

module.exports = {
  createInvitation,
  getInvitationByToken,
  acceptInvitation,
  rejectInvitation,
  getPendingInvitationsByTrip,
  getInvitationsByInviter,
  expireOldInvitations,
  deleteInvitation
};
