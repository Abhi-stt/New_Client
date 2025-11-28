const express = require('express');
const multer = require('multer');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const Hearing = require('../schemas/Hearing');
const Case = require('../schemas/Case');
const User = require('../schemas/User');
const { getUserAdminId } = require('../utils/accessControl');

const router = express.Router();

const ensureDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

const hearingUploadsDir = path.join(__dirname, '..', 'uploads', 'hearings');
ensureDir(hearingUploadsDir);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, hearingUploadsDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});

const upload = multer({ storage });

const parseJSON = (value, fallback) => {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch (error) {
    return fallback;
  }
};

const parseDate = (value) => {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
};

const buildRoleFilter = (role = 'admin', userId, adminId) => {
  if (role === 'super_admin') {
    return {};
  }

  const filter = { adminId };

  if (role === 'admin') {
    return filter;
  }

  if (role === 'manager') {
    filter.$or = [
      { managerId: new mongoose.Types.ObjectId(userId) },
      { assigneeId: new mongoose.Types.ObjectId(userId) },
      { createdBy: new mongoose.Types.ObjectId(userId) },
      { 'teamAssignments.userId': new mongoose.Types.ObjectId(userId) },
    ];
    return filter;
  }

  if (role === 'team_member') {
    filter.$or = [
      { assigneeId: new mongoose.Types.ObjectId(userId) },
      { createdBy: new mongoose.Types.ObjectId(userId) },
      { 'teamAssignments.userId': new mongoose.Types.ObjectId(userId) },
    ];
    return filter;
  }

  if (role === 'client') {
    filter.clientId = new mongoose.Types.ObjectId(userId);
    return filter;
  }

  return filter;
};

const mapAttachments = (files = [], category, uploadedBy) =>
  files.map((file) => ({
    category,
    filename: file.filename,
    originalName: file.originalname,
    url: `/uploads/hearings/${file.filename}`,
    size: file.size,
    mimetype: file.mimetype,
    uploadedBy,
    uploadedAt: new Date(),
  }));

router.post(
  '/',
  upload.fields([
    { name: 'noteFiles', maxCount: 10 },
    { name: 'orderFiles', maxCount: 10 },
  ]),
  async (req, res) => {
    try {
      const {
        caseId,
        hearingDate,
        hearingType,
        officerName,
        benchName,
        purpose,
        outcome,
        notes,
        nextHearingDate,
        reminderChannels,
        remindBeforeDays,
        createdBy,
      } = req.body;

      if (!caseId || !createdBy || !hearingDate) {
        return res.status(400).json({ error: 'caseId, createdBy and hearingDate are required' });
      }

      const existingCase = await Case.findById(caseId);
      if (!existingCase) {
        return res.status(404).json({ error: 'Case not found' });
      }

      const creator = await User.findById(createdBy);
      if (!creator) {
        return res.status(404).json({ error: 'Creator not found' });
      }

      const attachments = [
        ...mapAttachments(req.files.noteFiles, 'notes', creator._id),
        ...mapAttachments(req.files.orderFiles, 'order', creator._id),
      ];

      const hearing = new Hearing({
        caseId,
        caseTitle: existingCase.caseTitle,
        clientId: existingCase.clientId,
        clientSnapshot: existingCase.clientSnapshot,
        hearingDate: parseDate(hearingDate),
        hearingType,
        officerName,
        benchName,
        purpose,
        outcome,
        notes,
        nextHearingDate: parseDate(nextHearingDate),
        attachments,
        reminderChannels: parseJSON(reminderChannels, existingCase.reminderPreferences?.channels || ['email']),
        remindBeforeDays: Number(remindBeforeDays || existingCase.reminderPreferences?.daysBeforeHearing || 1),
        adminId: existingCase.adminId,
        createdBy: creator._id,
      });

      await hearing.save();

      existingCase.nextHearingDate = hearing.nextHearingDate || hearing.hearingDate;
      existingCase.timeline.push({
        entryType: 'hearing',
        title: `Hearing on ${new Date(hearing.hearingDate).toLocaleDateString()}`,
        description: purpose || `Hearing recorded by ${creator.name}`,
        date: hearing.hearingDate,
        createdBy: creator._id,
        linkedHearing: hearing._id,
        files: attachments,
      });

      await existingCase.save();

      return res.status(201).json({
        ...hearing.toObject(),
        id: hearing._id,
      });
    } catch (error) {
      console.error('Hearing creation error:', error);
      return res.status(400).json({ error: error.message });
    }
  }
);

router.get('/reports', async (req, res) => {
  try {
    const { role, userId, range = 'all' } = req.query;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const userAdminId = await getUserAdminId(userId);
    const caseFilter = buildRoleFilter(role, userId, userAdminId);
    const accessibleCaseIds = await Case.find(caseFilter).distinct('_id');

    if (accessibleCaseIds.length === 0) {
      return res.json({ records: [] });
    }

    const now = new Date();
    const hearingFilter = { caseId: { $in: accessibleCaseIds } };

    if (range === 'upcoming') {
      hearingFilter.hearingDate = { $gte: now };
    } else if (range === 'past') {
      hearingFilter.hearingDate = { $lt: now };
    }

    const hearings = await Hearing.find(hearingFilter)
      .sort({ hearingDate: range === 'past' ? -1 : 1 })
      .limit(150);

    return res.json({
      filters: { range },
      records: hearings.map((hearing) => ({
        hearingId: hearing._id,
        caseTitle: hearing.caseTitle,
        client: hearing.clientSnapshot?.name,
        hearingDate: hearing.hearingDate,
        officerName: hearing.officerName,
        outcome: hearing.outcome,
        nextHearingDate: hearing.nextHearingDate,
      })),
    });
  } catch (error) {
    console.error('Hearing report error:', error);
    return res.status(400).json({ error: error.message });
  }
});

router.get('/case/:caseId', async (req, res) => {
  try {
    const hearings = await Hearing.find({ caseId: req.params.caseId }).sort({ hearingDate: -1 });
    return res.json(
      hearings.map((hearing) => ({
        ...hearing.toObject(),
        id: hearing._id,
      }))
    );
  } catch (error) {
    console.error('Case hearings fetch error:', error);
    return res.status(400).json({ error: error.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const { role, userId, caseId, range = 'all' } = req.query;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const userAdminId = await getUserAdminId(userId);
    const caseFilter = buildRoleFilter(role, userId, userAdminId);

    if (caseId && mongoose.Types.ObjectId.isValid(caseId)) {
      caseFilter._id = caseId;
    }

    const accessibleCaseIds = await Case.find(caseFilter).distinct('_id');

    if (accessibleCaseIds.length === 0) {
      return res.json([]);
    }

    const now = new Date();
    const hearingFilter = { caseId: { $in: accessibleCaseIds } };

    if (range === 'upcoming') {
      hearingFilter.hearingDate = { $gte: now };
    } else if (range === 'past') {
      hearingFilter.hearingDate = { $lt: now };
    }

    const hearings = await Hearing.find(hearingFilter).sort({ hearingDate: range === 'past' ? -1 : 1 });

    return res.json(
      hearings.map((hearing) => ({
        ...hearing.toObject(),
        id: hearing._id,
      }))
    );
  } catch (error) {
    console.error('Hearing fetch error:', error);
    return res.status(400).json({ error: error.message });
  }
});

module.exports = router;

