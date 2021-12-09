const {app, BrowserWindow, ipcMain} = require('electron')
const fs = require('fs')
const ws = require('ws')
const hook = require('iohook')
const express = require('express')
const iohook = require('iohook')
const web = express()
var started = false
var paused = false
var players = []
const notes = require(`./web/notes.json`)
var connections = []
web.get('/', function (req, res) {
    res.sendFile(`${__dirname}/web/web.html`)
})
web.use(express.static(__dirname + '/web'))
web.listen(80)
var wss = new ws.Server({port: 81})
function ranNote(){
    var ran1 = Math.floor(Math.random() * 6)
    var ran2 = Math.floor(Math.random() * (notes.treble.lineorders[ran1].length))//
    var notes2 = `${ran1}//${ran2}`.split('//')
    return [notes.treble.lineorders[parseInt(notes2[0])][parseInt(notes2[1])], notes.bass.lineorders[parseInt(notes2[0])][parseInt(notes2[1])]]
}
app.on('ready', ()=>{
    const main = new BrowserWindow({
        height: 700,
        width: 500,
        alwaysOnTop: false,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        },
        icon: "icon.png",
        title: "FSharp"
    })
    main.loadFile(`${__dirname}/newer.html`)
    iohook.on('keydown', key=>{
        if(key.rawcode == 53){
            main.setFullScreen(false)
        }
    })
    wss.on('connection', function connection(wsm) {
        connections[connections.length] = wsm
        wsm.on('message', function(msg) {
            msg = msg.toString()
            var msgf = msg.toString().split(', ')
            if(typeof msgf == 'object'){
                if(msgf[0] == "newplayer"){
                    players[players.length] = msgf[1]
                    main.webContents.executeJavaScript(`addplayer("${msgf[1]}", "${msgf[2]}")`)
                }else if(msgf[0] == "instrument"){
                    main.webContents.executeJavaScript(`instrumentchange("${msgf[1]}", "${msgf[2]}")`)
                }else if(msgf[0] == "questionanswer"){
                    main.webContents.send('questionanswer', [msgf[1], msgf[2]])
                }
            }
        })
    })
    ipcMain.on('removechannel', (event, msg)=>{
        msg = msg.toString().split(', ')
        connections.forEach(connection=>{
            connection.send(`remove, ${msg[1]}`)
        })
    })
    ipcMain.on('startchannel', (event, msg)=>{
        main.setFullScreen(true)
        started = true
        connections.forEach(connection=>{
            connection.send(`start`)
        })
        main.loadFile(`${__dirname}/gameinterface.html`)
        main.webContents.on('did-stop-loading', ()=>{
            main.webContents.send('asynchronous-ping', players)
        })
    })
    ipcMain.on('sendstatuses', (evet, msg)=>{
        msg = msg.toString().split(', ')
        connections.forEach(connection=>{
            connection.send(`status`)
        })
    })
    ipcMain.on('sendbuttons', (event,msg)=>{
        var send
        function done(to){
            send = to
            connections.forEach(connection=>{
                connection.send(send)
            })
        }
        genButtons(done)
    })
})
hook.start()