const Twit = require('twit');
const fetch = require('node-fetch');
const config = require('./config.js');

const Twitter = new Twit(config.twitter);
const NYPLkey = config.nypl.key;

// this will call the tweeter function [replace / write] every 24 hours
// (i.e. 1000 milliseconds * 60 seconds * 60 mins * 24 hrs)
// setInterval(tweeter, 1000*60*60*24);

// send first tweet! for now, alternating between 'Testing, testing...' and 'Oh, hey world!'
// Twitter.post('statuses/update', { status: 'Oh, hey world!' }, function(err, data, response) {
//   console.log('Posting our first Tweet...!');
//   if (err) console.error(err);
//   console.log('I just tweeted: ', data.text);
// });

function getInitialData() {
  // eventually change URL parameters to get all items in single request
  // also, IMPORTANT: probably going to want to return fetch instead of just calling it
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
    })
  .then(function(data) {
    let records = data.nyplAPI.response.result;
    // result will be an array of records
    // console.log(records);
    return records;
  })
  .catch(function(err) {
    console.error('Error getting data: ', err);
  });
}

// getInitialData();


// get the image URLs from getInitialData etc.
// but need to upload the image to the media/upload endpoint, THEN post it to statuses/update
// this requires getting the base64-encoded file content from the web image
// create a canvas, load your image into it and then use toDataURL() to get the base64 representation ??? oy vey
// alternatively, make an XMLHttpRequest (or fetch) and then process the response?
// okay but I bet FileReader is a browser API? we need an alternative for node??
// use built-in buffer function from node-fetch
// (not clear why blob isn't working... client-side functionality, but still, should work isomorphically in node-fetch??)


function toBase64(url) {
  return fetch(url)
  .then(function(response) {
    console.log('got response from fetching image');
    return response.buffer();
  })
  .then(function(buffer) {
    // console.log('buffer?', buffer);
    // the hardest buffer to buffer
    return Buffer.from(buffer).toString('base64');
  })
  .catch(err => console.error(err));
}


function uploadAndPostMedia(media, text) { // pass a second parameter here for altText??
  Twitter.post('media/upload', { media_data: media }, function (err, data, response) {
    if (err) console.error('Error processing upload: ', err);
    let mediaID = data.media_id_string;
    let altText = text; // MPM: pull alt text from image description
    let metadata = { media_id: mediaID, alt_text: { text: altText } };

    Twitter.post('media/metadata/create', metadata, function (err, data, response) {
      if (!err) {
        // now post a tweet with reference to the media (media will attach to the tweet)
        // might want to refactor this to make it easier to pass in status?
        var params = { status: text, media_ids: [mediaID] };

        Twitter.post('statuses/update', params, function (err, data, response) {
          if (err) console.error('Error posting status/update: ', err);
          console.log('I just tweeted: ', data.text);
        });
      }
    });
  });
}

let testDescription = 'Testing image upload with custom text.';

function postImageFromURL(url) {
  // MPM instead, return toBase64(url)
  toBase64(url)
  .then(data => uploadAndPostMedia(data, testDescription))
  .catch(err => console.error(err));
}

postImageFromURL('https://images.nypl.org/index.php?id=1219221&t=w');

// eventually, instead of this test image, hit the NYPL API
// select a random image from records array (by index)
// save image id and description as variables
// postImageFromUrl(`https://images.nypl.org/index.php?id={imageID}&t=w`)
// pass description (uh how) as status (in params object)


// some utility functions for the future

// function generateRandom() { /* . . . */ }

// function selectRecord() { /* . . . */ }

// function parseAddressInfo() { /* . . . */ }

// function generateStreetview() { /* . . . */ }

