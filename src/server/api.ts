import express from 'express';
import type { Request, Response } from 'express';
import type { Model } from 'mongoose';
import {
  connectToMongoDB,
  getDBStatus,
  TestAttemptModel,
  UserProfileModel,
  QuestionModel,
  CurrentAffairsModel,
  MockTestModel
} from './db.ts';

export const apiRouter = express.Router();

// Ensure MongoDB Atlas connection is initialized on API requests
apiRouter.use(async (_req, _res, next) => {
  await connectToMongoDB();
  next();
});

// --- Shared Route Helpers ---

const upsertById = async (
  model: Model<any>,
  payload: any,
  res: Response,
  responseKey: string,
  successMessage: string,
  missingMessage: string
) => {
  if (!payload?.id) {
    return res.status(400).json({ error: missingMessage });
  }

  if (!getDBStatus().isConnected) {
    return res.json({
      message: 'Saved locally (MongoDB Atlas disconnected)',
      synced: false,
      [responseKey]: payload
    });
  }

  const saved = await model.findOneAndUpdate(
    { id: payload.id },
    { $set: payload },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return res.json({ message: successMessage, synced: true, [responseKey]: saved });
};

const deleteById = async (model: Model<any>, id: string, res: Response, label: string) => {
  if (getDBStatus().isConnected) {
    await model.deleteOne({ id });
  }
  return res.json({ message: `Deleted ${label}`, id });
};

const bulkSeedModel = (model: Model<any>, items: any[]) =>
  model.bulkWrite(
    items.map(item => ({
      updateOne: {
        filter: { id: item.id },
        update: { $setOnInsert: item },
        upsert: true
      }
    })),
    { ordered: false }
  );

const sendServerError = (res: Response, error: unknown, extra?: Record<string, unknown>) => {
  const message = error instanceof Error ? error.message : 'Internal server error';
  return res.status(500).json({ error: message, ...extra });
};

// --- Live MongoDB Aggregations for Admin Analytics ---

const computeMongoAnalytics = async () => {
  const [
    studentProfilesCount,
    totalTestsAttempted,
    questionsCount,
    caCount,
    mockTestsCount,
    attemptAgg,
    topExamAgg,
    distinctAttemptStudents
  ] = await Promise.all([
    UserProfileModel.countDocuments({ role: 'student' }),
    TestAttemptModel.countDocuments(),
    QuestionModel.countDocuments(),
    CurrentAffairsModel.countDocuments(),
    MockTestModel.countDocuments(),
    TestAttemptModel.aggregate([
      {
        $group: {
          _id: null,
          avgAccuracy: { $avg: '$accuracyPercentage' },
          completedCount: { $sum: { $cond: [{ $gt: ['$attemptedQuestions', 0] }, 1, 0] } }
        }
      }
    ]),
    TestAttemptModel.aggregate([
      {
        $group: {
          _id: '$examCategory',
          avgAcc: { $avg: '$accuracyPercentage' },
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1, avgAcc: -1 } },
      { $limit: 1 }
    ]),
    TestAttemptModel.distinct('studentName')
  ]);

  const summary = attemptAgg[0] || { avgAccuracy: 0, completedCount: 0 };
  const uniqueNamesCount = Array.isArray(distinctAttemptStudents)
    ? distinctAttemptStudents.filter(Boolean).length
    : 0;

  return {
    totalStudents: Math.max(studentProfilesCount, uniqueNamesCount),
    totalTestsAttempted,
    averageScorePercentage: totalTestsAttempted > 0 ? Math.round(summary.avgAccuracy || 0) : 0,
    completionRatePercentage:
      totalTestsAttempted > 0
        ? Math.round(((summary.completedCount || 0) / totalTestsAttempted) * 100)
        : 0,
    topPerformingExam: topExamAgg[0]?._id || 'No Attempts Yet',
    totalQuestionsInBank: questionsCount,
    totalCurrentAffairsPosts: caCount,
    totalMockTests: mockTestsCount,
    source: 'mongodb-atlas' as const
  };
};

// --- Health & Status ---

apiRouter.get('/status', async (_req: Request, res: Response) => {
  const status = getDBStatus();
  let counts = { testAttempts: 0, questions: 0, currentAffairs: 0, mockTests: 0, userProfiles: 0 };

  if (status.isConnected) {
    try {
      const [testAttempts, questions, currentAffairs, mockTests, userProfiles] = await Promise.all([
        TestAttemptModel.countDocuments(),
        QuestionModel.countDocuments(),
        CurrentAffairsModel.countDocuments(),
        MockTestModel.countDocuments(),
        UserProfileModel.countDocuments()
      ]);
      counts = { testAttempts, questions, currentAffairs, mockTests, userProfiles };
    } catch {
      // Ignore count errors if connection drops mid-flight
    }
  }

  res.json({
    status: 'ok',
    database: status,
    counts,
    timestamp: new Date().toISOString()
  });
});

// --- Test Attempts ---

apiRouter.get('/test-attempts', async (_req: Request, res: Response) => {
  try {
    if (!getDBStatus().isConnected) {
      return res.json({ source: 'local-fallback', attempts: [] });
    }
    const attempts = await TestAttemptModel.find().sort({ createdAt: -1 }).limit(100).lean();
    return res.json({ source: 'mongodb-atlas', attempts });
  } catch (error) {
    return sendServerError(res, error, { source: 'error' });
  }
});

apiRouter.post('/test-attempts', async (req: Request, res: Response) => {
  try {
    return await upsertById(
      TestAttemptModel,
      req.body,
      res,
      'attempt',
      'Successfully persisted attempt to MongoDB Atlas',
      'Attempt data with unique ID is required'
    );
  } catch (error) {
    return sendServerError(res, error);
  }
});

// --- User Profile ---

apiRouter.get('/user-profile', async (req: Request, res: Response) => {
  try {
    if (!getDBStatus().isConnected) {
      return res.json({ source: 'local-fallback', profile: null });
    }
    const userId = (req.query.id as string) || 'student-2026-01';
    const profile = await UserProfileModel.findOne({ id: userId }).lean();
    return res.json({ source: 'mongodb-atlas', profile });
  } catch (error) {
    return sendServerError(res, error);
  }
});

apiRouter.post('/user-profile', async (req: Request, res: Response) => {
  try {
    return await upsertById(
      UserProfileModel,
      req.body,
      res,
      'profile',
      'Successfully saved user profile to MongoDB Atlas',
      'Profile data with ID is required'
    );
  } catch (error) {
    return sendServerError(res, error);
  }
});

// --- Questions Bank ---

apiRouter.get('/questions', async (_req: Request, res: Response) => {
  try {
    if (!getDBStatus().isConnected) {
      return res.json({ source: 'local-fallback', questions: [] });
    }
    const questions = await QuestionModel.find().sort({ createdAt: -1 }).limit(300).lean();
    res.setHeader('Cache-Control', 'public, max-age=30, stale-while-revalidate=60');
    return res.json({ source: 'mongodb-atlas', questions });
  } catch (error) {
    return sendServerError(res, error);
  }
});

apiRouter.post('/questions', async (req: Request, res: Response) => {
  try {
    return await upsertById(
      QuestionModel,
      req.body,
      res,
      'question',
      'Question saved to MongoDB Atlas',
      'Question data with ID is required'
    );
  } catch (error) {
    return sendServerError(res, error);
  }
});

apiRouter.delete('/questions/:id', async (req: Request, res: Response) => {
  try {
    return await deleteById(QuestionModel, req.params.id, res, 'question');
  } catch (error) {
    return sendServerError(res, error);
  }
});

// --- Current Affairs ---

apiRouter.get('/current-affairs', async (_req: Request, res: Response) => {
  try {
    if (!getDBStatus().isConnected) {
      return res.json({ source: 'local-fallback', currentAffairs: [] });
    }
    const currentAffairs = await CurrentAffairsModel.find().sort({ date: -1 }).limit(100).lean();
    res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=120');
    return res.json({ source: 'mongodb-atlas', currentAffairs });
  } catch (error) {
    return sendServerError(res, error);
  }
});

apiRouter.post('/current-affairs', async (req: Request, res: Response) => {
  try {
    return await upsertById(
      CurrentAffairsModel,
      req.body,
      res,
      'currentAffairs',
      'Current affairs saved to MongoDB Atlas',
      'Current Affairs data with ID is required'
    );
  } catch (error) {
    return sendServerError(res, error);
  }
});

apiRouter.delete('/current-affairs/:id', async (req: Request, res: Response) => {
  try {
    return await deleteById(CurrentAffairsModel, req.params.id, res, 'current affairs post');
  } catch (error) {
    return sendServerError(res, error);
  }
});

// --- Mock Tests ---

apiRouter.get('/mock-tests', async (_req: Request, res: Response) => {
  try {
    if (!getDBStatus().isConnected) {
      return res.json({ source: 'local-fallback', mockTests: [] });
    }
    const mockTests = await MockTestModel.find().sort({ createdAt: -1 }).limit(100).lean();
    res.setHeader('Cache-Control', 'public, max-age=30, stale-while-revalidate=60');
    return res.json({ source: 'mongodb-atlas', mockTests });
  } catch (error) {
    return sendServerError(res, error);
  }
});

apiRouter.post('/mock-tests', async (req: Request, res: Response) => {
  try {
    return await upsertById(
      MockTestModel,
      req.body,
      res,
      'mockTest',
      'Mock test saved to MongoDB Atlas',
      'Mock test data with ID is required'
    );
  } catch (error) {
    return sendServerError(res, error);
  }
});

apiRouter.delete('/mock-tests/:id', async (req: Request, res: Response) => {
  try {
    return await deleteById(MockTestModel, req.params.id, res, 'mock test');
  } catch (error) {
    return sendServerError(res, error);
  }
});

// --- Per-User Bookmarks Sync ---

apiRouter.get('/bookmarks', async (req: Request, res: Response) => {
  try {
    if (!getDBStatus().isConnected) {
      return res.json({ source: 'local-fallback', caBookmarks: [], questionBookmarks: [] });
    }
    const userId = (req.query.userId as string) || 'student-2026-01';
    const profile: any = await UserProfileModel.findOne({ id: userId }).lean();
    return res.json({
      source: 'mongodb-atlas',
      caBookmarks: Array.isArray(profile?.caBookmarks) ? profile.caBookmarks : [],
      questionBookmarks: Array.isArray(profile?.questionBookmarks) ? profile.questionBookmarks : []
    });
  } catch (error) {
    return sendServerError(res, error);
  }
});

apiRouter.post('/bookmarks', async (req: Request, res: Response) => {
  try {
    const { userId = 'student-2026-01', caBookmarks = [], questionBookmarks = [] } = req.body || {};
    if (!getDBStatus().isConnected) {
      return res.json({ synced: false, caBookmarks, questionBookmarks });
    }
    await UserProfileModel.findOneAndUpdate(
      { id: userId },
      { $set: { caBookmarks, questionBookmarks } },
      { upsert: false }
    );
    return res.json({ synced: true, caBookmarks, questionBookmarks });
  } catch (error) {
    return sendServerError(res, error);
  }
});

// --- Analytics & Full Startup Bootstrap ---

apiRouter.get('/analytics', async (_req: Request, res: Response) => {
  try {
    if (!getDBStatus().isConnected) {
      return res.json({ source: 'local-fallback', connected: false, analytics: null });
    }
    const analytics = await computeMongoAnalytics();
    res.setHeader('Cache-Control', 'public, max-age=10, stale-while-revalidate=20');
    return res.json({ source: 'mongodb-atlas', connected: true, analytics });
  } catch (error) {
    return sendServerError(res, error);
  }
});

apiRouter.get('/bootstrap', async (req: Request, res: Response) => {
  try {
    if (!getDBStatus().isConnected) {
      return res.json({ connected: false, source: 'local-fallback' });
    }

    const userId = (req.query.userId as string) || 'student-2026-01';
    const [questions, currentAffairs, mockTests, attempts, profile] = await Promise.all([
      QuestionModel.find().select('-__v').sort({ createdAt: -1 }).limit(300).lean(),
      CurrentAffairsModel.find().select('-__v').sort({ date: -1 }).limit(100).lean(),
      MockTestModel.find().select('-__v').sort({ createdAt: -1 }).limit(100).lean(),
      TestAttemptModel.find().select('-__v').sort({ createdAt: -1 }).limit(100).lean(),
      UserProfileModel.findOne({ id: userId }).select('-__v').lean()
    ]);

    const isEmptyCluster = questions.length === 0 && currentAffairs.length === 0 && mockTests.length === 0;
    const analytics = isEmptyCluster ? null : await computeMongoAnalytics();

    return res.json({
      connected: true,
      source: 'mongodb-atlas',
      isEmptyCluster,
      questions,
      currentAffairs,
      mockTests,
      attempts,
      profile,
      analytics
    });
  } catch (error) {
    return sendServerError(res, error);
  }
});

apiRouter.post('/sync-seed', async (req: Request, res: Response) => {
  try {
    if (!getDBStatus().isConnected) {
      return res.json({ synced: false });
    }

    const { questions = [], currentAffairs = [], mockTests = [], attempts = [], profile } = req.body || {};
    const ops: Promise<any>[] = [];

    if (Array.isArray(questions) && questions.length > 0) ops.push(bulkSeedModel(QuestionModel, questions));
    if (Array.isArray(currentAffairs) && currentAffairs.length > 0) ops.push(bulkSeedModel(CurrentAffairsModel, currentAffairs));
    if (Array.isArray(mockTests) && mockTests.length > 0) ops.push(bulkSeedModel(MockTestModel, mockTests));
    if (Array.isArray(attempts) && attempts.length > 0) ops.push(bulkSeedModel(TestAttemptModel, attempts));
    if (profile?.id) {
      ops.push(UserProfileModel.findOneAndUpdate({ id: profile.id }, { $setOnInsert: profile }, { upsert: true }));
    }

    await Promise.all(ops);
    const analytics = await computeMongoAnalytics();
    return res.json({ synced: true, analytics });
  } catch (error) {
    return sendServerError(res, error);
  }
});
