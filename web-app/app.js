/** @jsx React.DOM */

var React = require('react');
var ReactDOM = require('react-dom');
var Admin = require('./components/admin.react');
var $ = require('jquery');

$(function() {

  // Behavior stuff
  $('.user, .user .name').click(function(event) {
    event.stopPropagation();
    $('.dropdown').toggleClass('active');
    $('.notification, .chat').removeClass('active');
  });

  $('.notification, .chat').click(function(event) {
    event.stopPropagation();
    $(this).toggleClass('active');
    if ($(this).hasClass('notification')) {
      $('.chat, .dropdown').removeClass('active');
    } else {
      $('.notification, .dropdown').removeClass('active');
    }
  });

  $('.chat .slack input[type=text]').click(function(event) {
    event.stopPropagation();
  })

  $('.puzzle-round .header').click(function(event) {
    $(this).parent().toggleClass('closed');
  });

  $('body').click(function(event) {
    $('.dropdown, .notification, .chat').removeClass('active');
  });

  // React components
  if (document.getElementById('content')) {
    var initialState = JSON.parse(document.getElementById('initial-state').innerHTML);

    ReactDOM.render(
      <Admin hunt={initialState.hunt}
             activeTab={initialState.activeTab}
             folders={initialState.folders}
             rootFolder={initialState.rootFolder}
             userFirstName={initialState.userFirstName} />,
      document.getElementById('content')
    );
  }

  // Courtesy of Victor Hung
  var canvas = document.getElementById('poofytoo');

  if (canvas) {
    var context = canvas.getContext('2d');
    var elapsedTime = 0;
    var d = Date.now()

    window.addEventListener('resize', resizeCanvas, false);

    function resizeCanvas() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      
      drawBackground(); 
    }
    resizeCanvas();

    function drawDiamond(ox, oy, w, h, c) {
      w = w || 100;
      h = h || 200;
      context.beginPath();
      context.moveTo(ox, oy);
      context.lineTo(ox+w/2, oy+h/2);
      context.lineTo(ox, oy+h);
      context.lineTo(ox-w/2, oy+h/2);
      context.closePath();
      context.lineWidth = 0;
      context.fillStyle = c;
      context.fill();
    }

    function drawBackground() {

      var DIA_WIDTH = 100
      var DIA_HEIGHT = 190
      var rA = 254, rB = 210
      var gA = 255, gB = 220
      var bA = 255, bB = 205

      w = canvas.width;
      h = canvas.height;
      cx = Math.ceil(w/DIA_WIDTH)+1
      cy = Math.ceil(h/(DIA_HEIGHT/2))+1
      var rOffset = 0, gOffset = 0, bOffset = 0;

      for (j = 0; j < cy; ++j) {
        for (i = 0; i < cx; ++i) {
          rOffset = Math.round(((rB - rA) / cx) * i) + Math.floor(Math.sin(elapsedTime-i*0.8)*20)
          gOffset = Math.round(((gB - gA) / cy) * j) 
          bOffset = Math.round(((bB - bA) / cx) * j)
          drawDiamond(
            i*DIA_WIDTH+(j%2)*(DIA_WIDTH/2), 
            j*(DIA_HEIGHT/2)-DIA_HEIGHT/2,
            DIA_WIDTH+1,
            DIA_HEIGHT+1,
            'rgb(' + (rA + rOffset) + ', ' + (gA + gOffset) + ', ' + (bA + bOffset) + ')')
        }
      }
    }

    function animateBackground() {
      elapsedTime = (Date.now() - d)/1000
      drawBackground();
    }

    window.setInterval(animateBackground,80);
  }

});