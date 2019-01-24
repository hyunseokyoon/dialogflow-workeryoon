const express = require('express');
const bodyParser = require('body-parser');
const request = require('request');
const {dialogflow, SimpleResponse} = require('actions-on-google');

const getConfig = () => {
  let config;
  try {
    config = require('./config/dev.json');
  } catch (error) {
    console.log(`Using default config, ${error}`);
    config = require('./config/default.json');
  }

  return config;
};

const server = express();
const app = dialogflow();

server.set('port', process.env.PORT || 5000);
server.use(bodyParser.json({type: 'application/json'}));

const config = getConfig();

var TogglClient = require('toggl-api')
    , toggl = new TogglClient({apiToken: config.togglApiToken})

toggl.getCurrentTimeEntry((err, entry) => {
  console.log(entry);
  toggl.stopTimeEntry(entry.id, (err, entry) => {
    console.log(entry);
  });
});

fallback = conv => {
  conv.ask(new SimpleResponse({
    speech: '무엇을 할까요?',
    text: '무엇을 할까요?',
  }));
}

trackstart = (conv, params) => {

  console.log(conv);
  console.log(params);
  return new Promise((resolve, reject) => {

    toggl.startTimeEntry({
      description: params['entry']
    }, function (err, entry) {
      if (err) {
        console.log(err);
        reject(err);
        return;
      }
      resolve(entry);
    });
  }).then(entry => {
    conv.ask(new SimpleResponse({
      speech: entry.description + '를 기록중입니다.',
      text: entry.description,
    }));
  }).catch(err => {
    conv.close();
  });;
};

app.intent('track-start', trackstart);
app.intent('fallback', fallback);

app.fallback((conv) => {
  console.error('No matching intent handler found: ' + conv.intent);
  return fallback(conv);
});
server.post('/webhook', app);

server.listen(server.get('port'), function () {
  console.log('Express server started on port', server.get('port'));
});