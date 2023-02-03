const express = require('express')
const cors = require('cors')
const app = express()
const axios = require('axios')
const bodyParser = require('body-parser')
require('dotenv').config()

app.use(bodyParser.json())
app.use(cors())

// Intuit client id and secret
const client_id = process.env.CLIENT_ID
const client_secret = process.env.CLIENT_SECRET

// base64 encoded client_id:client_secret, used for Authentication header
const b64 = (str) => Buffer.from(str).toString('base64')
const Authorization = `Basic ${b64(client_id+":"+client_secret)}`

const db = {
  tokens: null,
  realmId: null,
}

// ROUTES
// - Route for getting authentication endpoint
app.get('/get-intuit-client-id', (req, res) => {
  res.send({ client_id })
})

// - Route for setting tokens, requires authorization code (generated after authentication to the auth endpoint)
app.post('/set-intuit-tokens', async (req, res) => {
  const code = req.body.code 
  console.log('authorization code:', code)
  const theState = req.body.state
  console.log('state:', theState)
  const realmId = req.body.realmId
  console.log('realmId:', realmId)
  db.realmId = realmId
  const redirect_uri = req.body.redirect_uri
  console.log('redirect_uri:', redirect_uri)

  if (!code || !redirect_uri) {
    res.status(400).send({ error: 'Missing authorization code' })
  }
  try {
    const tokens = await getTokens(code, redirect_uri)
    res.send({ tokens })
  } catch (error) {
    res.status(500).send({ error })
  }
})
// END ROUTES

// Function for getting tokens from Intuit
const getTokens = async (code, redirect_uri) => {
  const url = 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer'
  const body = `grant_type=authorization_code&code=${code}&redirect_uri=${redirect_uri}&client_id=${client_id}&client_secret=${client_secret}`
  const { data } = await axios.post(url, body, { 
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
    }
  })

  // save tokens to db (maybe also save realmId/state)
  db.tokens = data
  return data
}

// Function for refreshing tokens from Intuit
const refreshTokens = async () => {
  if (db.tokens?.refresh_token) {
    const refresh_token = db.tokens.refresh_token
    const url = 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer'
    const body = `grant_type=refresh_token&refresh_token=${refresh_token}`
    const { data } = await axios.post(url, body, { 
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization
      }
    })
    return data
  }
}

// Start the server
app.listen(3000, () => console.log('Server started on port 3000'))

// setInterval to imitate cron job
setInterval(async () => {
  console.log('checking for tokens:')
  console.log('db:', db);
  if (db.tokens?.refresh_token) {
    const refreshedTokens = await refreshTokens(db.tokens.refresh_token)
    db.tokens = refreshedTokens
    console.log('refresh_token:', refreshedTokens.refresh_token)
  }
}, 1000 * 60 * 60 * 24) // 24 hours

