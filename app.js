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
        speech: '다시 말씀해 주시겠어요?',
        text: '다시 말씀해 주시겠어요?',
    }));
}

trackstart = (conv, params) => {

    return new Promise((resolve, reject) => {

        const name = params['entry'];

        const opts = {};
        if (entriesCache[name]) {
            opts.description = name;
            opts['pid'] = entriesCache[name].pid;
        } else if (projNameId[name]) {
            const pid = projNameId[name];
            opts['pid'] = pid;

            if (projectsCache[pid]) {
                opts.description = projectsCache[pid].description;
            } else {
                opts.description = name;
            }
        } else {
            opts.description = name;
        }

        toggl.startTimeEntry( opts , function (err, entry) {
            if (err) {
                console.log(err);
                reject(err);
                return;
            }
            resolve(entry);
        });
    }).then(entry => {
        if (projIdName[entry.pid]) {
            conv.close(entry.description + ', 기록 시작합니다. 분류는 ' + projIdName[entry.pid] + ' 입니다.');
        } else {
            conv.close(entry.description + ', 기록 시작합니다.');
        }

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
        const message = entry.description + ', ' + getEntryDuration(entry) + ' 소요 되었습니다.';
        conv.close(new SimpleResponse({
            speech: message,
            text: message,
        }));
    }).catch(err => {
        conv.close();
    });
};

getEntryDuration = entry => {
    var durationText = '';
    var totalSec = 0;
    if (entry.duration < 0) {
        totalSec = parseInt(Date.now() / 1000 + entry.duration);
    } else {
        totalSec = entry.duration;
    }
    var hours = 0;
    var minutes = 0;

    if (totalSec >= 3600) {
        hours = parseInt(totalSec / 3600);
    }
    if (totalSec % 3600 >= 60) {
        minutes = parseInt((totalSec % 3600) / 60);
    }
    const seconds = totalSec % 60;

    if (hours > 0) {
        durationText += '' + hours + '시간';
        if (minutes > 0) {
            durationText += ' ' + minutes + '분';
        }
    } else {
        if (minutes > 0) {
            durationText += ' ' + minutes + '분';
        }
        if (seconds > 0) {
            durationText += ' ' + seconds + '초';
        }
    }
    return durationText;
};

getTrackingEntryMessage = entry => {
    if (entry.duration < 0) {
        return entry.description + ', '+ getEntryDuration(entry) + '간 기록중입니다.';

    } else {
        return entry.description + ', 기록중입니다.';
    }
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
        var message = '';
        if (entry) {

            message = getTrackingEntryMessage(entry) + '기록을 중지할까요?';
            conv.ask(new SimpleResponse({
                speech: message,
                text: message
            }));

            conv.data.welcome_action = 'stop';
        } else {
            message = '새로운 기록을 시작할까요?';
            conv.ask(new SimpleResponse({
                speech: message,
                text: message
            }));
            conv.data.welcome_action = 'start';
        }

    }).catch(err => {
        conv.close();
    });
};

var projIdName = {};
var projNameId = {};
var entriesCache = {};
var projectsCache = {};

updateCache = () => {
    return new Promise((resolve, reject) => {

        projNameId = {};
        entriesCache = {};
        projectsCache = {};
        console.log("categoryupdate step 1");

        toggl.getWorkspaceProjects(config.togglWorkspaceId, (err, projects) => {
            if (err) {
                console.log(err);
                reject(err);
                return;
            }
            console.log("categoryupdate step 2");

            projects.forEach( proj => {
                projNameId[proj.name] = proj.id;
                projIdName[proj.id] = proj.name;
            });

            toggl.getTimeEntries((err, timeEntries) => {
                console.log("categoryupdate step 3");

                if (err) {
                    console.log(err);
                    reject(err);
                    return;
                }
                timeEntries.forEach( entry => {
                    entriesCache[entry.description] = entry;
                    projectsCache[entry.pid] = entry;
                });
                console.log("categoryupdate step 4");

                resolve(timeEntries.length);
            });
        });
    })
};

categoryupdate = conv => {
    return updateCache().then( length =>{
        var message = length + '개 항목으로부터 분류를 준비했습니다. 새로운 기록을 시작할까요?';
        conv.ask(new SimpleResponse({
            speech: message,
            text: message
        }));
    }).catch(err => {
        conv.close();
    });
};

askentryname = conv => {
    var message = '알겠습니다.';
    conv.ask(new SimpleResponse({
        speech: message,
        text: message
    }));
    conv.followup('custom_event_track_start', {}, 'ko-KR');
};

welcomeyes = conv => {
    if (conv.data.welcome_action == 'stop') {
        return trackstop(conv);
    } else {
        return askentryname(conv);
    }
};

welcomeno = conv => {
    conv.ask("기록 시작, 기록 중지, 분류 갱신 이 가능합니다. 준비가 되면 말씀해주세요.");
};

updateCache();

app.intent('track-category-update', categoryupdate);
app.intent('track-category-update-yes', askentryname);
app.intent('track-start', trackstart);
app.intent('track-stop', trackstop);
app.intent('welcome', welcome);
app.intent('welcome-yes', welcomeyes);
app.intent('welcome-no', welcomeno);
app.intent('fallback', fallback);

app.fallback((conv) => {
    console.error('No matching intent handler found: ' + conv.intent);

    return fallback(conv);
});
server.post('/webhook', app);

server.listen(server.get('port'), function () {
    console.log('Express server started on port', server.get('port'));
});