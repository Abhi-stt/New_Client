const User = require('../schemas/User');
const mongoose = require('mongoose');

/**
 * Get the admin ID for a given user
 * @param {string} userId - The user ID
 * @returns {Promise<string>} The admin ID for this user
 */
async function getUserAdminId(userId) {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }
  
  // If user is admin, they are their own admin
  if (user.role === 'admin' || user.role === 'super_admin') {
    return userId;
  }
  
  // Otherwise, return their assigned admin
  return user.adminId;
}

/**
 * Build access filter based on user role and permissions
 * @param {string} userRole - The role of the user ('super_admin', 'admin', 'manager', 'team_member', 'client')
 * @param {string} userId - The ID of the current user
 * @param {string} userAdminId - The admin ID that owns this user
 * @returns {Object} MongoDB filter object
 */
function buildAccessFilter(userRole, userId, userAdminId) {
  switch (userRole) {
    case 'super_admin':
      // Super admin can see everything
      return {};
      
    case 'admin':
      // Admin can only see data in their domain
      return {
        $or: [
          { createdBy: new mongoose.Types.ObjectId(userId) },
          { adminId: new mongoose.Types.ObjectId(userId) }
        ]
      };
      
    case 'manager':
      // Manager can see data in their admin domain that's assigned to them
      return {
        adminId: new mongoose.Types.ObjectId(userAdminId),
        $or: [
          { managerId: new mongoose.Types.ObjectId(userId) },     // Assigned as manager
          { createdBy: new mongoose.Types.ObjectId(userId) },     // Created by them
          { assigneeId: new mongoose.Types.ObjectId(userId) }     // Assigned to them
        ]
      };
      
    case 'team_member':
      // Team member can only see data assigned to them in their admin domain
      return {
        adminId: new mongoose.Types.ObjectId(userAdminId),
        $or: [
          { assigneeId: new mongoose.Types.ObjectId(userId) },    // Assigned to them
          { createdBy: new mongoose.Types.ObjectId(userId) }      // Created by them
        ]
      };
      
    case 'client':
      // Client can only see their own data
      return {
        adminId: new mongoose.Types.ObjectId(userAdminId),
        $or: [
          { clientId: new mongoose.Types.ObjectId(userId) },      // Related to them as client
          { createdBy: new mongoose.Types.ObjectId(userId) }      // Created by them (if any)
        ]
      };
      
    default:
      // Default: no access
      return { _id: null };
  }
}

/**
 * Build team member access filter for managers to see their team's data
 * @param {string} managerId - The manager's ID
 * @param {string} adminId - The admin domain ID
 * @returns {Promise<Object>} MongoDB filter object
 */
async function buildTeamAccessFilter(managerId, adminId) {
  // Get all team members under this manager
  const teamMembers = await User.find({
    managerId: new mongoose.Types.ObjectId(managerId),
    adminId: new mongoose.Types.ObjectId(adminId)
  }).select('_id');
  
  const teamMemberIds = teamMembers.map(member => member._id);
  
  return {
    adminId: new mongoose.Types.ObjectId(adminId),
    $or: [
      { managerId: new mongoose.Types.ObjectId(managerId) },      // Assigned to manager
      { createdBy: new mongoose.Types.ObjectId(managerId) },      // Created by manager
      { assigneeId: new mongoose.Types.ObjectId(managerId) },     // Assigned to manager
      { assigneeId: { $in: teamMemberIds } },                     // Assigned to team members
      { createdBy: { $in: teamMemberIds } }                       // Created by team members
    ]
  };
}

/**
 * Check if a user can access a specific resource
 * @param {string} userRole - The role of the user
 * @param {string} userId - The ID of the current user
 * @param {string} userAdminId - The admin ID that owns this user
 * @param {Object} resource - The resource to check access for
 * @returns {boolean} Whether the user can access this resource
 */
function canAccessResource(userRole, userId, userAdminId, resource) {
  // Super admin can access everything
  if (userRole === 'super_admin') {
    return true;
  }
  
  // Admin can access resources in their domain
  if (userRole === 'admin') {
    return resource.adminId?.toString() === userId || 
           resource.createdBy?.toString() === userId;
  }
  
  // Check if resource is in the same admin domain
  if (resource.adminId?.toString() !== userAdminId) {
    return false;
  }
  
  // Role-specific checks within the admin domain
  switch (userRole) {
    case 'manager':
      return resource.managerId?.toString() === userId ||
             resource.assigneeId?.toString() === userId ||
             resource.createdBy?.toString() === userId;
             
    case 'team_member':
      return resource.assigneeId?.toString() === userId ||
             resource.createdBy?.toString() === userId;
             
    case 'client':
      return resource.clientId?.toString() === userId ||
             resource.createdBy?.toString() === userId;
             
    default:
      return false;
  }
}

/**
 * Get admin domain stats for dashboard
 * @param {string} adminId - The admin ID
 * @returns {Promise<Object>} Domain statistics
 */
async function getAdminDomainStats(adminId) {
  const User = require('../schemas/User');
  const Client = require('../schemas/Client');
  const Task = require('../schemas/Task');
  
  const [users, clients, tasks] = await Promise.all([
    User.countDocuments({ adminId: new mongoose.Types.ObjectId(adminId) }),
    Client.countDocuments({ adminId: new mongoose.Types.ObjectId(adminId) }),
    Task.countDocuments({ adminId: new mongoose.Types.ObjectId(adminId) })
  ]);
  
  return {
    totalUsers: users,
    totalClients: clients,
    totalTasks: tasks
  };
}

/**
 * Set ownership fields when creating new resources
 * @param {string} userRole - The role of the creating user
 * @param {string} userId - The ID of the creating user
 * @param {string} userAdminId - The admin ID of the creating user
 * @returns {Object} Ownership fields to set
 */
function setOwnershipFields(userRole, userId, userAdminId) {
  return {
    createdBy: new mongoose.Types.ObjectId(userId),
    adminId: userRole === 'admin' || userRole === 'super_admin' 
      ? new mongoose.Types.ObjectId(userId) 
      : new mongoose.Types.ObjectId(userAdminId)
  };
}

module.exports = {
  getUserAdminId,
  buildAccessFilter,
  buildTeamAccessFilter,
  canAccessResource,
  getAdminDomainStats,
  setOwnershipFields
};
