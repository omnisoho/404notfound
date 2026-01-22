const invitationModel = require('../models/invitation.model');
const emailService = require('../services/emailService');
const prisma = require('../models/prismaClient');

/**
 * Send a trip invitation via email
 */
async function sendInvitation(req, res) {
  try {
    const { tripId } = req.params;
    const { email, role = 'viewer' } = req.body;
    const invitedBy = req.user.userId;

    // Validate email
    if (!email || !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      return res.status(400).json({ error: 'Valid email is required' });
    }

    // Check if user has permission to invite (must be owner or editor)
    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        members: {
          where: { userId: invitedBy }
        },
        creator: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    if (!trip) {
      return res.status(404).json({ error: 'Trip not found' });
    }

    const isCreator = trip.createdBy === invitedBy;
    const memberRole = trip.members[0]?.role;
    
    if (!isCreator && memberRole !== 'owner' && memberRole !== 'editor') {
      return res.status(403).json({ error: 'You do not have permission to invite members to this trip' });
    }

    // Check if user is already a member
    const existingMember = await prisma.tripMember.findFirst({
      where: {
        tripId,
        user: {
          email: email.toLowerCase()
        }
      }
    });

    if (existingMember) {
      return res.status(400).json({ error: 'User is already a member of this trip' });
    }

    // Check if there's already a pending invitation
    const existingInvitation = await prisma.tripInvitation.findFirst({
      where: {
        tripId,
        email: email.toLowerCase(),
        status: 'pending',
        expiresAt: {
          gt: new Date()
        }
      }
    });

    if (existingInvitation) {
      return res.status(400).json({ error: 'An invitation has already been sent to this email' });
    }

    // Create invitation
    const invitation = await invitationModel.createInvitation(
      tripId,
      email,
      invitedBy,
      role
    );

    // Send invitation email
    let emailSent = false;
    let emailError = null;
    
    try {
      await emailService.sendInvitationEmail({
        toEmail: email,
        inviterName: req.user.name || trip.creator.name,
        tripName: trip.tripName,
        tripStartDate: trip.startDate,
        tripEndDate: trip.endDate,
        token: invitation.token,
        expiresAt: invitation.expiresAt
      });
      emailSent = true;
    } catch (error) {
      console.error('Failed to send invitation email:', error.message);
      emailError = error.message;
      // Continue - invitation is still created even if email fails
    }

    res.status(201).json({
      message: emailSent 
        ? 'Invitation sent successfully' 
        : 'Invitation created but email could not be sent. Please check email configuration.',
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        status: invitation.status,
        expiresAt: invitation.expiresAt,
        createdAt: invitation.createdAt
      },
      emailSent,
      ...(emailError && { emailError: 'Email service unavailable. Invitation link can be shared manually.' })
    });
  } catch (error) {
    console.error('Error sending invitation:', error);
    res.status(500).json({ error: 'Failed to send invitation' });
  }
}

/**
 * Get invitation details by token (public endpoint)
 */
async function getInvitation(req, res) {
  try {
    const { token } = req.params;

    const invitation = await invitationModel.getInvitationByToken(token);

    if (!invitation) {
      return res.status(404).json({ error: 'Invitation not found' });
    }

    // Check if expired
    if (new Date() > new Date(invitation.expiresAt)) {
      // Update status if not already expired
      if (invitation.status === 'pending') {
        await prisma.tripInvitation.update({
          where: { id: invitation.id },
          data: { status: 'expired' }
        });
      }
      return res.status(410).json({ error: 'Invitation has expired' });
    }

    // Check if already used
    if (invitation.status !== 'pending') {
      return res.status(410).json({ error: `Invitation is ${invitation.status}` });
    }

    res.json({
      invitation: {
        id: invitation.id,
        trip: invitation.trip,
        inviter: invitation.inviter,
        role: invitation.role,
        expiresAt: invitation.expiresAt
      }
    });
  } catch (error) {
    console.error('Error getting invitation:', error);
    res.status(500).json({ error: 'Failed to get invitation' });
  }
}

/**
 * Accept a trip invitation
 */
async function acceptInvitation(req, res) {
  try {
    const { token } = req.params;
    const userId = req.user.userId;

    // Get user's email
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get invitation
    const invitation = await invitationModel.getInvitationByToken(token);

    if (!invitation) {
      return res.status(404).json({ error: 'Invitation not found' });
    }

    // Check if invitation email matches user email
    if (invitation.email.toLowerCase() !== user.email.toLowerCase()) {
      return res.status(403).json({ 
        error: 'This invitation was sent to a different email address' 
      });
    }

    // Accept invitation
    const member = await invitationModel.acceptInvitation(token, userId);

    // Send notification to inviter
    try {
      const inviter = await prisma.user.findUnique({
        where: { id: invitation.invitedBy },
        select: { email: true }
      });

      if (inviter) {
        await emailService.sendAcceptedNotificationEmail({
          toEmail: inviter.email,
          acceptedUserName: user.name,
          tripName: invitation.trip.tripName
        });
      }
    } catch (emailError) {
      console.error('Failed to send acceptance notification:', emailError);
      // Continue even if email fails
    }

    res.json({
      message: 'Invitation accepted successfully',
      trip: member.trip,
      role: member.role
    });
  } catch (error) {
    console.error('Error accepting invitation:', error);
    
    if (error.message.includes('expired')) {
      return res.status(410).json({ error: error.message });
    }
    
    res.status(500).json({ error: error.message || 'Failed to accept invitation' });
  }
}

/**
 * Reject a trip invitation
 */
async function rejectInvitation(req, res) {
  try {
    const { token } = req.params;
    const userId = req.user.userId;

    // Get user's email
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get invitation
    const invitation = await invitationModel.getInvitationByToken(token);

    if (!invitation) {
      return res.status(404).json({ error: 'Invitation not found' });
    }

    // Check if invitation email matches user email
    if (invitation.email.toLowerCase() !== user.email.toLowerCase()) {
      return res.status(403).json({ 
        error: 'This invitation was sent to a different email address' 
      });
    }

    await invitationModel.rejectInvitation(token);

    res.json({ message: 'Invitation rejected successfully' });
  } catch (error) {
    console.error('Error rejecting invitation:', error);
    res.status(500).json({ error: error.message || 'Failed to reject invitation' });
  }
}

/**
 * Get all pending invitations for a trip
 */
async function getTripInvitations(req, res) {
  try {
    const { tripId } = req.params;
    const userId = req.user.userId;

    // Check if user has permission to view invitations
    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        members: {
          where: { userId }
        }
      }
    });

    if (!trip) {
      return res.status(404).json({ error: 'Trip not found' });
    }

    const isCreator = trip.createdBy === userId;
    const memberRole = trip.members[0]?.role;
    
    if (!isCreator && memberRole !== 'owner' && memberRole !== 'editor') {
      return res.status(403).json({ error: 'You do not have permission to view invitations for this trip' });
    }

    const invitations = await invitationModel.getPendingInvitationsByTrip(tripId);

    res.json({ invitations });
  } catch (error) {
    console.error('Error getting trip invitations:', error);
    res.status(500).json({ error: 'Failed to get invitations' });
  }
}

/**
 * Delete/cancel an invitation
 */
async function deleteInvitation(req, res) {
  try {
    const { invitationId } = req.params;
    const userId = req.user.userId;

    await invitationModel.deleteInvitation(invitationId, userId);

    res.json({ message: 'Invitation cancelled successfully' });
  } catch (error) {
    console.error('Error deleting invitation:', error);
    
    if (error.message === 'Unauthorized to delete this invitation') {
      return res.status(403).json({ error: error.message });
    }
    
    res.status(500).json({ error: 'Failed to cancel invitation' });
  }
}

module.exports = {
  sendInvitation,
  getInvitation,
  acceptInvitation,
  rejectInvitation,
  getTripInvitations,
  deleteInvitation
};
