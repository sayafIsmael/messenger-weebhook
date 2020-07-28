'use strict';
const { VERIFY_TOKEN, FACEBOOK_ACCESS_TOKEN } = require('./env')
const express = require('express');
const request = require('request');

const bodyParser = require('body-parser');
const cors = require('cors');

// Imports dependencies and set up http server
const app = express();

app.use(bodyParser.json())
app.use(cors()) // creates express http server

// Sets server port and logs message on success
app.listen(process.env.PORT || 1337, () => console.log('webhook is listening'));

// Creates the endpoint for our webhook 
app.post('/webhook', (req, res) => {

    let body = req.body;

    // Checks this is an event from a page subscription
    if (body.object === 'page') {

        // Iterates over each entry - there may be multiple if batched
        body.entry.forEach(function (entry) {

            // Gets the message. entry.messaging is an array, but 
            // will only ever contain one message, so we get index 0
            let webhook_event = entry.messaging[0];
            if (webhook_event.message && webhook_event.message.text) {
                let sender = webhook_event.sender.id
                console.log("Event: ", webhook_event);
                console.log("Message: ", webhook_event.message.text);
                sendText(sender, "Hey there", true)
            }
        });

        // Returns a '200 OK' response to all requests
        res.status(200).send('EVENT_RECEIVED');
    } else {
        // Returns a '404 Not Found' if event is not from a page subscription
        res.sendStatus(404);
    }

});

function sendText(sender, text,  typing = null,) {
    let messageData = { text }
    let json
    if (text) {
        json = {
            recipient: { id: sender },
            message: messageData
        }
    } else {
        json = {
            recipient: { id: sender },
            sender_action: "typing_on",
        }
    }
    if (typing) {
        request({
            url: `https://graph.facebook.com/v7.0/me/messages`,
            qs: { access_token: FACEBOOK_ACCESS_TOKEN },
            method: "POST",
            json
        }, function (error, response, body) {
            if (error) {
                console.log("sending error")
            } else if (response.body.error) {
                console.log("response body error", response.body.error)
            }
        })
    }
}

// Adds support for GET requests to our webhook
app.get('/webhook', (req, res) => {

    // Parse the query params
    let mode = req.query['hub.mode'];
    let token = req.query['hub.verify_token'];
    let challenge = req.query['hub.challenge'];

    // Checks if a token and mode is in the query string of the request
    if (mode && token) {

        // Checks the mode and token sent is correct
        if (mode === 'subscribe' && token === VERIFY_TOKEN) {

            // Responds with the challenge token from the request
            console.log('WEBHOOK_VERIFIED');
            res.status(200).send(challenge);

        } else {
            // Responds with '403 Forbidden' if verify tokens do not match
            res.sendStatus(403);
        }
    }
});

