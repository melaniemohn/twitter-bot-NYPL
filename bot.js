const Twit = require('twit');
const config = require('./config.js'); // or maybe just ./config ??

const Twitter = new Twit(config);

// this will call the tweeter function [replace / write] every 24 hours
// (i.e. 1000 milliseconds * 60 seconds * 60 mins * 24 hrs)
// setInterval(tweeter, 1000*60*60*24);

// send first tweet!
Twitter.post('statuses/update', { status: 'Oh, hey world!' }, function(err, data, response) {
  console.log('in the first post function!');
  if (err) console.error(err);
  console.log(data);
});

// send other tweets
// 'tweeted' is the success callback?
// function tweeter() {
//   var tweet = 'do some stuff here';
//   Twitter.post('statuses/update', { status: tweet }, tweeted);
// }
