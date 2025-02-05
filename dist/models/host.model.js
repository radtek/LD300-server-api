'use strict';

/**
 * Created by chen on 17-8-23.
 */
//import mongoose from 'mongoose';
var mongoose = require('mongoose');

var HostSchema = new mongoose.Schema({

    id: {
        type: String,
        unique: true,
        isRequired: true,
        index: { unique: true }
    },

    hostName: {
        type: String,
        isRequired: true,
        unique: true,
        index: { unique: true }
    },
    alias: {
        type: String
    },
    port: { //串口连接串，window和linux下好像不相同
        type: String,
        isRequired: true
    },
    status: { //主机状态，0=正常；1=主机预警；2=未启用；3=主机故障
        type: Number,
        default: 2
    },
    ppId: {
        type: String
    }
});

module.exports = mongoose.model('Host', HostSchema);
//# sourceMappingURL=host.model.js.map