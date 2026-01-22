const express = require('express');
const router = express.Router();
const invitationController = require('../controller/invitation.controller');
const { requireAuth } = require('../middleware/auth.middleware');

// Send invitation to a trip (requires authentication)
router.post('/trip/:tripId', requireAuth, invitationController.sendInvitation);

// Get invitation details by token (public - no auth required)
router.get('/:token', invitationController.getInvitation);

// Accept invitation (requires authentication)
router.post('/:token/accept', requireAuth, invitationController.acceptInvitation);

// Reject invitation (requires authentication)
router.post('/:token/reject', requireAuth, invitationController.rejectInvitation);

// Get all pending invitations for a trip (requires authentication)
router.get('/trip/:tripId/invitations', requireAuth, invitationController.getTripInvitations);

// Delete/cancel an invitation (requires authentication)
router.delete('/:invitationId', requireAuth, invitationController.deleteInvitation);

module.exports = router;
