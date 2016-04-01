# Overview #

This is a demo of the NodeJS Socket IO (v1.0+) that provides an online tic tac toe game.  The game supports N players and games to your systems capabilities.  The example provides an ability to play the server and have the client play the server, computer vs computer; this really was to satisfy a childhood desire to test out the stalemate scenarios in War Games, which was succesfull.  The overall tutorial and details are here for more in depth documentation.  

# Scaling Notes #
This is meant to run on one machine as a simple example.  If you wanted to scale this out, you just need a shared data store to manage the game states and pass next turn after a succesful write, which should avoid any race conditions since the server keeps state in each pass and a player would never have an open square eve if the store had not finished updating.  

# Setting Up #
1. Install NodeJS onto your computer.
2. Grab the project and run the node install command.
3. Start Node with the app.js file and your up and running locally.

Change the host name and other properties in the /public/javascript/script.js file to run somewhere else than localhost.

# Technical High Level Overview #

## Server Side ##
The game was written using NodeJS, and Sockets 1.0+ for back end server support.  The server provides the management of games/players, checking for winners, and provides a computer player.  

Each player creates a socket connection and socket id is used as the session.  This means refreshing the browser will kill the game.  This was done on purpose for testing disconnect states and open to anyone to modifying this to be more external session id managed with UI to support the various stories.

The server does maintain your stats per your connection, but all player data is removed on a disconnect event.  Any games the player is playing are ended, notifications to other player and game is removed.

The computer player on the server side, allows for a testing setup to have client play server.  This would allow for some future benchmarking I would like to play with to see the performance of Node.  

The winner is checked by a set of loops that look for a winner.  I would love to find an optimization of this and I know I could short circuit a few checks based on other fails, since it would follow no winner would be possible. It is an area I am playing with to find and teach myself some better approaches.  

## Client Side ##
The browser client game stats are stored in a local cookie and currently only supports a single profile.  In other words, you can only have one player per a browser profile with stats.  Changing your name does not reset the stats.

## User Interface ##
A very simple responsive design and changes based on screen width to allow various devices to play.  Still tweaking and playing with the design, but would like to update it to allow multiple inline games.

