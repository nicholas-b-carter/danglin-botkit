const ngrok         = require('ngrok');
const open          = require('open');
const dotenv        = require('dotenv');

export default function() {
  //load environment variables,
  //either from .env files (development),
  //heroku environment in production, etc...
  dotenv.load();

  if (process.env.NODE_ENV !== 'production') {
    // kick off the ngrok tunnel if were not in prod and open the browser...
    open('http://localhost:4040');
    ngrok.connect(function (err, url) {});
  }
};
