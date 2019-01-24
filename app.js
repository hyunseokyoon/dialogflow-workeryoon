const express = require('express');
const bodyParser = require('body-parser');
const request = require('request');
const {dialogflow, SimpleResponse} = require('actions-on-google');
const moment = require('moment');

require('@google-cloud/debug-agent').start();

moment.locale('ko');

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
    conv.close(new SimpleResponse({
      speech: entry.description + ', 기록 시작합니다.',
      text: entry.description + ', 기록 시작합니다.',
    }));
  }).catch(err => {
    conv.close();
  });
};

trackstop = conv => {
    return new Promise((resolve, reject) => {
        toggl.getCurrentTimeEntry((err, entry) => {
            if (err) {
                console.log(err);
                reject(err);
                return;
            }
            toggl.stopTimeEntry(entry.id, (err, entry) => {
                if (err) {
                    console.log(err);
                    reject(err);
                    return;
                }
                resolve(entry)
            });
        });
    }).then(entry => {
        conv.close(new SimpleResponse({
            speech: entry.description + ', 중지했습니다.',
            text: entry.description + ', 중지했습니다.',
        }));
    }).catch(err => {
        conv.close();
    });
};

welcome = conv => {
    return new Promise((resolve, reject) => {
        toggl.getCurrentTimeEntry((err, entry) => {
            if (err) {
                console.log(err);
                reject(err);
                return;
            }
            resolve(entry);
        });
    }).then(entry => {
        console.log(entry);
        if (entry) {
            //const duration = moment.duration(new Date() - new Date(entry.timestamp)).humanize();

            conv.ask(new SimpleResponse({
                speech: entry.description + ', 기록중입니다.',
                text: entry.description + ', 기록중입니다.',
            }));
            // conv.ask(new SimpleResponse({
            //     speech: entry.description + ', '+ duration + '간 기록중입니다.',
            //     text: entry.description + ', '+ duration + '간 기록중입니다.',
            // }));
        } else {
            conv.ask(new SimpleResponse({
                speech: '넵',
                text: '넵',
            }));        }

    }).catch(err => {
        conv.close();
    });
};

app.intent('track-start', trackstart);
app.intent('track-stop', trackstop);
app.intent('welcome', welcome);
app.intent('fallback', fallback);

app.fallback((conv) => {
  console.error('No matching intent handler found: ' + conv.intent);

  return fallback(conv);
});
server.post('/webhook', app);

server.listen(server.get('port'), function () {
  console.log('Express server started on port', server.get('port'));
});