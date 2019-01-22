const {
    dialogflow,
} = require('actions-on-google');

const {
    SimpleResponse,
} = require('actions-on-google');

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


fallback = ((conv) => {
    console.error('No matching intent handler found: ' + conv.intent);
    conv.ask(new SimpleResponse({
        speech: `다시 한 번 말씀해 주시겠어요?`,
        text: `다시 한 번 말씀해 주시겠어요?`,
    }));
});

app.intent('fallback', fallback);

app.fallback((conv) => {
    console.error('No matching intent handler found: ' + conv.intent);
    fallback(conv);
});

exports.app = app;