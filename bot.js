const Twit = require('twit');
const fetch = require('node-fetch');
const config = require('./config.js');

const Twitter = new Twit(config.twitter);
const NYPLkey = config.nypl.key;

// this will call the tweeter function [replace / write] every 24 hours
// (i.e. 1000 milliseconds * 60 seconds * 60 mins * 24 hrs)
// setInterval(tweeter, 1000*60*60*24);

// send first tweet! for now, I'm alternating between 'Testing, testing...' and 'Oh, hey world!'
Twitter.post('statuses/update', { status: 'Oh, hey world!' }, function(err, data, response) {
  console.log('in the first post function!');
  if (err) console.error(err);
  console.log(data);
});

// save NYPL API in separate file? and export data?

// use Fetch API to access NYPL API route
function getInitialData() {
  // eventually change URL parameters to get all items in single request
  // alternatively, could increment up to 'total pages' and interpolate string into next url
  fetch('http://api.repo.nypl.org/api/v1/items/search?q=b13668355&per_page=2', {
    headers: {
      Authorization: NYPLkey
    }})
  .then(function(response) {
    console.log('got response');
    if (response.status !== 200) {
      console.log('Error with status code: ', response.status);
      return;
    }
    return response.json();
    // note: the response from a fetch() request is a Stream object
    // calling .json() on our response object will return a Promise
      // because the stream will be read asynchronously
    })
  .then(function(data) {
    let records = data.nyplAPI.response.result;
    // result will be an array of records
    console.log(records[1]);
    // return records;
  })
  .catch(function(err) {
    console.error('Error getting data: ', err);
  });
}

getInitialData();

// function generateRandom() { /* . . . */ }

// function selectRecord() { /* . . . */ }

// function parseAddressInfo() { /* . . . */ }

// function generateStreetview() { /* . . . */ }

// send other tweets
// 'tweeted' is the success callback?
// function tweeter() {
//   var tweet = 'do some stuff here';
//   Twitter.post('statuses/update', { status: tweet }, tweeted);
// }
