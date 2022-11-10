import express from 'express'
import * as dotenv from 'dotenv'
import cors from 'cors'
import admin from 'firebase-admin'

dotenv.config()

admin.initializeApp({
  credential: admin.credential.cert(process.env.ACCOUNT_PATH),
  databaseURL: process.env.DATABASE_URL,
  databaseAuthVariableOverride: {
    uid: "my-service-worker"
  }
})

const auth = admin.auth()
const db = admin.database()

const app = express()

app.use(express.json())
app.use(cors({
  origin: 'http://localhost:3000',
  optionsSuccessStatus: 200,
  credentials: true, // allow the Access-Control-Allow-Credentials
}))

app.use('*', (req, res, next) => {
  const now = new Date()
  console.log(`[${req.baseUrl}] ${now}`)

  next()
})

app.use('*', async (req, res, next) => {
  const authHeader = req.get('Authorization')
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1]

    try {
      const decodedToken = await auth.verifyIdToken(token, true)
      console.log(decodedToken)
  
      return next()
    } catch(err) {
      const errorInfo = { err }
      if (errorInfo.code == 'auth/id-token-revoked') {
        return res.status(500).send('token is revoked')
      } else {
        return res.status(500).send('token is invalid')
      }
    }
  }

  return res.sendStatus(500)
})

app.get('/', (req, res) => {
  res.send('hello world!')
});

app.get('/users', (req, res) => {
  const ref = db.ref("/users")
  // const ref = db.ref('some_resource')
  ref.once("value", (snapshot) => {
    return res.send(snapshot.val())
  }, (errObj) => {
    console.error('The read failed', errObj.name)
    return res.send('something wrong')
  })
})

app.get('/user', (req, res) => {
  const { uid } = req.query
  const ref = db.ref('users/' + uid);
  ref.once("value", (snapshot) => {
    console.log(snapshot.val())
    return res.send(snapshot.val())
  }, (errObj) => {
    console.error('The read failed', errObj.name)
    return res.send('something wrong')
  })
})

app.post('/revokeToken', async (req, res) => {
  const { uid } = req.body
  // refresh token 취소
  await auth.revokeRefreshTokens(uid)
  const userRecord = await auth.getUser(uid)
  const timestamp = new Date(userRecord.tokensValidAfterTime).getTime() / 1000

  // 사용자별 메타데이터를 업데이트
  // Firebase 보안 규칙을 통해 ID토큰 취소를 추적하는데 필요하다.
  // 데이터베이스 내에서 효율적인 검사를 허용한다.
  const metadataRef = db.ref('metadata/' + uid);
  metadataRef.set({ revokeTime: timestamp }).then(() => {
    console.log('Database updated successfully.');
  });

  res.send('GOOD')
})

app.get('/requestSomething', (req, res) => {
  res.send('GOOD REQUEST!')
})

app.listen(3001, () => console.log('server is running...'))

export function checkAuthUser(email) {
  auth
    .getUserByEmail(email)
    .then(user => {
      console.log(user)
      console.log(user.customClaims)
    })
    .catch((error) => {
      console.log(error);
    });
}

export function updateCustomClaim (email) {
  auth
    .getUserByEmail(email)
    .then((user) => {
      const currentCustomClaims = user.customClaims ?? {}
      currentCustomClaims['vailysai'] = true;
      currentCustomClaims['readyai'] = false;
      auth.setCustomUserClaims(user.uid, currentCustomClaims);
    })
    .catch((error) => {
      console.log(error);
    });
}
