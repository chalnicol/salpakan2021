

var socket;

window.onload = function () {

    var config = {
        type: Phaser.AUTO,
        scale: {
            mode: Phaser.Scale.FIT,
            parent: 'game_div',
            autoCenter: Phaser.Scale.CENTER_BOTH,
            width: 1920,
            height: 1080
        },
        audio: {
            disableWebAudio: false
        },
        backgroundColor: '#ffffff',
        scene: [ Preloader, Intro, SceneA ]
    };

    new Phaser.Game(config);

     //connect to socket

    let myUsername = 'Guest' + Math.floor (Math.random() * 9999);

    socket = io();

    socket.emit ('initUser', { 'username' : myUsername });


} 
