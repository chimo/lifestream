lifestream
==================

Realtime lifestream via PuSH and WebSockets  
With a minimal bit of parsing logic, you can add any PuSH-enabled source to your lifestream

Status
-----------------

Pre-alpha, subject to change drastically, run at own risks ;)

Demo
-----------------

[https://chromic.org](https://chromic.org) (The "Realtime Updates" section)

Client source code here: [https://github.com/chimo/lifestream-client](https://github.com/chimo/lifestream-client)

Requirements
-----------------

* [Node.js](https://nodejs.org/)
* [MySQL](http://www.mysql.com/)

Installation
-----------------

Run `npm install`

Configration
-----------------

1. Create a MySQL database
2. Create the tables: `mysql -u username -p database_name < schema.sql`
3. Copy `config.dist.json` to `config.json` and fill-in the missing information

Launch
-----------------

Run `node ./main.js`

Problems?
-----------------

Feel free to [create an issue](https://github.com/chimo/lifestream/issues) or ping me on [GNU social](http://sn.chromic.org), [email](mailto:chimo@chromic.org) or [Twitter](http://twitter.com/chim0)

