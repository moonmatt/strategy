# Introduction
express-flood is a package for who want to build APIs.
Often if we do many requests to a website we get the error 429, and this is a protection for avoid spammers, robots, and other bad stuff.

# How does it works?
You can specify as many protected URLs as you want, it is very flexible and allow you to have high sicurity.
It's based on IP address, and timestamps.

<br>

# Documentation
### How to install it
`npm i express-flood`

### How to use it
```
const express = require('express');
const expressFlood = require('express-flood')([
	{ path: '/test', max: 3, timeout: 60000, deny: 'Cannot do that!' },
	{ path: '/flood', max: 5, timeout: 10000, deny: 'Cannot do that (2)!' }
]);

app.use(...expressFlood);

const app = express();
app.listen(3000, _ => console.log('Server started'));
```
This sample will create a protection on path '/test', where a user can make up to 3 requests in 1 minutes; if someone try to go beyond, will se the message 'Cannot do that!'.
An also another protection on path '/flood'

### Options
##### path
_It is the path of url to protect, it could be also '/api/something/:test'_

##### max
_Max requests that a user can do within 'timeout' time_

##### timeout
_When the protection allow user to make a new cycle of requests (in milliseconds)_

##### deny
_Accepted types of this parameter: 'string', 'object', 'function'
If someone try to go beyond protection limits, he will se the message you passed if it a string or object, or if it is a function, it will be called with 2 arguments (request and response) for manging user request._

##### force
By default, it is set to true.

_Let's say a user is reloading the page continuously
If it is set to true:
	- The user can only make 'max' requests, after which the system will completely block the others until it stops making them for 'timeout' milliseconds
If it is set to false:
	- The user can make 'max' requests and after 'timeout' milliseconds the server will be able to accept others, ignoring those that are blocked (NOT RECOMMENDED)_