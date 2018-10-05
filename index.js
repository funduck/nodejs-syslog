'use strict';

const unix_dgram = require('unix-dgram');
const dgram = require('dgram');

let socket;
let socketUsers = 0;
let releaseTimeout;

const socketErrorHandler = () => {
    if (socket !== undefined) {
        socket.close();
        socket = undefined;
        socketUsers = 0;
    }
};

const getSocket = (type) => {
    if (undefined === socket) {
        if (type =='udp4') {
            socket = dgram.createSocket(type);
        }
        if (type =='unix_dgram') {
            socket = unix_dgram.createSocket(type);
        }
        if (undefined === socket) {
            throw new Error('Unknown socket type: ' + type);
        }

        socket.on('error', socketErrorHandler);
    }

    socketUsers++;
    return socket;
};

const releaseSocket = () => {
    socketUsers--;
    if (0 == socketUsers && undefined === releaseTimeout) {
        releaseTimeout = setTimeout(() => {
            if (0 == socketUsers && socket !== undefined) {
                socket.close();
                socket = undefined;
            }

            releaseTimeout = undefined;
        }, 1000);
    }
};

module.exports = {
    Facility: {
        kern: 0,
        user: 1,
        mail: 2,
        daemon: 3,
        auth: 4,
        syslog: 5,
        lpr: 6,
        news: 7,
        uucp: 8,
        local0: 16,
        local1: 17,
        local2: 18,
        local3: 19,
        local4: 20,
        local5: 21,
        local6: 22,
        local7: 23
    },

    Priority: {
        emerg: 0,
        alert: 1,
        crit: 2,
        err: 3,
        warn: 4,
        notice: 5,
        info: 6,
        debug: 7
    },

    path: null,

    address: '127.0.0.1',

    port: 514,

    encoding: 'utf8',

    maxChunkSize: 2000,

    chunkSpaceSize: 200,

    /**
        Set host & port and set to null path to use UDP
        @param {string} h
    */
    setHost: function (h) {
        this.address = h;
    },

    /**
        Set host & port and set to null path to use UDP
        @param {number} p
    */
    setPort: function (p) {
        this.port = p;
    },

    /**
        Set path to not null to use unix socket
        @param {string} p
    */
    setPath: function (p) {
        this.path = p;
    },

    /**
        Write message to syslog, by default UDP to 127.0.0.1:514
        @param {string} message
        @param {string} facility
        @param {string} priority
        @throws {Error}
    */
    write: function (message, facility, priority) {
        if (this.path) {
            const preambleBuffer = new Buffer(`<${facility * 8 + priority}> `);

            message = Buffer.isBuffer(message) ? message : new Buffer(message);

            const chunkSize = this.maxChunkSize - preambleBuffer.length - this.chunkSpaceSize;

            const numChunks = Math.ceil(message.length / chunkSize);

            const fragments = [preambleBuffer];
            if (numChunks > 1) {
                for (let i = 0; i < numChunks; i++) {
                    fragments.push(
                        message.slice(i * chunkSize, Math.min(message.length, (i + 1) * chunkSize)),
                        new Buffer(` [${i + 1}/${numChunks}]`, this.encoding)
                    );
                }
            } else {
                fragments.push(message);
            }

            const chunk = Buffer.concat(fragments);

            try {
                getSocket('unix_dgram').send(
                    chunk,
                    0,
                    chunk.length,
                    this.path,
                    () => {
                        releaseSocket();
                    }
                );
            } catch (e) {
                console.error('node-syslog.js unix_dgram', e);
            }
        } else {
            const chunk = new Buffer(`<${facility * 8 + priority}> ${message}`);

            try {
                getSocket('udp4').send(
                    chunk,
                    0,
                    chunk.length,
                    this.port,
                    this.address,
                    () => {
                        releaseSocket();
                    }
                );
            } catch(e) {
                console.error('node-syslog.js udp4', e);
            }
        }
    }
};

if (process.argv[1] == module.filename) {
    /* For test module can be executed: node index.js /dev/log "test message" "facility" "priority" */
    module.exports.path = process.argv[2] || '/dev/log';
    module.exports.write(process.argv[3], process.argv[4] || 'user', process.argv[5] || 'warn');
    
    if (process.argv[6] == '--debug') {
        console.log('wrote to unix socket:', module.exports.path, '\n',
            'falility:', process.argv[4] || 'user', '\n',
            'priority:', process.argv[5] || 'warn', '\n',
            'message:', process.argv[3]
        )
    }
}
