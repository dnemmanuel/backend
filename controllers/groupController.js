import Group from '../models/groupModel.js';
import Folder from '../folder/folderModel.js';
import { logSystemEvent } from './systemEventController.js';
import { HTTP_STATUS, ERROR_MESSAGES, SUCCESS_MESSAGES } from '../constants/index.js';
import { logInfo, logError } from '../utils/logger.js';

/**
 * Get all groups (active and inactive)
 */
export const getAllGroups = async (req, res) => {
  try {
    const groups = await Group.find()
      .populate('parentGroup', 'name code')
      .populate('createdBy', 'username firstName lastName')
      .populate('updatedBy', 'username firstName lastName')
      .sort({ sortOrder: 1, name: 1 });
    
    res.status(HTTP_STATUS.OK).json(groups);
  } catch (error) {
    logError('Error fetching groups', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      message: ERROR_MESSAGES.INTERNAL_ERROR,
    });
  }
};

/**
 * Get all active groups (for dropdown selections)
 */
export const getActiveGroups = async (req, res) => {
  try {
    const groups = await Group.find({ isActive: true })
      .select('name code description icon defaultTheme sortOrder')
      .sort({ sortOrder: 1, name: 1 });
    
    res.status(HTTP_STATUS.OK).json(groups);
  } catch (error) {
    logError('Error fetching active groups', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      message: ERROR_MESSAGES.INTERNAL_ERROR,
    });
  }
};

/**
 * Get single group by ID
 */
export const getGroupById = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id)
      .populate('parentGroup', 'name code');
    
    if (!group) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        message: 'Group not found',
      });
    }
    
    res.status(HTTP_STATUS.OK).json(group);
  } catch (error) {
    logError('Error fetching group', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      message: ERROR_MESSAGES.INTERNAL_ERROR,
    });
  }
};

/**
 * Get group by basePath or code
 * Used to find which group a route belongs to
 */
export const getGroupByPath = async (req, res) => {
  try {
    const { path } = req.query;
    
    if (!path) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        message: 'Path parameter is required',
      });
    }
    
    // Extract group code from path
    // Path format: /gosl-payroll/{groupCode}/...
    const pathParts = path.split('/').filter(p => p);
    
    if (pathParts.length < 2 || pathParts[0] !== 'gosl-payroll') {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        message: 'Invalid path format. Expected: /gosl-payroll/{groupCode}',
      });
    }
    
    const groupCode = pathParts[1];
    
    const group = await Group.findOne({ code: groupCode, isActive: true })
      .populate('parentGroup', 'name code');
    
    if (!group) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        message: `Group not found for path: ${path}`,
      });
    }
    
    res.status(HTTP_STATUS.OK).json(group);
  } catch (error) {
    logError('Error fetching group by path', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      message: ERROR_MESSAGES.INTERNAL_ERROR,
    });
  }
};

/**
 * Create a new group
 */
export const createGroup = async (req, res) => {
  try {
    const {
      name,
      description,
      icon,
      defaultTheme,
      defaultPermissions,
      parentGroup,
      isActive,
      sortOrder,
      autoGeneration,
    } = req.body;

    // Check if group with same name already exists
    const existingGroup = await Group.findOne({ name });
    if (existingGroup) {
      return res.status(HTTP_STATUS.CONFLICT).json({
        message: 'A group with this name already exists',
      });
    }

    const newGroup = new Group({
      name,
      description,
      icon: icon || 'folder',
      defaultTheme: defaultTheme || 'blue',
      defaultPermissions: defaultPermissions || ['view_folder'],
      parentGroup: parentGroup || null,
      isActive: isActive !== undefined ? isActive : true,
      sortOrder: sortOrder || 0,
      autoGeneration: autoGeneration || {
        enabled: false,
        frequency: 'none',
        nameTemplate: '{month} {year}',
      },
      createdBy: req.user._id,
    });

    const savedGroup = await newGroup.save();
    
    // Log the action
    logSystemEvent(
      req.user._id,
      req.user.username,
      'Group Created',
      `Created group: ${savedGroup.name}`,
      savedGroup._id
    );
    
    logInfo('Group created successfully', {
      groupId: savedGroup._id,
      groupName: savedGroup.name,
      userId: req.user._id,
    });

    res.status(HTTP_STATUS.CREATED).json({
      message: SUCCESS_MESSAGES.SAVE_SUCCESS,
      group: savedGroup,
    });
  } catch (error) {
    logError('Error creating group', error);
    
    if (error.code === 11000) {
      return res.status(HTTP_STATUS.CONFLICT).json({
        message: 'Group name or code already exists',
      });
    }
    
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      message: ERROR_MESSAGES.INTERNAL_ERROR,
    });
  }
};

/**
 * Update an existing group
 */
export const updateGroup = async (req, res) => {
  try {
    const groupId = req.params.id;
    const {
      name,
      description,
      icon,
      defaultTheme,
      defaultPermissions,
      parentGroup,
      isActive,
      sortOrder,
      autoGeneration,
    } = req.body;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        message: 'Group not found',
      });
    }

    // Check for duplicate name (excluding current group)
    if (name && name !== group.name) {
      const existingGroup = await Group.findOne({ name, _id: { $ne: groupId } });
      if (existingGroup) {
        return res.status(HTTP_STATUS.CONFLICT).json({
          message: 'A group with this name already exists',
        });
      }
    }

    // Update fields
    if (name !== undefined) group.name = name;
    if (description !== undefined) group.description = description;
    if (icon !== undefined) group.icon = icon;
    if (defaultTheme !== undefined) group.defaultTheme = defaultTheme;
    if (defaultPermissions !== undefined) group.defaultPermissions = defaultPermissions;
    if (parentGroup !== undefined) group.parentGroup = parentGroup;
    if (isActive !== undefined) group.isActive = isActive;
    if (sortOrder !== undefined) group.sortOrder = sortOrder;
    if (autoGeneration !== undefined) group.autoGeneration = autoGeneration;
    
    group.updatedBy = req.user._id;

    const updatedGroup = await group.save();
    
    // Log the action
    logSystemEvent(
      req.user._id,
      req.user.username,
      'Group Updated',
      `Updated group: ${updatedGroup.name}`,
      updatedGroup._id
    );
    
    logInfo('Group updated successfully', {
      groupId: updatedGroup._id,
      groupName: updatedGroup.name,
      userId: req.user._id,
    });

    res.status(HTTP_STATUS.OK).json({
      message: SUCCESS_MESSAGES.UPDATE_SUCCESS,
      group: updatedGroup,
    });
  } catch (error) {
    logError('Error updating group', error);
    
    if (error.code === 11000) {
      return res.status(HTTP_STATUS.CONFLICT).json({
        message: 'Group name or code already exists',
      });
    }
    
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      message: ERROR_MESSAGES.INTERNAL_ERROR,
    });
  }
};

/**
 * Delete a group (soft delete or prevent if folders exist)
 */
export const deleteGroup = async (req, res) => {
  try {
    const groupId = req.params.id;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        message: 'Group not found',
      });
    }

    // Check if any folders are using this group
    const folderCount = await Folder.countDocuments({ group: group.code });
    if (folderCount > 0) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        message: `Cannot delete group. ${folderCount} folder(s) are currently using this group. Please reassign or delete those folders first.`,
        folderCount,
      });
    }

    // Check if any child groups exist
    const childGroupCount = await Group.countDocuments({ parentGroup: groupId });
    if (childGroupCount > 0) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        message: `Cannot delete group. ${childGroupCount} child group(s) exist. Please delete or reassign child groups first.`,
        childGroupCount,
      });
    }

    await Group.findByIdAndDelete(groupId);
    
    // Log the action
    logSystemEvent(
      req.user._id,
      req.user.username,
      'Group Deleted',
      `Deleted group: ${group.name}`,
      groupId
    );
    
    logInfo('Group deleted successfully', {
      groupId,
      groupName: group.name,
      userId: req.user._id,
    });

    res.status(HTTP_STATUS.OK).json({
      message: SUCCESS_MESSAGES.DELETE_SUCCESS,
    });
  } catch (error) {
    logError('Error deleting group', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      message: ERROR_MESSAGES.INTERNAL_ERROR,
    });
  }
};

/**
 * Get folder count for each group
 */
export const getGroupStats = async (req, res) => {
  try {
    const groups = await Group.find().select('name code');
    
    const stats = await Promise.all(
      groups.map(async (group) => {
        const folderCount = await Folder.countDocuments({ group: group.code });
        return {
          groupId: group._id,
          groupName: group.name,
          groupCode: group.code,
          folderCount,
        };
      })
    );
    
    res.status(HTTP_STATUS.OK).json(stats);
  } catch (error) {
    logError('Error fetching group stats', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      message: ERROR_MESSAGES.INTERNAL_ERROR,
    });
  }
};
