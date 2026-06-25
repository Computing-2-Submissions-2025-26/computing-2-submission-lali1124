/**
 * StatsOrbito is a module to load and save game stats and Elo ratings
 * for Orbito games.
 * @namespace StatsOrbito
 * @author Leila Ali
 * @version 1.0.0
 */
var StatsOrbito = Object.create(null);

var player_statistics = {};

function newPlayer() {
    return {
        "current_streak": 0,
        "elo": 100,
        "longest_streak": 0,
        "player_1_draws": 0,
        "player_1_losses": 0,
        "player_1_wins": 0,
        "player_2_draws": 0,
        "player_2_losses": 0,
        "player_2_wins": 0
    };
}

/**
 * @memberof StatsOrbito
 * @function
 * @param {string[]} players A list of player names to return stats for.
 * @returns {Object} The statistics of the requested players.
 */
StatsOrbito.get_statistics = function (players) {
    var stats = {};
    players.forEach(function (player) {
        if (!player_statistics[player]) {
            player_statistics[player] = newPlayer();
        }
        stats[player] = player_statistics[player];
    });
    return stats;
};

function elo(eloUpdating, eloOpponent, result) {
    var kFactor = 40;
    var expected = 1 / (1 + Math.pow(10, (eloOpponent - eloUpdating) / 400));
    return eloUpdating + kFactor * (result - expected);
}

/**
 * Record the result of a game and return updated statistics.
 * @memberof StatsOrbito
 * @function
 * @param {string} player_1 The name of player 1.
 * @param {string} player_2 The name of player 2.
 * @param {(0 | 1 | 2)} result The number of the player who won, or 0 for draw.
 * @returns {Object} Returns statistics for player_1 and player_2.
 */
StatsOrbito.record_game = function (player_1, player_2, result) {
    if (!player_statistics[player_1]) {
        player_statistics[player_1] = newPlayer();
    }
    if (!player_statistics[player_2]) {
        player_statistics[player_2] = newPlayer();
    }

    var p1Stats = player_statistics[player_1];
    var p2Stats = player_statistics[player_2];
    var p1Result = 0;
    var p2Result = 0;

    switch (result) {
    case 0:
        p1Stats.player_1_draws += 1;
        p2Stats.player_2_draws += 1;
        p1Stats.current_streak = 0;
        p2Stats.current_streak = 0;
        p1Result = 0.5;
        p2Result = 0.5;
        break;
    case 1:
        p1Stats.player_1_wins += 1;
        p2Stats.player_2_losses += 1;
        p1Stats.current_streak += 1;
        p2Stats.current_streak = 0;
        if (p1Stats.current_streak > p1Stats.longest_streak) {
            p1Stats.longest_streak = p1Stats.current_streak;
        }
        p1Result = 1;
        p2Result = 0;
        break;
    case 2:
        p1Stats.player_1_losses += 1;
        p2Stats.player_2_wins += 1;
        p1Stats.current_streak = 0;
        p2Stats.current_streak += 1;
        if (p2Stats.current_streak > p2Stats.longest_streak) {
            p2Stats.longest_streak = p2Stats.current_streak;
        }
        p1Result = 0;
        p2Result = 1;
        break;
    }

    var newP1Elo = elo(p1Stats.elo, p2Stats.elo, p1Result);
    var newP2Elo = elo(p2Stats.elo, p1Stats.elo, p2Result);

    p1Stats.elo = newP1Elo;
    p2Stats.elo = newP2Elo;

    return StatsOrbito.get_statistics([player_1, player_2]);
};

export default Object.freeze(StatsOrbito);