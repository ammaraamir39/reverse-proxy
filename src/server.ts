import cluster, { Worker } from "cluster"
import { ConfigSchemaType, rootConfigSchema } from "./config-schema"
import http from "node:http"
import {
  workerMessageSchema,
  WorkerMessageType,
  WorkerMessageReplyType,
  workerMessageReplySchema
} from "./server-schema"

interface CreateServerOptions {
  workerCounts: number
  port: number
  config: ConfigSchemaType
}

export async function CreateServer(config: CreateServerOptions) {
  const { workerCounts, port } = config
  const WORKER_POOL: Worker[] = []
  if (cluster.isPrimary) {
    console.log("Master Process is UP")
    for (let i = 0; i < workerCounts; i++) {
      const w = cluster.fork({
        config: JSON.stringify(config.config)
      }) //Spawns a new worker process
      WORKER_POOL.push(w)
      console.log("Master Process: Worker Node Spinned Up:", i)
    }
    const server = http.createServer((req, res) => {
      const index = Math.floor(Math.random() * WORKER_POOL.length)

      // const workersArray = Object.values(cluster.workers)
      const worker: Worker = WORKER_POOL.at(index) as Worker
      if (!worker) throw new Error("Worker not found")

      const payload: WorkerMessageType = {
        requestType: "HTTP",
        headers: req.headers,
        body: {},
        url: req.url as string
      }
      worker.send(JSON.stringify(payload))

      worker.on("message", async (workerReply: string) => {
        const reply = await workerMessageReplySchema.parseAsync(
          JSON.parse(workerReply)
        )
        if (reply.errorCode) {
          res.writeHead(parseInt(reply.errorCode))
          res.end(reply.error)
          return
        } else {
          res.writeHead(200)
          res.end(reply.data)
          return
        }
      })
    })

    server.listen(port, () => {
      console.log("Reverse Proxy listening on PORT ", port)
    })
  } else {
    //The params sent in the cluster.fork will be fetched here in process.env
    const config = await rootConfigSchema.parseAsync(
      JSON.parse(`${process.env.config}`)
    )

    process.on("message", async (message: string) => {
      console.log("Worker Node: Message=>", message)
      const messageValidated = await workerMessageSchema.parseAsync(
        JSON.parse(message)
      )
      const requestUrl = messageValidated.url
      const rule = config.server.rules.find((e) => {
        const regex = new RegExp(`^${e.path}.*$`)
        return regex.test(requestUrl)
      })

      if (!rule) {
        const reply: WorkerMessageReplyType = {
          error: "No rule found",
          errorCode: "404"
        }
        if (process.send) return process.send(JSON.stringify(reply))
      }
      const upstreamID = rule?.upstreams[0]
      const upstream = config.server.upstreams.find((e) => e.id === upstreamID)
      if (!upstream) {
        const reply: WorkerMessageReplyType = {
          error: "No upstream found",
          errorCode: "500"
        }
        if (process.send) return process.send(JSON.stringify(reply))
      }

      const request = http.request(
        { host: upstream?.url, path: requestUrl },
        (res) => {
          let body = ""
          res.on("data", (chunk) => {
            body += chunk
          })
          res.on("end", () => {
            const reply: WorkerMessageReplyType = {
              data: body
            }
            if (process.send) return process.send(JSON.stringify(reply))
          })
        }
      )
      request.end()
    })
  }
}
