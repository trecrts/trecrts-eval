# TREC Real-Time Summarization Tools

Herein we detail the various tools to be used in the course of the TREC 2016 Real-Time Summarization track. 

The track coordinators envision the interaction model outlined in rts-arch/trecrtstwitter.pdf

TREC participants write clients that interact with a broker run by the coordinators. This broker manages
all communication with mobile assessors (i.e., humans with the mobile assessing application on their phone).
The assessments rendered by the participants are then made available to the clients through a pull request.

Details for the Broker API can be found here[https://github.com/aroegies/trecrts-tools/tree/master/trecrts-server].




## Broker Server

### Requirements
- Node.js v5.0.0+
- npm v3.3.6+
- MySQL Server v5.5+

### Installation
  - Standard Node.js install procedure, run `npm install` from trecrts-server
    + You will need to supply a push_auths.js in trecrts-server/routes which exports the relevant gcm server details from the Google Developer console
  - MySQL setup is relatively straightforward
    + Create a trec_rts database
    + Load the template from trecrts-server/rts.db.template into the DB
    + Add appropriate group identifiers to the groups table
    + Add any new topics to the topics table and creating the corresponding judgements table for the topic based upon the judgements_template table

### Running the Broker
  - Standard Express.js invocation, `npm start`
    + As usual, you may supply a PORT argument beforehand to change the connecting port (e.g., `PORT=10101 npm start`)

### Notes
- The broker comes supplied with a web app, located at hostname:port/index.html, that connects to the broker to simulate the mobile assessor interface in the web browser. This may be more convenient for testing clients than deploying to phones.
  + Web app assessments are functionally annonymous 

## Mobile Assessment App

### Requirements

Cordova v5.2+
Android device (currently, iOS soon)

## Installation
Standard Cordova installation procedure:
  - `cordova local build android` to build
  - `cordova run android` to install and deploy on a phone for testing
  - Shouldn't need to grab any plugins
    + PushPlugin[https://github.com/phonegap-build/PushPlugin] is bundled with the app

## Notes
- If you want to use the mobile app with your own server you will need to edit the index.js file to point to the appropriate GCM service and the broker API host/port.

## Participant Clients

trecrts-clients/ contains several simple client implementations to provide simple examples of how
a RTS system might work. These examples have been structured to facilitate plug-and-play and so
should not require many dependencies (e.g., complex machine learning packages).

A more meaningful example can be found in the Anserini[https://github.com/lintool/Anserini] project.
