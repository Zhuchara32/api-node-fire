const express = require('express')
const admin = require('firebase-admin')
const cors = require('cors')
require("dotenv").config()

const router = express.Router()
const app = express()
const port = 3080

const corsOptions ={
    // origin: 'http://localhost:8080',
    origin: 'https://zhuchara32.github.io/crm-shop',
    methods: ['GET','POST','DELETE','UPDATE','PUT','PATCH'],
    credentials:true,            //access-control-allow-credentials:true
    optionSuccessStatus:200
}
app.use(cors(corsOptions))

admin.initializeApp({
  credential: admin.credential.cert({
    "project_id": process.env.FIREBASE_PROJECT_ID,
    "private_key": process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    "client_email": process.env.FIREBASE_CLIENT_EMAIL
  }),
  databaseURL: 'https://crm-shop-46faa-default-rtdb.europe-west1.firebasedatabase.app'
})

app.get('/api/users', async (req, res) => {
  try {
    const users = await admin.auth().listUsers()
    const prod = []

    for (let i = 0; i < users.users.length; i++) {
      const uid = users.users[i].uid

      const data = (await admin.database().ref(`/users/${uid}`).once('value')).val()
  
      if (data.products) {
        const keys = Object.keys(data.products)
        const values = Object.values(data.products)

        for (let i = 0; i < keys.length; i++) {
          values[i].uidUser = uid
          values[i].uidProd = keys[i]
          values[i].nameSeller = data.info.name
          prod.push(values[i])
        }
      }
    }
    res.status(200).json({ message: 'Success', prod }).end()
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Internal Server Error' }).end()
  }
})

app.post('/api/sale', async (req, res) => {
  let body = ''
  for await (const chunk of req) {
    body += chunk
  }
  const arrData = JSON.parse(body)

  arrData.forEach(async (item) => {
    try { // добавляем товар в покупки
      const nameProd = item.nameProd
      const price = item.price
      const quantity = item.quantity
      const downloadURL = item.downloadURL
      const description = item.description
      const uidProd = item.uidProd
      const phone = item.phone
      const nameBuyer = item.nameBuyer
      const address = item.address
      const isDelivered = item.isDelivered

      await admin.database().ref(`users/${item.uidUser}/sales`).push({
        nameProd, price, quantity, downloadURL, description, uidProd, phone, nameBuyer, address, isDelivered
      })
      res.status(200).json({ message: 'Done' }).end()
    } catch (e) {
      console.error(err)
      res.status(500).json({ message: 'Internal Server Error' }).end()
    }

    try { // сохраняем количество товара, после покупки
      const count = item.count - item.quantity
      await admin.database().ref(`users/${item.uidUser}/products/${item.uidProd}/`).update({
        count
      })
      res.status(200).end()
    } catch (e) {
      console.error(err)
      res.status(500).json({ message: 'Internal Server Error' }).end()
    }
  })
})

app.listen(process.env.PORT || port, () => {
  console.log('start')
})
