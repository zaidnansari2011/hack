import { Router } from "express"

import { activityRouter } from "./activity"
import { authRouter } from "./auth"
import { bountiesRouter } from "./bounties"
import { chainRouter } from "./chain"
import { curriculaRouter } from "./curricula"
import { enrollmentsRouter } from "./enrollments"
import { healthRouter } from "./health"
import { payoutsRouter } from "./payouts"
import { proofsRouter } from "./proofs"
import { quizRouter } from "./quiz"
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
