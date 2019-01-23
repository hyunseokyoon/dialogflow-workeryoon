const {
    dialogflow,
} = require('actions-on-google');

const {
    SimpleResponse,
} = require('actions-on-google');

const request = require('request');

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

const config = getConfig();
const app = dialogflow({
    debug: true,
    clientId: config.clientId,
    init: () => ({
        data: {
            fallbackCount: 0,
            noInputCount: 0,
            noInputResponses: [],
            fallbackResponses: [],
            currentItems: [],
            nextItems: [],
            sessionType: null,
            sessionShown: null,
            sessionsTag: null,
            tagId: null,
        },
    }),
});


// fallback = ((conv) => {
//     console.error('No matching intent handler found: ' + conv.intent);
//     request.get('https://api.nasa.gov/planetary/apod?api_key=DEMO_KEY', {json: true}, (err, res, body) => {
//         if (err) { return console.log(err); }
//         console.log(body.url);
//         console.log(body.explanation);
//         conv.ask(new SimpleResponse({
//             speech: body.url,
//             text: body.explanation,
//         }));
//     });
//     // conv.ask(new SimpleResponse({
//     //     speech: `다시 한 번 말씀해 주시겠어요?`,
//     //     text: `다시 한 번 말씀해 주시겠어요?`,
//     // }));
// });

fallback = ((conv) => {

    conv.ask(new SimpleResponse({
        speech: '심플',
        text: '심플',
    }));
    conv.followup('custom_event', {}, 'en-US');
});

app.intent('fallback', fallback);
app.intent('event_test', conv => {
   conv.ask(new SimpleResponse({
       speech: '이벤트테스트',
       text: '이벤트테스트',
   }))

});

app.fallback((conv) => {
    console.error('No matching intent handler found: ' + conv.intent);
    return fallback(conv);
});

exports.app = app;