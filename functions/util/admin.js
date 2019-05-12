const admin = require('firebase-admin')
admin.initializeApp()
require('firebase/firestore')
const db = admin.firestore()
module.exports={admin,db}