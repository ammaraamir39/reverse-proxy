import cluster, { Worker } from "cluster"
import { ConfigSchemaType, rootConfigSchema } from "./config-schema"
import http from "node:http"
import { WorkerMessageType } from "./server-schema"

interface CreateServerOptions {
  workerCounts: number
  port: number
  config: ConfigSchemaType
}

export async function CreateServer(config: CreateServerOptions) {
  const { workerCounts, port } = config

  if (cluster.isPrimary) {
    console.log("Master Process is UP")
    for (let i = 0; i < workerCounts; i++) {
      cluster.fork({
        config: JSON.stringify(config.config)
      }) //Spawns a new worker process
      console.log("Master Process: Worker Node Spinned Up:", i)
    }
    const server = http.createServer((req, res) => {
      const index = Math.floor(Math.random() * workerCounts)
      if (cluster.workers) {
        const workersArray = Object.values(cluster.workers)
        const worker: Worker = workersArray[index] as Worker

        const payload: WorkerMessageType = {
          requestType: "HTTP",
          headers: req.headers,
          body: {},
          url: req.url as string
        }
        worker.send(JSON.stringify(payload))
      }
    })

    server.listen(port, () => {
      console.log("Reverse Proxy listening on PORT ", port)
    })
  } else {
    //The params sent in the cluster.fork will be fetched here in process.env
    const config = await rootConfigSchema.parseAsync(
      JSON.parse(`${process.env.config}`)
    )

    process.on("message", (message: any) =>
      console.log("Worker Node: Message=>", message)
    )
  }
}
