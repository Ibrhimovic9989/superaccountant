import 'server-only'
import { getLearningCurve } from './aggregate'
import { renderLearningCurveBuffer } from './pdf-template'
import {
  type LearningCurveReport,
  createLearningCurveReport,
  curveVerifyHash,
  ensureLearningCurveBucket,
  findRecentReportForUser,
  uploadLearningCurvePdf,
} from './store'

/**
 * End-to-end: aggregate → render PDF → upload → persist row.
 *
 * Idempotent: if a report was generated for this user within the last
 * 24h, we return the existing one rather than re-rendering. Admins
 * forcing a fresh report can pass `force: true`.
 */

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000

export async function generateLearningCurveReport(args: {
  userId: string
  generatedByUserId: string
  appBaseUrl: string
  force?: boolean
}): Promise<{
  report: LearningCurveReport
  /** True if this call reused an existing report instead of regenerating. */
  reused: boolean
}> {
  if (!args.force) {
    const recent = await findRecentReportForUser(args.userId, TWENTY_FOUR_HOURS_MS)
    if (recent) return { report: recent, reused: true }
  }

  const curve = await getLearningCurve(args.userId)
  if (!curve) {
    throw new Error(`No learning curve data for user ${args.userId}`)
  }

  await ensureLearningCurveBucket()

  const generatedAt = new Date()
  const verifyHash = curveVerifyHash(args.userId, generatedAt)
  const verifyUrl = `${args.appBaseUrl.replace(/\/$/, '')}/verify-curve/${verifyHash}`

  const pdf = await renderLearningCurveBuffer({
    curve,
    verifyUrl,
    generatedAt: generatedAt.toISOString(),
  })

  // reportId is generated inside createLearningCurveReport, but the
  // upload path needs an id up front. We pre-compute a temp id, upload
  // under it, then re-key inside createLearningCurveReport using the
  // returned id. Simpler: upload under verifyHash since it's unique +
  // stable.
  const pdfUrl = await uploadLearningCurvePdf(args.userId, verifyHash, pdf)

  const report = await createLearningCurveReport({
    userId: args.userId,
    pdfUrl,
    verifyHash,
    generatedByUserId: args.generatedByUserId,
  })

  return { report, reused: false }
}
