import { Router } from "express"

import { activityRouter } from "./activity"
import { authRouter } from "./auth"
import { bountiesRouter } from "./bounties"
import { chainRouter } from "./chain"
import { credentialsRouter } from "./credentials"
import { curriculaRouter } from "./curricula"
import { enrollmentsRouter } from "./enrollments"
import { healthRouter } from "./health"
import { leaderboardRouter } from "./leaderboard"
import { payoutsRouter } from "./payouts"
import { proofsRouter } from "./proofs"
import { quizRouter } from "./quiz"
import { recruitRouter } from "./recruit"
import { recruiterMessagesRouter } from "./recruiter-messages"
import { tutorRouter } from "./tutor"

export const apiRouter: Router = Router()

apiRouter.use("/health", healthRouter)
apiRouter.use("/auth", authRouter)
apiRouter.use("/bounties", bountiesRouter)
apiRouter.use("/curricula", curriculaRouter)
apiRouter.use("/enrollments", enrollmentsRouter)
apiRouter.use("/tutor", tutorRouter)
apiRouter.use("/quiz", quizRouter)
apiRouter.use("/payouts", payoutsRouter)
apiRouter.use("/proofs", proofsRouter)
apiRouter.use("/chain", chainRouter)
apiRouter.use("/activity", activityRouter)
apiRouter.use("/recruit", recruitRouter)
apiRouter.use("/recruiter-messages", recruiterMessagesRouter)
apiRouter.use("/credentials", credentialsRouter)
apiRouter.use("/leaderboard", leaderboardRouter)
