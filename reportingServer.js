﻿/*! 
 * Copyright(c) 2014 Jan Blaha 
 *
 * Easy to install wrapper for Reporter and express.
 */

var path = require("path"),
    express = require('express'),
    _ = require("underscore"),
    winston = require("winston"),
    expressWinston = require("express-winston"),
    connect = require("connect"),
    http = require('http'),
    https = require('https'),
    join = require("path").join,
    fs = require("fs"),
    Q = require("q"),
    installer = require("./reporter.install.js"),
    commander = require("./reportingCommander.js");

function ReportingServer(config) {
    if (config == null)
        throw new Error("Configuration for ReportingServer must be specified as a parameter");

    this.config = config;
}

;

ReportingServer.prototype.start = function() {
    if (!commander(this.config)) {
        return;
    }

    this.config.port = this.config.port || process.env.PORT;

    if (this.config.useCluster) {
        var cluster = require('cluster');
        if (cluster.isMaster) {
            cluster.fork();

            cluster.on('disconnect', function(worker) {
                console.error('disconnect!');
                cluster.fork();
            });

            if (this.config.daemon) {
                require('daemon')();
            }
        } else {
            this._startServer();
        }
    } else {
        this._startServer();
    }
};

function domainClusterMiddleware(req, res, next) {
    var d = require('domain').create();
    d.on('error', function(er) {
        console.error('error!!', er.stack);

        try {
            // make sure we close down within 30 seconds
            var killtimer = setTimeout(function() {
                process.exit(1);
            }, 30000);
            // But don't keep the process open just for that!
            killtimer.unref();

            // stop taking new requests.
            server.close();

            // Let the master know we're dead.  This will trigger a
            // 'disconnect' in the cluster master, and then it will fork
            // a new worker.
            cluster.worker.disconnect();

            // try to send an error to the request that triggered the problem
            res.statusCode = 500;
            res.setHeader('content-type', 'text/plain');
            res.end('Oops, there was a problem!\n');
        } catch(er2) {
            // oh well, not much we can do at this point.
            console.error('Error sending 500!', er2.stack);
        }
    });

    d.add(req);
    d.add(res);

    d.run(function() {
        next();
    });
}

;

ReportingServer.prototype._startServer = function() {

    var app = module.exports = express();

    if (this.config.useCluster) {
        app.use(domainClusterMiddleware);
    }

    app.use(require("body-parser")());
    app.use(require("method-override")());
    app.use(require("connect-multiparty")());
    app.use(require("cookie-parser")(this.config.cookieSession.secret));
    app.use(require("express-session")(this.config.cookieSession));

/* LOGGING */
    var transportSettings = {
        timestamp: true,
        colorize: true,
        level: "debug"
    };

    if (!fs.existsSync("logs")) {
        fs.mkdir("logs");
    }

    var consoleTransport = new (winston.transports.Console)(transportSettings);
    var fileTransport = new (winston.transports.File)({ name: "main", filename: 'logs/reporter.log', maxsize: 10485760, json: false, level: "debug" });
    var errorFileTransport = new (winston.transports.File)({ name: "error", level: 'error', filename: 'logs/error.log', handleExceptions: true, json: false });

    winston.loggers.add('jsreport', {
        transports: [consoleTransport, fileTransport, errorFileTransport]
    });

    winston.loggers.add('jsreport.templates', {
        transports: [
            consoleTransport,
            fileTransport,
            new (winston.transports.File)({ name: "templates", filename: 'logs/templates.log', maxsize: 10485760, json: false }),
            errorFileTransport
        ]
    });


    //app.use(expressWinston.logger({
    //    transports: [consoleTransport, fileTransport, errorFileTransport]
    //}));

    var self = this;
    installer(app, this.config, function() {

        if (self.config.iisnode) {
            app.listen(self.config.port);
            return;
        }

        if (!fs.existsSync(self.config.certificate.key)) {
            self.config.certificate.key = path.join(__dirname, "certificates", "jsreport.net.key");
            self.config.certificate.cert = path.join(__dirname, "certificates", "jsreport.net.cert");
        }

        var credentials = {
            key: fs.readFileSync(self.config.certificate.key, 'utf8'),
            cert: fs.readFileSync(self.config.certificate.cert, 'utf8'),
            rejectUnauthorized: false
        };

        if (self.config.httpPort != null) {
            //initialzie http -> https redirect
            http.createServer(function(req, res) {
                res.writeHead(302, {
                    'Location': "https://" + req.headers.host + req.url
                });
                res.end();
            }).listen(self.config.httpPort);
        }
        
        var httpsServer = https.createServer(credentials, app);
        httpsServer.listen(self.config.port);
    });
};


module.exports = ReportingServer;