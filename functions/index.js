const functions = require('firebase-functions');
const {app} = require('./app');

exports.bot = functions.https.onRequest(app);