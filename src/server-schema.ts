import { z } from "zod"

export const workerMessageSchema = z.object({
  requestType: z.enum(["HTTP", "HTTPS"]),
  headers: z.any(),
  body: z.any(),
  url: z.string()
})

export type WorkerMessageType = z.infer<typeof workerMessageSchema>
