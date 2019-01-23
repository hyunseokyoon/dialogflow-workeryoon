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

    return new Promise((resolve, reject) => {
        request.get('https://api.nasa.gov/planetary/apod?api_key=DEMO_KEY', {json: true}, (err, res, body) => {
            if (err) {
                console.log(err);
                reject(err);
                return;
            }

            console.log(body.url);
            console.log(body.explanation);
            resolve(body);
        });
    }).then(body => {
        conv.ask(new SimpleResponse({
            speech: body.url,
            text: body.explanation,
        }));
    }).catch(err => {
        conv.close();
    });
};
app.intent('fallback', fallback);

app.fallback((conv) => {
    console.error('No matching intent handler found: ' + conv.intent);
    return fallback(conv);
});
server.post('/webhook', app);

server.listen(server.get('port'), function () {
    console.log('Express server started on port', server.get('port'));
});