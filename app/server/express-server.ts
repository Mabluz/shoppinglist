import { createRequestHandler } from '@remix-run/express'
import { express } from 'express'
import * as dotenv from 'dotenv'

dotenv.config()

const app = express()

// Serve static assets
app.use(express.static('public'))

// All other requests to Remix
app.all(
  '*',
  createRequestHandler({
    getLoadContext: (request) => {
      return { request }
    },
  })
)

const port = process.env.PORT || 3000
app.listen(port, () => {
  console.log(`🚀 Shopping List running at http://localhost:${port}`)
  console.log(`💡 Make sure PostgreSQL is running on localhost:5432`)
})
