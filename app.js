const express = require('express')
const cors = require('cors')
const app = express()
const axios = require('axios')
const bodyParser = require('body-parser')
require('dotenv').config()

app.use(bodyParser.urlencoded())
app.use(bodyParser.json())
app.use(cors())

// Intuit client id and secret
const client_id = process.env.CLIENT_ID
const client_secret = process.env.CLIENT_SECRET
const redirect_uri = 'http://localhost:8080'

// ROUTES
// - Route for getting authentication endpoint
app.get('/get-intuit-client-id', (req, res) => {
  res.send({ client_id })
})

// - Route for setting tokens, requires authorization code (generated after authentication to the auth endpoint)
app.post('/set-intuit-tokens', async (req, res) => {
  const code = req.body.code
  console.log('authorization code', code)
  !code && res.status(400).send({ error: 'Missing authorization code' })
  try {
    const tokens = await getTokens(code)
    // save tokens to db here
    res.send({ tokens })
  } catch (error) {
    res.status(500).send({ error })
  }
})
// END ROUTES

// Function for getting tokens from Intuit
const getTokens = async (code) => {
  const url = 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer'
  const body = `grant_type=authorization_code&code=${code}&redirect_uri=${redirect_uri}&client_id=${client_id}&client_secret=${client_secret}`
  const { data } = await axios.post(url, body, { 
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  })
  return data
}

// Start the server
app.listen(3000, () => console.log('Server started on port 3000'))