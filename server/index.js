import express from 'express'
import * as dotenv from 'dotenv'
import cors from 'cors'
import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

dotenv.config()

const fapp = initializeApp({
  credential: cert(process.env.ACCOUNT_PATH),
})
const auth = getAuth(fapp)

const app = express()

app.use(express.json())
app.use(cors({
  origin: 'http://localhost:3000',
  optionsSuccessStatus: 200,
  credentials: true, // allow the Access-Control-Allow-Credentials
}))

app.get('/', (req, res) => {
  const now = new Date()
  console.log(`[/] ${now}`)
  auth
    .listUsers(1000)
    .then(result => {
      console.log(result.users)
    })
    .catch(err => console.error(err))
  res.send('hello world!')
});

app.listen(3001, () => console.log('server is running...'))
