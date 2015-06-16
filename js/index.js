

function formatDate(d) {
  var d = parseInt(d)
  var d = new Date(d);
  console.log(d)
  var daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  var dd = d.getDate();
  if ( dd < 10 ) dd = '0' + dd;
  var mm = d.getMonth() + 1;
  if ( mm < 10 ) mm = '0' + mm;
  var yy = d.getFullYear() % 100;
  if ( yy < 10 ) yy = '0' + yy;
  var hh = d.getHours() % 100;
  if ( hh < 10 ) hh = '0' + hh;
  var min = d.getMinutes() % 100;
  if ( min < 10 ) min = '0' + min;
  //console.log(daysOfWeek[d.getDay()].substr(0,3) + ' ' + dd + '/' + mm + '/' + yy + ' ' + hh + ':' + mm)
  return daysOfWeek[d.getDay()].substr(0,3) + ' ' + dd + '/' + mm + '/' + yy + ' - ' + hh + ':' + min
}

 /*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
window.isTouchDevice =  (/android|webos|iphone|ipod|ipad|blackberry|iemobile/i.test(navigator.userAgent.toLowerCase()) )
var clickEvent = window.isTouchDevice ? 'touchstart' : 'click';

/**
 * Games (collection of Game models)
 *    Game (name, sessions (collection of Session models))
 *       Session (id, players (collection of Player models))
 *          Player (id, name, score)
 */


var Player = Backbone.Model.extend({
	defaults: {
		id: Number(new Date),
		name: '',
		score: 0
	},

	sync: function() {
		this.trigger('change');
	},
});

var Players = Backbone.Collection.extend({

	model: Player,

	sync: function() {
		this.trigger('change');
	}
});

var Session = Backbone.Model.extend({
	defaults: {
		id: Number(new Date),
		//timestamp: (new Date).toLocaleDateString() + ' ' + (new Date).toLocaleTimeString(),
		players: (new Players([new Player({id: Number(new Date)})])),
		toDelete: false
	},

	sync: function() {
		this.trigger('change');
	}
});

var Sessions = Backbone.Collection.extend({
	model: Session,
	initialize: function() {
	},
	sync: function() {
		this.trigger('change');
	}

});

var Game = Backbone.Model.extend({

	defaults: {
		id: Number(new Date),
		name: 'Game',
		sessions: {},//(new Sessions(new Session({id: Number(new Date)}))),
		toDelete: false
	},

	sync: function() {
		this.trigger('change');
	}
});

var Games = Backbone.Collection.extend({
	model: Game,

	initialize: function(options) {
		this.load()
		console.log('loaded')
		this.listenTo(this, 'change', this.sync);
		this.listenTo(this, 'add', this.sync);
		this.listenTo(this, 'remove', this.sync);
	},

	load: function() {	
		var data = $.parseJSON(localStorage.getItem('games'));

		this.reset(_.map(data, function(item, id){
			sessionsCollection = new Sessions(_.map(item.sessions, function(session,idx){
				playersCollection = new Players(_.map(session.players, function(player, idp){
					return new Player(player)
				}));
				return new Session({id: session.id, players:playersCollection})
			}));
			return (new Game({name:item.name, sessions:sessionsCollection, id: item.id}))
		}));
	},

	sync: function() {
		console.log('saved to localstorage')
		localStorage.setItem('games', JSON.stringify(this));
	}
});

/*Views --------------------------------  */


var GamesView = Backbone.View.extend({
	el: $('.games'),
	events: {
		'click .btn-add-game': 'addGame',
		//'click .btn-edit-game': 'editGame'
	},

	initialize: function() {
		this.collection.load()
		if (!this.collection.length) {
			this.collection.add(new Game()) 
			this.render()
		}
	},

	deleteAll: function() {
		this.undelegateEvents();
		this.$el.removeData().unbind();
	},

	changed: function() {
		this.initialize();
		this.render();
		this.trigger('change')
	},

	render: function() {
		var master = this;
		var gamesHolder = $('.games', this.$el);
		gamesHolder.empty();
		this.collection.each(function(item, id) {
			var gameView = (new GameView({model: item}))
			gameView.render().$el.appendTo(gamesHolder);
			master.listenTo(gameView, 'change', master.changed);
			master.listenTo(gameView, 'delete', master.deleted);
			gamesHolder.enhanceWithin();
		})

		//Swip functions
		$('.games').css('display','block');
			$('.ui-listview li > a')
		.on('touchstart', function(e) {
			console.log(e.originalEvent.pageX)
			$('.ui-listview li > a.open').css('left', '0px').removeClass('open') // close em all
			$(e.currentTarget).addClass('open')
			x = e.originalEvent.targetTouches[0].pageX // anchor point
		})
		.on('touchmove', function(e) {
			var change = e.originalEvent.targetTouches[0].pageX - x
			change = Math.min(Math.max(-100, change), 100) // restrict to -100px left, 0px right
			e.currentTarget.style.left = change + 'px'
			 // disable scroll once we hit 10px horizontal slide
		})
		.on('touchend', function(e) {
			var left = parseInt(e.currentTarget.style.left)
			var new_left;
			if (left < -35) {
				new_left = '-100px'
			} else if (left > 35) {
				new_left = '100px'
			} else {
				new_left = '0px'
			}
			// e.currentTarget.style.left = new_left
			$(e.currentTarget).animate({left: new_left}, 200)
			
		});
	},
	addGame: function() {
		var gameName = window.prompt('Name?');
		if (!gameName) {
			return
		}
		var alreadyExists = _.filter(this.collection.models, function(item) { return item.attributes.name == gameName }).length > 0;
		if (alreadyExists) {
			window.alert('This game already exists')
			return
		}
		this.collection.add(new Game({id: Number(new Date), name: gameName}));
		this.trigger('change');
		this.render();
	}
});


var GameView = Backbone.View.extend({
	template: _.template($('#gameTemplate').text()),
	events: {
		'click .delete-btn': 'del',
		'click .edit-btn': 'editName',
		//'click .btn-game-name': 'showSessions',
		//'click .btn-session': 'changed'
	},
	render: function() {
		this.$el.html(this.template(this.model.toJSON()));
		return this;

	},
	del: function() {
		var confirmed = window.confirm('are you sure ?')
		if (confirmed) {
			this.model.destroy();
			this.trigger('change');
		}
	},
	editName: function() {
		var newName = window.prompt('what name ?')
		this.model.set('name', newName);
		//this.render();
		this.trigger('change')
	},

	showSessions: function() {
		this.trigger('left');
		console.log('requested sessions of game of ID:' + this.model.get('id'));
	},
});

var SessionsView = Backbone.View.extend({
	el: $('.sessions'),
	events: {
		'click .btn-add-session': 'addSession',
		'click .btn-add-game': 'addSession'
	},
	//template: _.template($('#sessionsTemplate').text()),

	backing: function() {

		//COMPLETELY UNBIND THE VIEW

		$(this.el).removeData().unbind(); 
		this.undelegateEvents();

		//Remove view from DOM
		//this.remove();
		//Backbone.View.prototype.remove.call(this);

		//var gamesCollection = new Games;
		//var games = new GamesView({collection: gamesCollection });
		//games.render();

	},

	changed: function() {
		//this.render();
		console.log('changed')
		this.trigger('change');
	},
	deleted: function() {
		this.render(this.gameID);
		this.trigger('delete');
		this.trigger('change');
	},
	render: function(gameID) {
		console.log(gameID);
		this.gameID = gameID
		var master = this;
		var sessionsHolder = $('.sessions', this.$el);
		sessionsHolder.empty();
		this.collection.each(function(item, id) {
			var sessionView = (new SessionView({model: item}))
			sessionView.render(gameID).$el.appendTo(sessionsHolder);
			master.listenTo(sessionView, 'change', master.changed);
			master.listenTo(sessionView, 'delete', master.deleted);
		})
		$('.sessions').css('display','block');
		$('#session-editor').attr('href','#sessionseditor?' + gameID);

		//Swip functions
		$('.sessions').css('display','block');
			$('.ui-listview li > a')
		.on('touchstart', function(e) {
			//console.log(e.originalEvent.pageX)
			$('.ui-listview li > a.open').css('left', '0px').removeClass('open') // close em all
			$(e.currentTarget).addClass('open')
			x = e.originalEvent.targetTouches[0].pageX // anchor point
		})
		.on('touchmove', function(e) {
			var change = e.originalEvent.targetTouches[0].pageX - x
			change = Math.min(Math.max(-100, change), 000) // restrict to -100px left, 0px right
			e.currentTarget.style.left = change + 'px'
			// disable scroll once we hit 10px horizontal slide
		})
		.on('touchend', function(e) {
			var left = parseInt(e.currentTarget.style.left)
			var new_left;
			if (left < -35) {
				new_left = '-100px'
			} else if (left > 35) {
				new_left = '100px'
			} else {
				new_left = '0px'
			}
			// e.currentTarget.style.left = new_left
			$(e.currentTarget).animate({left: new_left}, 200)
		});

	},
	addSession: function() {
		this.collection.add(new Session({id: Number(new Date), players: new Players(new Player({id: 1 + Number(new Date)}))}));
		this.trigger('change');
		this.render(this.gameID);

	}
});

var SessionView = Backbone.View.extend({
	template: _.template($('#sessionTemplate').text()),
	events: {
		'click .delete-btn	': 'deleteSession'
	},

	render: function(gameID) {
		console.log(formatDate(1434463586501));
		console.log(this.model.get('id'))
		this.$el.html(this.template({
			gameID: gameID,
			id: this.model.get('id'),
			timestamp: formatDate(parseInt(this.model.get('id')))//(new Date(this.model.get('id'))).toLocaleString()
		}));
		return this;
	}, 
	changed: function() {
		this.trigger('change');
	},
	addedPlayer: function() {
		this.trigger('change')
		this.showSession()
	},
	deleteSession: function() {
		var confirmed = window.confirm('Sure ?');
		if (!confirmed) {
			return
		}
		this.model.destroy();
		this.trigger('delete');
	}
});

var PlayersView = Backbone.View.extend({
	el: $('.players'),
	events: {
		'click .btn-add-game': 'addPlayer',
	},
	template: _.template($('#playersTemplate').text()),

	changed: function() {
		this.trigger('change');
	},
	removedPlayer: function() {
		this.trigger('change');
		this.render();
	},
	render: function(gameID) {

		var master = this;
		var playersHolder = $('.players', this.$el);
		playersHolder.empty();
		this.collection.each(function(item, id) {
			var playerView = (new PlayerView({model: item}))
			playerView.render().$el.appendTo(playersHolder);
			master.listenTo(playerView, 'change', master.changed);
			master.listenTo(playerView, 'delete', master.removedPlayer);
		})
		$('.players').css('display','block');
		console.log(formatDate(gameID))
		$('h4', this.$el).html(formatDate(gameID));

	},

	addPlayer: function() {	
		this.collection.add((new Player({id: Number(new Date)})));
		console.log('adding player');
		this.render();
		this.trigger('change');
	}
});

var PlayerView = Backbone.View.extend({

	template: _.template($('#playerTemplate').text()),
	events: {
		'click .player-name': 'deleteName',
		'change .player-name': 'rename',
		'click .plus': 'plus',
		'click .minus': 'minus',
		'click .btn-remove': 'delete',
		'keyup .player-name': 'rename'
	},
	render: function() {
		this.$el.html(this.template(this.model.toJSON()));
		return this;
	},
	incrementScore: function(increment) {
		var newScore = (this.model.get('score') ? this.model.get('score') : 0) + increment;
		this.model.score = this.model.set('score', newScore);
		($('.score', this.$el)).text(newScore);
		this.trigger('change');
	},
	plus: function() {
		this.incrementScore( 1 );
	},
	minus: function() {
		this.incrementScore( -1 );
	},
	delete: function() {
		var conf = window.confirm('Delete Player ' + this.model.get('name') + '?')
		if (conf) {
			this.model.destroy();
			this.trigger('delete');
		}
	},
	deleteName: function() {
		//$('.player-name', this.$el).val('');
	},
	rename: function() {
		console.log('reefz')
		var newName = $('.player-name', this.$el).val();
		this.model.set('name', newName);
		this.trigger('change');
	}
});

var appScore = {};

appScore.app = {
	activeView: {},
	gamesCollection: (new Games()),

	// Application Constructor
	initialize: function() {
		this.bindEvents();
		console.log('initialized')
	},
	// Bind Event Listeners
	//
	// Bind any events that are required on startup. Common events are:
	// 'load', 'deviceready', 'offline', and 'online'.
	games: function(event, args) {
		try {
			this.activeView.undelegateEvents();
			$(this.activeView.el).removeData().unbind(); 
		} catch(err) {
			console.log(err)
		}
		this.bindEvents();

		this.gamesCollection.load();
		this.activeView = new GamesView({ collection: this.gamesCollection });
		this.activeView.render();
		$('.ui-header h4').html('ScoreKeeper')
	},

	sessions: function(event, args) {
		try {
			this.activeView.undelegateEvents();
			$(this.activeView.el).removeData().unbind(); 
		} catch(err) {
			console.log(err)
		}

		this.bindEvents();
		this.gamesCollection.load();
		this.activeView = new SessionsView({ collection: (this.gamesCollection.get(args[1])).get('sessions') });
		this.activeView.render(args[1]);

		$('.ui-header h4').html(this.gamesCollection.get(args[1]).get('name'))
		$('.btn-back').attr('href','#games')
		this.gamesCollection.listenTo(this.activeView, 'change', this.gamesCollection.sync)
	},

	session: function(event, args) {
		try {
			this.activeView.undelegateEvents();
			$(this.activeView.el).removeData().unbind(); 
		} catch(err) {
			console.log(err)
		}

		this.bindEvents();
		this.gamesCollection.load();
		this.activeView = new PlayersView({ collection: (this.gamesCollection.get(args[1])).get('sessions').get(args[2]).get('players') });
		
		this.activeView.render(args[2]);
		this.gamesCollection.listenTo(this.activeView, 'change', this.gamesCollection.sync)

		//Unelegant changes to the header
		$('.btn-back').attr('href','#sessions?' + args[1])
		//var timestamp = new Date(this.gamesCollection.get(args[1]).get('sessions').get(args[2]).get('id'));
		//$('.ui-header h4').html(timestamp);
		
		//$('.ui-header').enhanceWithin();
	},

	bindEvents: function() {
		document.addEventListener('deviceready', this.onDeviceReady, false);
		//document.addEventListener("DOMContentLoaded", function() { console.log('dom loaded')})
	},
	// deviceready Event Handler
	//
	// The scope of 'this' is the event. In order to call the 'receivedEvent'
	// function, we must explicitly call 'app.receivedEvent(...);'
	onDeviceReady: function() {
		/*$(".myMenu ul li a").on("touchend", function(event) {
  window.location.href = $(this).attr("href");
});*/
		FastClick.attach(document.body);
		app.receivedEvent('deviceready');
	},
	// Update DOM on a Received Event
	receivedEvent: function(id) {
		var parentElement = document.getElementById(id);
		var listeningElement = parentElement.querySelector('.listening');
		var receivedElement = parentElement.querySelector('.received');

		//listeningElement.setAttribute('style', 'display:none;');
		//receivedElement.setAttribute('style', 'display:block;');

		console.log('Received Event: ' + id);
	}
};

appScore.router = new $.mobile.Router(
	{
		"#games": { handler: "games", events: "bs"},		
		"#sessions[?](\\d+)": { handler: "sessions", events: "bs"},
		"#session[?](\\d+)[?](\\d+)": { handler: "session", events: "bs"},
	},
	appScore.app
);

/*
​app = new Workspace();
Backbone.history.start();
main = new Main();
app.navigate('new',{trigger:true});
*/
//var games = new Games();

/*
$(document).bind("mobileinit", function () {
	$.mobile.ajaxEnabled = false;
	$.mobile.linkBindingEnabled = false;
	$.mobile.hashListeningEnabled = false;
	$.mobile.pushStateEnabled = false;
});


$(document).ready(function () {
	console.log('document ready');
	appe = new AppRouter();
	appe.on('route:session', function(id){
		console.log(idp)
	})
	Backbone.history.start();
});*/
/*console.log(localStorage.games);
var gamesCollection = new Games;
var games = new GamesView({ collection: gamesCollection });
games.render();
*/
/*

*/