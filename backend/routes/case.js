const express = require('express');
const multer = require('multer');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const Case = require('../schemas/Case');
const Hearing = require('../schemas/Hearing');
const Client = require('../schemas/Client');
const User = require('../schemas/User');
const { getUserAdminId } = require('../utils/accessControl');
const { getFinancialYearRange } = require('../utils/financialYear');
const notificationService = require('../services/notificationService');
const fsPromises = fs.promises;

const appendAndCondition = (filter, condition) => {
  if (!condition) {
    return { ...filter };
  }
  const updatedFilter = { ...filter };
  if (updatedFilter.$and) {
    updatedFilter.$and = [...updatedFilter.$and, condition];
  } else {
    updatedFilter.$and = [condition];
  }
  return updatedFilter;
};

const clampRange = (baseRange, fyRange) => {
  if (!fyRange) return baseRange;
  const startDate = baseRange.$gte ? new Date(Math.max(baseRange.$gte.getTime(), fyRange.startDate.getTime())) : fyRange.startDate;
  const endDate = baseRange.$lte ? new Date(Math.min(baseRange.$lte.getTime(), fyRange.endDate.getTime())) : fyRange.endDate;
  if (startDate > endDate) return null;
  return { $gte: startDate, $lte: endDate };
};

const router = express.Router();

const ensureDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

const caseUploadsDir = path.join(__dirname, '..', 'uploads', 'cases');
ensureDir(caseUploadsDir);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, caseUploadsDir),
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

const mapFilesToDocuments = (files = [], category = 'other', uploadedBy) =>
  files.map((file) => ({
    category,
    label: category.replace(/^\w/, (c) => c.toUpperCase()),
    filename: file.filename,
    originalName: file.originalname,
    url: `/uploads/cases/${file.filename}`,
    size: file.size,
    mimetype: file.mimetype,
    uploadedAt: new Date(),
    uploadedBy,
  }));

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

const normalizeTeamAssignments = (rawAssignments = []) => {
  if (!Array.isArray(rawAssignments)) return [];
  return rawAssignments
    .map((assignment) => {
      if (!assignment) return null;
      if (typeof assignment === 'string') {
        if (!mongoose.Types.ObjectId.isValid(assignment)) return null;
        return {
          userId: new mongoose.Types.ObjectId(assignment),
          role: 'support',
        };
      }
      if (assignment.userId && mongoose.Types.ObjectId.isValid(assignment.userId)) {
        return {
          userId: assignment.userId,
          role: assignment.role || 'support',
        };
      }
      return null;
    })
    .filter(Boolean);
};

const defaultReminderPreferences = {
  channels: ['email'],
  daysBeforeHearing: 1,
  daysBeforeDue: 3,
  daysBeforeReply: 2,
  notifyClient: true,
  notifyTeam: true,
};

const deleteFileByUrl = async (urlPath) => {
  if (!urlPath) {
    return;
  }

  const normalizedPath = urlPath.startsWith('/') ? urlPath.slice(1) : urlPath;
  const absolutePath = path.join(__dirname, '..', normalizedPath);

  try {
    await fsPromises.unlink(absolutePath);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.warn(`Failed to delete file at ${absolutePath}:`, error.message);
    }
  }
};

router.post(
  '/',
  upload.fields([
    { name: 'noticeFiles', maxCount: 10 },
    { name: 'replyFiles', maxCount: 10 },
    { name: 'evidenceFiles', maxCount: 10 },
    { name: 'orderFiles', maxCount: 10 },
    { name: 'otherFiles', maxCount: 10 },
  ]),
  async (req, res) => {
    try {
      const {
        caseTitle,
        clientId,
        caseType,
        caseCategory,
        caseNumber,
        authorityName,
        authorityType,
        officerName,
        officeAddress,
        departmentRequirement,
        startDate,
        dueDate,
        replyDueDate,
        nextHearingDate,
        caseStatus,
        internalNotes,
        tags,
        createdBy,
        assigneeId,
        managerId,
      } = req.body;

      if (!createdBy) {
        return res.status(400).json({ error: 'createdBy is required' });
      }

      if (!caseTitle || !clientId || !caseType) {
        return res.status(400).json({ error: 'Case title, client and case type are required' });
      }

      const creator = await User.findById(createdBy);
      if (!creator) {
        return res.status(404).json({ error: 'Creator not found' });
      }

      const client = await Client.findById(clientId);
      if (!client) {
        return res.status(404).json({ error: 'Client not found' });
      }

      const adminId =
        creator.role === 'admin' || creator.role === 'super_admin'
          ? creator._id
          : creator.adminId;

      const reminderPreferences = {
        ...defaultReminderPreferences,
        ...parseJSON(req.body.reminderPreferences, {}),
      };

      if (req.body.reminderChannels && !req.body.reminderPreferences) {
        reminderPreferences.channels = parseJSON(req.body.reminderChannels, ['email']);
      }

      const teamAssignments = normalizeTeamAssignments(parseJSON(req.body.teamAssignments, []));

      const documents = [
        ...mapFilesToDocuments(req.files.noticeFiles, 'notice', creator._id),
        ...mapFilesToDocuments(req.files.replyFiles, 'reply', creator._id),
        ...mapFilesToDocuments(req.files.evidenceFiles, 'evidence', creator._id),
        ...mapFilesToDocuments(req.files.orderFiles, 'order', creator._id),
        ...mapFilesToDocuments(req.files.otherFiles, 'other', creator._id),
      ];

      const timeline = [
        {
          entryType: 'case_created',
          title: 'Case Created',
          description: `Case recorded by ${creator.name}`,
          createdBy: creator._id,
          date: new Date(),
        },
      ];

      documents.forEach((doc) => {
        timeline.push({
          entryType: doc.category === 'notice' ? 'notice' : doc.category,
          title: `${doc.label} uploaded`,
          description: doc.originalName,
          createdBy: creator._id,
          date: doc.uploadedAt,
          files: [doc],
        });
      });

      const caseData = {
        caseTitle,
        clientId,
        clientSnapshot: {
          name: client.name,
          email: client.email,
          phone: client.phone,
        },
        caseType,
        caseCategory,
        caseNumber,
        authorityName,
        authorityType,
        officerName,
        officeAddress,
        departmentRequirement,
        startDate: parseDate(startDate),
        dueDate: parseDate(dueDate),
        replyDueDate: parseDate(replyDueDate),
        nextHearingDate: parseDate(nextHearingDate),
        status: caseStatus || 'pending',
        documents,
        internalNotes,
        tags:
          typeof tags === 'string'
            ? tags
                .split(',')
                .map((tag) => tag.trim())
                .filter(Boolean)
            : [],
        reminderPreferences,
        timeline,
        adminId,
        createdBy: creator._id,
        noticeAlertStatus: documents.some((doc) => doc.category === 'notice') ? 'pending' : 'none',
        submissionAlertStatus: 'pending',
      };

      if (teamAssignments.length) {
        caseData.teamAssignments = teamAssignments;
      }

      if (assigneeId && mongoose.Types.ObjectId.isValid(assigneeId)) {
        caseData.assigneeId = assigneeId;
      }

      const derivedManagerId =
        managerId ||
        client.managerId ||
        (creator.role === 'manager' ? creator._id : undefined);

      if (derivedManagerId && mongoose.Types.ObjectId.isValid(derivedManagerId)) {
        caseData.managerId = derivedManagerId;
      }

      const newCase = new Case(caseData);
      await newCase.save();
      await newCase.populate([
        { path: 'clientId', select: 'name email' },
        { path: 'assigneeId', select: 'name email role' },
        { path: 'teamAssignments.userId', select: 'name email role' },
      ]);

      return res.status(201).json({
        ...newCase.toObject(),
        id: newCase._id,
      });
    } catch (error) {
      console.error('Case creation error:', error);
      return res.status(400).json({ error: error.message });
    }
  }
);

router.get('/stats/overview', async (req, res) => {
  try {
    const { role, userId, fy } = req.query;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const userAdminId = await getUserAdminId(userId);
    const fyRange = getFinancialYearRange(fy);
    const baseRoleFilter = buildRoleFilter(role, userId, userAdminId);
    const caseFyCondition = fyRange
      ? {
          $or: [
            { startDate: { $gte: fyRange.startDate, $lte: fyRange.endDate } },
            { createdAt: { $gte: fyRange.startDate, $lte: fyRange.endDate } },
          ],
        }
      : null;
    const roleFilter = appendAndCondition(baseRoleFilter, caseFyCondition);
    const caseIds = await Case.find(roleFilter).distinct('_id');

    if (caseIds.length === 0) {
      return res.json({
        totals: { totalCases: 0, pendingCases: 0, submittedCases: 0, closedCases: 0 },
        todaysHearings: [],
        upcomingHearings: [],
        deadlines: [],
        replyDeadlines: [],
        noticeAlerts: [],
        submissionAlerts: [],
        clientCaseCounts: [],
      });
    }

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const sevenDaysAhead = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const [totals, todaysHearings, upcomingHearings, deadlines, replyDeadlines, noticeAlerts, submissionAlerts, clientDistribution] =
      await Promise.all([
        Promise.all([
          Case.countDocuments(roleFilter),
          Case.countDocuments({ ...roleFilter, status: 'pending' }),
          Case.countDocuments({ ...roleFilter, status: 'submitted' }),
          Case.countDocuments({ ...roleFilter, status: 'closed' }),
        ]),
        (function getTodaysHearings() {
          let range = { $gte: startOfDay, $lte: endOfDay };
          if (fyRange) {
            const clamped = clampRange(range, fyRange);
            if (!clamped) return [];
            range = clamped;
          }
          return Hearing.find({
            caseId: { $in: caseIds },
            hearingDate: range,
          })
            .limit(10)
            .sort({ hearingDate: 1 });
        })(),
        (function getUpcomingHearings() {
          let range = { $gt: endOfDay, $lte: sevenDaysAhead };
          if (fyRange) {
            const clamped = clampRange(range, fyRange);
            if (!clamped) return [];
            range = clamped;
          }
          return Hearing.find({
            caseId: { $in: caseIds },
            hearingDate: range,
          })
            .limit(10)
            .sort({ hearingDate: 1 });
        })(),
        (function getDeadlines() {
          let range = { $gte: now, $lte: sevenDaysAhead };
          if (fyRange) {
            const clamped = clampRange(range, fyRange);
            if (!clamped) return [];
            range = clamped;
          }
          return Case.find({
            ...roleFilter,
            dueDate: range,
          })
            .limit(10)
            .sort({ dueDate: 1 })
            .select('caseTitle dueDate replyDueDate clientSnapshot caseType authorityName');
        })(),
        (function getReplyDeadlines() {
          let range = { $gte: now, $lte: sevenDaysAhead };
          if (fyRange) {
            const clamped = clampRange(range, fyRange);
            if (!clamped) return [];
            range = clamped;
          }
          return Case.find({
            ...roleFilter,
            replyDueDate: range,
          })
            .limit(10)
            .sort({ replyDueDate: 1 })
            .select('caseTitle replyDueDate clientSnapshot caseType authorityName');
        })(),
        Case.find({
          ...roleFilter,
          noticeAlertStatus: { $in: ['pending', 'acknowledged'] },
        })
          .limit(10)
          .sort({ updatedAt: -1 })
          .select('caseTitle caseNumber authorityName clientSnapshot documents'),
        Case.find({
          ...roleFilter,
          submissionAlertStatus: { $in: ['pending', 'sent'] },
        })
          .limit(10)
          .sort({ dueDate: 1 })
          .select('caseTitle dueDate replyDueDate authorityName clientSnapshot status'),
        Case.aggregate([
          { $match: { _id: { $in: caseIds } } },
          {
            $group: {
              _id: '$clientSnapshot.name',
              total: { $sum: 1 },
            },
          },
          { $sort: { total: -1 } },
          { $limit: 8 },
        ]),
      ]);

    const [totalCases, pendingCases, submittedCases, closedCases] = totals;

    return res.json({
      totals: { totalCases, pendingCases, submittedCases, closedCases },
      todaysHearings,
      upcomingHearings,
      deadlines,
      replyDeadlines,
      noticeAlerts,
      submissionAlerts,
      clientCaseCounts: clientDistribution.map((item) => ({
        clientName: item._id,
        total: item.total,
      })),
    });
  } catch (error) {
    console.error('Case stats error:', error);
    return res.status(400).json({ error: error.message });
  }
});

router.get('/reports/cases', async (req, res) => {
  try {
    const { role, userId, clientId, status, authorityName, caseType } = req.query;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const userAdminId = await getUserAdminId(userId);
    const filter = buildRoleFilter(role, userId, userAdminId);

    if (clientId && mongoose.Types.ObjectId.isValid(clientId)) {
      filter.clientId = clientId;
    }
    if (status && status !== 'all') {
      filter.status = status;
    }
    if (authorityName) {
      filter.authorityName = authorityName;
    }
    if (caseType) {
      filter.caseType = caseType;
    }

    const cases = await Case.find(filter)
      .select('caseTitle caseType status startDate dueDate replyDueDate nextHearingDate clientSnapshot authorityName caseNumber')
      .sort({ updatedAt: -1 });

    return res.json({
      filters: { clientId, status, authorityName, caseType },
      records: cases.map((caseItem) => ({
        caseId: caseItem._id,
        caseTitle: caseItem.caseTitle,
        caseType: caseItem.caseType,
        caseNumber: caseItem.caseNumber,
        authorityName: caseItem.authorityName,
        status: caseItem.status,
        client: caseItem.clientSnapshot?.name,
        startDate: caseItem.startDate,
        dueDate: caseItem.dueDate,
        replyDueDate: caseItem.replyDueDate,
        nextHearingDate: caseItem.nextHearingDate,
      })),
    });
  } catch (error) {
    console.error('Case report error:', error);
    return res.status(400).json({ error: error.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const { role, userId, status, caseType, authorityName, clientId, search } = req.query;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const userAdminId = await getUserAdminId(userId);
    const filter = buildRoleFilter(role, userId, userAdminId);

    if (status && status !== 'all') {
      filter.status = status;
    }
    if (caseType && caseType !== 'all') {
      filter.caseType = caseType;
    }
    if (authorityName && authorityName !== 'all') {
      filter.authorityName = authorityName;
    }
    if (clientId && mongoose.Types.ObjectId.isValid(clientId)) {
      filter.clientId = clientId;
    }

    const andConditions = [];
    if (filter.$or) {
      andConditions.push({ $or: filter.$or });
      delete filter.$or;
    }
    if (search) {
      andConditions.push({
        $or: [
          { caseTitle: { $regex: search, $options: 'i' } },
          { caseNumber: { $regex: search, $options: 'i' } },
        ],
      });
    }
    if (andConditions.length) {
      filter.$and = andConditions;
    }

    const cases = await Case.find(filter)
      .populate('clientId', 'name email')
      .populate('assigneeId', 'name email role')
      .populate('teamAssignments.userId', 'name email role')
      .sort({ updatedAt: -1 });

    return res.json(
      cases.map((caseItem) => ({
        ...caseItem.toObject(),
        id: caseItem._id,
      }))
    );
  } catch (error) {
    console.error('Fetch cases error:', error);
    return res.status(400).json({ error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const caseItem = await Case.findById(req.params.id)
      .populate('clientId', 'name email phone managerId')
      .populate('assigneeId', 'name email role phone')
      .populate('teamAssignments.userId', 'name email role phone')
      .populate('timeline.createdBy', 'name email role');

    if (!caseItem) {
      return res.status(404).json({ error: 'Case not found' });
    }

    return res.json({
      ...caseItem.toObject(),
      id: caseItem._id,
    });
  } catch (error) {
    console.error('Case detail error:', error);
    return res.status(400).json({ error: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const updateData = { ...req.body };

    ['startDate', 'dueDate', 'replyDueDate', 'nextHearingDate'].forEach((dateField) => {
      if (dateField in updateData) {
        updateData[dateField] = parseDate(updateData[dateField]);
      }
    });

    if (updateData.reminderPreferences) {
      updateData.reminderPreferences = {
        ...defaultReminderPreferences,
        ...updateData.reminderPreferences,
      };
    }

    const updatedCase = await Case.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
    })
      .populate('clientId', 'name email')
      .populate('assigneeId', 'name email role')
      .populate('teamAssignments.userId', 'name email role')
      .populate('timeline.createdBy', 'name email role');

    if (!updatedCase) {
      return res.status(404).json({ error: 'Case not found' });
    }

    return res.json({
      ...updatedCase.toObject(),
      id: updatedCase._id,
    });
  } catch (error) {
    console.error('Case update error:', error);
    return res.status(400).json({ error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const caseItem = await Case.findById(req.params.id);
    if (!caseItem) {
      return res.status(404).json({ error: 'Case not found' });
    }

    const fileUrls = new Set();

    (caseItem.documents || []).forEach((doc) => {
      if (doc?.url) {
        fileUrls.add(doc.url);
      }
    });

    (caseItem.timeline || []).forEach((entry) => {
      (entry.files || []).forEach((file) => {
        if (file?.url) {
          fileUrls.add(file.url);
        }
      });
    });

    const hearings = await Hearing.find({ caseId: caseItem._id }).select('attachments');
    hearings.forEach((hearing) => {
      (hearing.attachments || []).forEach((attachment) => {
        if (attachment?.url) {
          fileUrls.add(attachment.url);
        }
      });
    });

    await Promise.all(Array.from(fileUrls).map((url) => deleteFileByUrl(url)));
    await Hearing.deleteMany({ caseId: caseItem._id });
    await caseItem.deleteOne();

    return res.json({ message: 'Case deleted' });
  } catch (error) {
    console.error('Case delete error:', error);
    return res.status(400).json({ error: error.message });
  }
});

router.post(
  '/:id/documents',
  upload.array('files', 10),
  async (req, res) => {
    try {
      const caseItem = await Case.findById(req.params.id);
      if (!caseItem) {
        return res.status(404).json({ error: 'Case not found' });
      }

      const { category = 'other', uploadedBy } = req.body;
      const uploader = uploadedBy && mongoose.Types.ObjectId.isValid(uploadedBy) ? uploadedBy : undefined;

      const newDocs = mapFilesToDocuments(req.files, category, uploader);
      caseItem.documents.push(...newDocs);

      newDocs.forEach((doc) => {
        caseItem.timeline.push({
          entryType: doc.category === 'notice' ? 'notice' : doc.category,
          title: `${doc.label} uploaded`,
          description: doc.originalName,
          createdBy: uploader,
          date: doc.uploadedAt,
          files: [doc],
        });
      });

      if (category === 'notice') {
        caseItem.noticeAlertStatus = 'pending';
      }

      await caseItem.save();

      return res.json({
        ...caseItem.toObject(),
        id: caseItem._id,
      });
    } catch (error) {
      console.error('Case document upload error:', error);
      return res.status(400).json({ error: error.message });
    }
  }
);

router.post('/:id/reminders/manual', async (req, res) => {
  try {
    const caseItem = await Case.findById(req.params.id).populate('assigneeId', 'name email phone');
    if (!caseItem) {
      return res.status(404).json({ error: 'Case not found' });
    }

    const { subject, html, smsText } = req.body;
    const contacts = {
      email: caseItem.clientSnapshot?.email || caseItem.assigneeId?.email,
      sms: caseItem.clientSnapshot?.phone || caseItem.assigneeId?.phone,
    };

    const preferredChannels = (caseItem.reminderPreferences?.channels || ['email']).filter((channel) => channel !== 'whatsapp');
    const channels = preferredChannels.length ? preferredChannels : ['email'];

    const results = await notificationService.dispatchReminder({
      channels,
      contacts,
      subject: subject || `Reminder for ${caseItem.caseTitle}`,
      html:
        html ||
        `<p>This is a reminder for case <strong>${caseItem.caseTitle}</strong>.</p>
         <p>Status: ${caseItem.status}</p>`,
      smsText: smsText || `Reminder: ${caseItem.caseTitle} (${caseItem.status})`,
    });

    caseItem.reminderLogs.push({
      type: 'manual',
      channel: results.map((result) => result.channel).join(', '),
      sentAt: new Date(),
      status: 'manual',
      message: 'Manual reminder triggered from portal',
    });

    await caseItem.save();

    return res.json({ success: true, results });
  } catch (error) {
    console.error('Manual reminder error:', error);
    return res.status(400).json({ error: error.message });
  }
});

module.exports = router;

