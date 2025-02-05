/**
 * Created by Luky on 2017/8/17.
 */

//import HostService from '../services/hostService';
//import MonitoringService from '../services/monitoringService';
//import PresetService from '../services/PresetService';
//import CameraService from '../services/cameraService';

const HostService =require('../services/hostService');
const MonitoringService =require('../services/monitoringService');
//const PresetService =require('../services/PresetService');
const CamerasService =require('../services/camerasService');
const VendorService = require('../services/vendorService');
const EventService = require('../services/eventService');
const EventVideoService = require('../services/eventVideoService');
const moment = require('moment');

const _=require('lodash');
const config=global.server_config||require('../config/config');
const fileServer=require('./data_server_file');
const {Parser}=require('../log/log');
let logger={};
Parser(logger,'data_server.js');

const setBrands={
    '大华':'dahua','dahua':'dahua',
    '和普威尔':'hopewell','hopewell':'hopewell',
    '海康威视':'hikvision','hikvision':'hikvision',
    '国营508集成海康威视':'508','508':'508',
    'onvif协议':'onvif','onvif':'onvif'
};
//数据格式[{id,port},{...},...]
async function getHosts()
{
    //查询出所有的主机信息
    return await HostService.findAll();
}

//数据格式[{id,demo,alarm,screenshot,audio,min,max,presets:[{x,y,z,distance},{...},...]},{...},...]
//id,demo,alarm,screenshot,audio,min,max从MonitoringAreaSchema筛选后通过transformIPC转换
//presets为PresetSchema数据
//查询结果为监控distance位置摄像头的配置信息
async function getMointors(hostID,distance){
    //MonitoringAreaSchema条件 hostid==host && min<=distance&&distance<=max
    let monitorArea = {};
    const cams = await CamerasService.findAll({id:1});
    const monitors = await MonitoringService.find_monitoringArea({hostId:hostID,min_dis:{$lte:distance},max_dis:{$gte:distance}});//获得监控区域
    // let monitorList = [];
    // monitors.forEach(function (monitor) {
    //     monitorList.push(monitor._doc);
    // });
    monitorArea.id = hostID;
    monitorArea.monitors = [];

    monitors.forEach(function (monitor) {
        //const camera = await CamerasService.find_one(monitor.cameraId);//获得关联摄像头
        //const presets = await PresetService.find_preset({monitorId:monitor.id});
        let camera = {};
        if(cams && cams.length > 0){
            cams.forEach(function(item,index,arr){
                if(monitor.cameraId ===item.id){
                    camera = item;
                }
            });
        }
        let m = {id:camera.id,demo:camera.ptz,alarm:camera.alarm,audio:camera.audio,screenShot:camera.screenShot,min:monitor.min_dis,max:monitor.max_dis,presets:camera.preset};
        //m.presets = presets;
        //monitorArea.monitors = m;
        monitorArea.monitors.push(m);
    });
    return monitorArea.monitors;
}

function transformIPC(ipc) {

    return {
        id:ipc.id,
        ip:ipc.ip,
        port:ipc.port,
        user:ipc.user,
        pwd:ipc.pwd,
        brand:setBrands[ipc.brand],
        ptz:{
            port:ipc.serial_port
        },
        functions:{
            ptz:ipc.ptz,
            alarm:ipc.alarm,
            audio:ipc.audio
        },
        onvif:{
            user:ipc.onvif_user,
            pwd:ipc.onvif_pwd,
            port:ipc.onvif_port,
            path:ipc.onvif_path
        }
    };
}

//数据格式transformIPC
async function getIPC(id){
    let ipc= await CamerasService.find_one(id);//实现
    if(!ipc) await Promise.reject();
    let vendor = await VendorService.find_one(ipc.brand);
    if(vendor) {
        ipc.brand = vendor.vendorCode;
        logger.log('摄像头厂商',vendor.vendorCode);
        console.log('摄像头厂商'+vendor.vendorCode);
    }
    return transformIPC(ipc);
}

async function getAllIPC(){
    let ipcs= await CamerasService.findAll({id:1});
    let ipcList=[];
    ipcs.forEach(function (ipc) {
        ipcList.push(ipc._doc);
    });
    return ipcList;
}

/*
//数据格式[1,2,3,4,5]
async function getIPCIDsSortByPoint(){
    //查询出所有摄像头的编号返回即可，根据摄像头的编号排序基本没问题
    let ipcs= await CamerasService.findAll({id:1});
    let ipcIds=[];
    ipcs.forEach(function (ipc) {
        ipcIds.push(ipc._doc.id);
    });
    return ipcIds;
}
*/

//记录警报
async function  recordAlert(record) {
    //属性id，hid(主机id),position(报警位置)
    //*******将报警事件添加到数据库*******//
    let event = {};
    event.id = record.id;
    event.happenTime = moment().format('YYYY年MM月DD日 HH:mm:ss');
    event.position = record.position;
    event.hid = record.hid;

    await EventService.add_event(event);
    //********************************//

}

//用于事件调用摄像头记录下的路线
async function recordAlertVideo(record) {
    //属性id(同recordalert中的id，为事件编号)，path,pid(摄像头id),hid(主机id)
    //*******将录制视频的摄像头以及录像地址存入数据库*******//
    let eventVideo = {};
    eventVideo.eventId = record.id;
    eventVideo.pid=record.pid;
    eventVideo.path = data.path;

    await EventVideoService.add_eventVideo(event);
}

async function eventRecord(){
    let alert = await recordAlert();
}


const exp={
    getHosts,
    getMointors,
    getIPC,
    getAllIPC,
    //getIPCIDsSortByPoint,
    transformIPC,
    recordAlert,
    recordAlertVideo
};

function proxy(name) {
    let store=_.get(config,'runMode.store','db');
    logger.log('调用数据服务',{store,name});
    let fun=(store==='db'?exp:fileServer)[name];
    return fun.apply(null,Array.prototype.slice.call(arguments,1));
}

exports=module.exports={
    getMointors:_.partial(proxy,'getMointors'),
    getHosts:_.partial(proxy,'getHosts'),
    getIPC:_.partial(proxy,'getIPC'),
    getAllIPC:_.partial(proxy,'getAllIPC'),
    //getIPCIDsSortByPoint:_.partial(proxy,'getIPCIDsSortByPoint'),
    transformIPC:_.partial(proxy,'transformIPC'),
    recordAlert:_.partial(proxy,'recordAlert'),
    recordAlertVideo:_.partial(proxy,'recordAlertVideo'),
};
