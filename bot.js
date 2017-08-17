const Twit = require('twit');
const fetch = require('node-fetch');
const config = require('./config.js');

const Twitter = new Twit(config.twitter);
const NYPLkey = config.nypl.key;
const placesKey = config.places.key;

/*~*~*~*~*~*~*~*~*~*~*~*~*~*~*~*~*~*/

const googleMapsClient = require('@google/maps').createClient({
  key: placesKey,
  Promise: Promise
});

const badAddressData = {};

// change this function to accept entire record, not just search string
function generateGeocode(record) {
  let searchString = record.title;
  return googleMapsClient.geocode({address: searchString}).asPromise()
  .then((response) => {
    // instead of just returning geocode, add it to the record object
    record.geocode = response.json.results[0].geometry.location;
    return record;
  })
  .catch((err) => {
    // error is consistently "Cannot read property 'geometry' of undefined"
    // for now, just use this to generate a list of places to search by hand
    console.error('Error: ' + err);
    badAddressData[record.uuid] = record.title;
    // search for a new record, etc., with another call to generateTweetData
    // OR Tweet anyway, and follow up by asking for hand-coded coordinates?
    console.log('trying again I guess??????');
    generateTweetData();
  });
}

// might not have to use this directly? instead, just use toBase64 function to fetch image?
function getStreetview(lat, lng) {
  return fetch(`http://maps.googleapis.com/maps/api/streetview?size=800x400&location=${lat},${lng}&heading=235&key=${placesKey}`)
  .then(function(response) {
    console.log('got response from Streetview API');
    if (response.status !== 200) {
      console.log('Error with status code: ', response.status);
      return;
    }
    return response.json();
    // note: the response from a fetch() request is a Stream object
    // calling .json() on our response object will return a Promise
    })
  .then(function(data) {
    console.log('data from streetview:', data);
  })
  .catch(function(err) {
    console.error('Error getting data: ', err);
  });
}

// getStreetview(40.7424303, -73.9926005);

/*~*~*~*~*~*~*~*~*~*~*~*~*~*~*~*~*~*/

function getInitialData() {
  return fetch('http://api.repo.nypl.org/api/v1/items/search?q=b13668355&per_page=362', {
    headers: {
      Authorization: NYPLkey
    }})
  .then(function(response) {
    console.log('got response from initial API call');
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
    return records;
  })
  .catch(function(err) {
    console.error('Error getting data: ', err);
  });
}

function getRandomRecord() {
  return getInitialData()
  .then(records => {
    // this selects a random record, based on the total number of records (records.length)
    let index = Math.floor(Math.random() * records.length);
    return records[index];
  });
}

function checkLocation(record) {
  let ID = record.uuid;
  // first, look up by ID in badAddressData set
  if (badAddressData[ID]) {
    console.log('Trying again...');
    generateTweetData();
  } else {
    return generateGeocode(record);
  }
}

function processRecord(record) {
  let recordURL = record.itemLink;
  let imageURL = `https://images.nypl.org/index.php?id=${record.imageID}&t=w`;
  let text = record.title;
  let location = record.geocode;
  // let streetview = ??
  let tweetData = {recordURL, imageURL, text, location};
  console.log('omfg made it:', tweetData);
  return tweetData;
}

function generateTweetData() {
  return getRandomRecord()
  .then(record => checkLocation(record))
  // .then(record => processRecord(record))
  // .catch(err => console.log('Error generating Tweet data:', err));
}

// synopsis of what has happened so far:
// get all available records from NYPL API and pick random record
// after picking random index, first check coordinates, then proceed with tweets

/*~*~*~*~*~*~*~*~*~*~*~*~*~*~*~*~*~*/

// upload the image to the media/upload endpoint, THEN post it to statuses/update
// this requires getting the base64-encoded file content from the web image

function toBase64(url) {
  return fetch(url)
  .then(function(response) {
    console.log('got response from fetching image URL');
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
  // actually combine these two parameters into one record?
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
          console.log('I just tweeted:', data.text);
        });
      }
    });
  });
}


// rename this: something like, postNYPLImageToTwitter? or just postImage?
// and refactor to just take one argument (record) which we'll then parse
// or rewrite as tweetNYPLImage
// and then call tweetStreetview separately, with multiple toBase64 calls?
function tweetImageAndDescription(imageURL, text) {
  // also need to pass in test description here?
  // MPM instead, return toBase64(url) to .then off of this thing and call it again
  console.log('made it inside of tweetImage');
  return toBase64(imageURL)
  .then(data => uploadAndPostMedia(data, text))
  .catch(err => console.error(err));
}


/*~*~*~*~*~*~*~*~*~*~*~*~*~*~*~*~*~*/

// send first tweet! for now, alternating between 'Testing, testing...' and 'Oh, hey world!'
Twitter.post('statuses/update', { status: 'Oh, hey world!' }, function(err, data, response) {
  console.log('Posting our first Tweet...!');
  if (err) console.error(err);
  console.log('I just tweeted: ', data.text);
});

function sendTwoTweets(content) {
  // save tweet data up here
  console.log('inside sendTwoTweets');
  let image = content.imageURL;
  let caption = content.title + ' ' + content.itemLink; // add an oldNYC hashtag here?
  // and then make a separate caption for streetview images / reply to older Tweet??
  // also, instead of just tweeting one streetview image, generate a set of 5-6???
  let streetview = content.streetviewURL;
  tweetImageAndDescription(image, caption)
  .then(tweetImageAndDescription(streetview, content.title));
}

generateTweetData()
.then(tweetData => {
  console.log('tweet data', tweetData);
  let imageURL = `https://images.nypl.org/index.php?id=${tweetData.imageID}&t=w`;
  let title = tweetData.title;
  let itemLink = tweetData.itemLink;
  let lat = tweetData.geocode.lat;
  let lng = tweetData.geocode.lng;
  let streetviewURL = `http://maps.googleapis.com/maps/api/streetview?size=800x400&location=${lat},${lng}&heading=235&key=${placesKey}`;
  let content = {imageURL, title, itemLink, streetviewURL};
  console.log('*********content:', content);
  sendTwoTweets(content);
});


// use this to loop through different "heading" values
function generateStreetviewURLs() { /* . . . . */ }

/*~*~*~*~*~*~*~*~*~*~*~*~*~*~*~*~*~*/

