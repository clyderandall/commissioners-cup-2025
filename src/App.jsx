import React, { useState, useEffect } from 'react';
import { Trophy, Users, Target, BarChart3, RefreshCw, Clock, Calendar, Award, BookOpen } from 'lucide-react';

const SHEET_ID = '1ucF98nx4O5Pq50JtOwM-HC4npoFtJS9YMR4Oclbb0dw';

const CommissionersCup = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [data, setData] = useState({
    franchises: [],
    groupMatchups: [],
    groupStandings: [],
    bracketMatchups: [],
    liveScoring: [],
    config: [],
    history: []
  });
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);

  const fetchSheetData = async () => {
    try {
      const sheets = ['franchises', 'group matchups', 'group standings', 'bracket matchups', 'live scoring', 'Config', 'cc history'];
      const promises = sheets.map(sheet => 
        fetch(`https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheet)}`)
          .then(res => res.text())
          .then(text => {
            const json = JSON.parse(text.substr(47).slice(0, -2));
            return { sheet, data: json.table.rows };
          })
      );

      const results = await Promise.all(promises);
      const newData = {};
      
      results.forEach(({ sheet, data: rows }) => {
        const key = sheet.replace(/ /g, '').toLowerCase();
        newData[key] = rows.map(row => {
          const obj = {};
          row.c.forEach((cell, i) => {
            obj[`col${i}`] = cell ? cell.v : null;
          });
          return obj;
        });
      });

      setData({
        franchises: newData.franchises || [],
        groupMatchups: newData.groupmatchups || [],
        groupStandings: newData.groupstandings || [],
        bracketMatchups: newData.bracketmatchups || [],
        liveScoring: newData.livescoring || [],
        config: newData.config || [],
        history: newData.cchistory || []
      });
      setLastUpdate(new Date());
      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSheetData();
    const interval = setInterval(fetchSheetData, 60000);
    return () => clearInterval(interval);
  }, []);

  const toNumber = (val) => {
    if (val === null || val === undefined) return 0;
    const num = typeof val === 'string' ? parseFloat(val) : val;
    return isNaN(num) ? 0 : num;
  };

  const formatScore = (val) => {
    return toNumber(val).toFixed(2);
  };

  const getTeamName = (ccTeamId) => {
    const team = data.franchises.find(f => f.col8 === ccTeamId);
    return team ? team.col1 : 'Unknown';
  };

  const getTeamOwner = (ccTeamId) => {
    const team = data.franchises.find(f => f.col8 === ccTeamId);
    return team ? team.col3 : 'Unknown';
  };

  const getTeamLogo = (ccTeamId) => {
    const team = data.franchises.find(f => f.col8 === ccTeamId);
    return team ? team.col6 : null;
  };

  const Dashboard = () => {
    const configRow = data.config.find(row => row.col0 === 'Current NFL Week');
    const currentNFLWeek = configRow ? toNumber(configRow.col1) : 10;
    const currentGPWeek = currentNFLWeek >= 9 && currentNFLWeek <= 13 ? currentNFLWeek - 8 : null;
    
    let phase = 'Pre-Tournament';
    let phaseDetail = 'Awaiting Start';
    
    if (currentNFLWeek >= 9 && currentNFLWeek <= 13) {
      phase = 'Group Stage';
      phaseDetail = `Week ${currentGPWeek} of 5`;
    } else if (currentNFLWeek === 14) {
      phase = 'Sweet 16';
      phaseDetail = 'Round 1';
    } else if (currentNFLWeek === 15) {
      phase = 'Elite 8';
      phaseDetail = 'Quarterfinals';
    } else if (currentNFLWeek === 16) {
      phase = 'Final 4';
      phaseDetail = 'Semifinals';
    } else if (currentNFLWeek === 17) {
      phase = 'Championship';
      phaseDetail = 'Final';
    } else if (currentNFLWeek > 17) {
      phase = 'Complete';
      phaseDetail = 'Season Ended';
    }

    const liveGames = data.liveScoring.filter(game => toNumber(game.col2) > 0);
    
    let currentWeekMatchups = [];
    if (currentGPWeek) {
      currentWeekMatchups = data.groupMatchups.filter(m => toNumber(m.col0) === currentGPWeek);
    } else if (currentNFLWeek >= 14 && currentNFLWeek <= 17) {
      const roundNum = currentNFLWeek - 13;
      currentWeekMatchups = data.bracketMatchups.filter(m => toNumber(m.col0) === roundNum);
    }
    
    const matchupsByGroup = {};
    if (currentGPWeek) {
      currentWeekMatchups.forEach(matchup => {
        const group = matchup.col2;
        if (!matchupsByGroup[group]) matchupsByGroup[group] = [];
        matchupsByGroup[group].push(matchup);
      });
    }
    
    const teamsRemaining = currentNFLWeek < 14 ? 24 : currentNFLWeek === 14 ? 16 : currentNFLWeek === 15 ? 8 : currentNFLWeek === 16 ? 4 : currentNFLWeek === 17 ? 2 : 1;
    
    let highScorer = null;
    let highScore = 0;
    if (liveGames.length > 0) {
      liveGames.forEach(game => {
        const score = toNumber(game.col2);
        if (score > highScore) {
          highScore = score;
          highScorer = game.col6;
        }
      });
    }
    
    let completedMatchups = 0;
    let totalMatchups = 0;
    if (currentGPWeek) {
      const weekMatchups = data.groupMatchups.filter(m => toNumber(m.col0) === currentGPWeek);
      totalMatchups = weekMatchups.length;
      completedMatchups = weekMatchups.filter(m => m.col10 !== null && m.col10 !== '').length;
    } else if (currentNFLWeek >= 14 && currentNFLWeek <= 17) {
      const roundNum = currentNFLWeek - 13;
      const roundMatchups = data.bracketMatchups.filter(m => toNumber(m.col0) === roundNum);
      totalMatchups = roundMatchups.length;
      completedMatchups = roundMatchups.filter(m => m.col10 !== null && m.col10 !== '').length;
    }

    const allStandings = data.groupStandings.filter(s => s.col1 !== null).sort((a, b) => {
      const winsA = toNumber(a.col2);
      const winsB = toNumber(b.col2);
      if (winsB !== winsA) return winsB - winsA;
      return toNumber(b.col4) - toNumber(a.col4);
    }).slice(0, 4);
    
    let closestMatchup = null;
    let smallestDiff = Infinity;
    const allMatchups = [...data.groupMatchups, ...data.bracketMatchups];
    allMatchups.forEach(matchup => {
      const scoreA = toNumber(matchup.col8);
      const scoreB = toNumber(matchup.col9);
      if (scoreA > 0 && scoreB > 0) {
        const diff = Math.abs(scoreA - scoreB);
        if (diff < smallestDiff) {
          smallestDiff = diff;
          closestMatchup = matchup;
        }
      }
    });
    
    let biggestBlowout = null;
    let largestDiff = 0;
    allMatchups.forEach(matchup => {
      const scoreA = toNumber(matchup.col8);
      const scoreB = toNumber(matchup.col9);
      if (scoreA > 0 && scoreB > 0) {
        const diff = Math.abs(scoreA - scoreB);
        if (diff > largestDiff) {
          largestDiff = diff;
          biggestBlowout = matchup;
        }
      }
    });

    const teamStreaks = {};
    data.franchises.forEach(team => {
      teamStreaks[team.col8] = { wins: 0, losses: 0, current: 'none' };
    });
    
    const sortedMatchups = data.groupMatchups.filter(m => m.col10 !== null && m.col10 !== '').sort((a, b) => toNumber(a.col0) - toNumber(b.col0));
    
    sortedMatchups.forEach(matchup => {
      const winner = matchup.col10;
      const loser = matchup.col11;
      
      if (winner && teamStreaks[winner]) {
        if (teamStreaks[winner].current === 'win') {
          teamStreaks[winner].wins++;
        } else {
          teamStreaks[winner].wins = 1;
          teamStreaks[winner].current = 'win';
        }
      }
      
      if (loser && teamStreaks[loser]) {
        if (teamStreaks[loser].current === 'loss') {
          teamStreaks[loser].losses++;
        } else {
          teamStreaks[loser].losses = 1;
          teamStreaks[loser].current = 'loss';
        }
      }
    });
    
    const hotStreak = Object.entries(teamStreaks).filter(([_, streak]) => streak.current === 'win' && streak.wins >= 2).sort((a, b) => b[1].wins - a[1].wins)[0];
    const coldStreak = Object.entries(teamStreaks).filter(([_, streak]) => streak.current === 'loss' && streak.losses >= 2).sort((a, b) => b[1].losses - a[1].losses)[0];
    
    let totalPoints = 0;
    let totalGames = 0;
    data.groupMatchups.forEach(matchup => {
      const scoreA = toNumber(matchup.col8);
      const scoreB = toNumber(matchup.col9);
      if (scoreA > 0) {
        totalPoints += scoreA;
        totalGames++;
      }
      if (scoreB > 0) {
        totalPoints += scoreB;
        totalGames++;
      }
    });
    const avgPoints = totalGames > 0 ? totalPoints / totalGames : 0;

    const renderMatchupCard = (matchup, i, isBracket) => {
      const homeTeamId = matchup.col6;
      const awayTeamId = matchup.col7;
      const homeScore = toNumber(matchup.col8);
      const awayScore = toNumber(matchup.col9);
      const winner = matchup.col10;
      
      const homeLive = data.liveScoring.find(ls => ls.col6 === homeTeamId);
      const awayLive = data.liveScoring.find(ls => ls.col6 === awayTeamId);
      
      const homeLiveScore = homeLive ? toNumber(homeLive.col2) : homeScore;
      const awayLiveScore = awayLive ? toNumber(awayLive.col2) : awayScore;
      const homeYetToPlay = homeLive ? toNumber(homeLive.col4) : 0;
      const awayYetToPlay = awayLive ? toNumber(awayLive.col4) : 0;
      const homePlaying = homeLive ? toNumber(homeLive.col5) : 0;
      const awayPlaying = awayLive ? toNumber(awayLive.col5) : 0;
      const homeSecondsLeft = homeLive ? toNumber(homeLive.col3) : 0;
      const awaySecondsLeft = awayLive ? toNumber(awayLive.col3) : 0;
      
      const isLive = homePlaying > 0 || awayPlaying > 0 || homeYetToPlay > 0 || awayYetToPlay > 0;
      const isComplete = winner !== null && winner !== '';
      
      return (
        <div key={i} className={`border-2 rounded-lg overflow-hidden ${isLive ? 'border-red-400 shadow-lg' : 'border-gray-300'}`}>
          {isLive && <div className="bg-red-500 text-white text-center py-1 text-sm font-bold">🔴 LIVE</div>}
          {isComplete && <div className="bg-green-500 text-white text-center py-1 text-sm font-bold">✓ FINAL</div>}
          
          <div className={`p-4 ${winner === homeTeamId ? 'bg-green-50' : 'bg-gray-50'} border-b`}>
            <div className="flex justify-between items-center">
              <div className="flex-1 flex items-center gap-3">
                {isBracket && <span className="text-xs font-semibold text-gray-500 bg-gray-200 px-2 py-1 rounded">{matchup.col4}</span>}
                {getTeamLogo(homeTeamId) && (
                  <img src={getTeamLogo(homeTeamId)} alt="" className="h-10 w-10 object-contain" onError={(e) => e.target.style.display = 'none'} />
                )}
                <div className="flex-1">
                  <p className={`font-bold text-lg ${winner === homeTeamId ? 'text-green-700' : 'text-gray-800'}`}>{getTeamName(homeTeamId)}</p>
                  <p className="text-sm text-gray-600">{getTeamOwner(homeTeamId)}</p>
                  <div className="flex gap-4 text-xs text-gray-500 mt-1">
                    {homePlaying > 0 && <span className="text-green-600 font-semibold">⚡ {homePlaying} playing</span>}
                    {homeYetToPlay > 0 && <span>📋 {homeYetToPlay} yet to play</span>}
                    {homeSecondsLeft > 0 && <span>⏱️ {Math.floor(homeSecondsLeft / 60)}m left</span>}
                  </div>
                </div>
              </div>
              <div className="text-right ml-4">
                <p className={`text-3xl font-bold ${winner === homeTeamId ? 'text-green-600' : 'text-blue-600'}`}>{homeLiveScore > 0 ? formatScore(homeLiveScore) : '-'}</p>
              </div>
            </div>
          </div>
          
          <div className={`p-4 ${winner === awayTeamId ? 'bg-green-50' : 'bg-white'}`}>
            <div className="flex justify-between items-center">
              <div className="flex-1 flex items-center gap-3">
                {isBracket && <span className="text-xs font-semibold text-gray-500 bg-gray-200 px-2 py-1 rounded">{matchup.col5}</span>}
                {getTeamLogo(awayTeamId) && (
                  <img src={getTeamLogo(awayTeamId)} alt="" className="h-10 w-10 object-contain" onError={(e) => e.target.style.display = 'none'} />
                )}
                <div className="flex-1">
                  <p className={`font-bold text-lg ${winner === awayTeamId ? 'text-green-700' : 'text-gray-800'}`}>{getTeamName(awayTeamId)}</p>
                  <p className="text-sm text-gray-600">{getTeamOwner(awayTeamId)}</p>
                  <div className="flex gap-4 text-xs text-gray-500 mt-1">
                    {awayPlaying > 0 && <span className="text-green-600 font-semibold">⚡ {awayPlaying} playing</span>}
                    {awayYetToPlay > 0 && <span>📋 {awayYetToPlay} yet to play</span>}
                    {awaySecondsLeft > 0 && <span>⏱️ {Math.floor(awaySecondsLeft / 60)}m left</span>}
                  </div>
                </div>
              </div>
              <div className="text-right ml-4">
                <p className={`text-3xl font-bold ${winner === awayTeamId ? 'text-green-600' : 'text-blue-600'}`}>{awayLiveScore > 0 ? formatScore(awayLiveScore) : '-'}</p>
              </div>
            </div>
          </div>
        </div>
      );
    };

    return (
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-8 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2">Commissioner's Cup 2024</h1>
              <p className="text-xl opacity-90">NFL Week {currentNFLWeek}</p>
            </div>
            <img src="https://iili.io/3wiyhl.png" alt="CC Logo" className="h-24 w-24 object-contain" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Current Phase</p>
                <p className="text-2xl font-bold text-purple-600">{phase}</p>
                <p className="text-sm text-gray-600">{phaseDetail}</p>
              </div>
              <Target className="h-12 w-12 text-purple-500" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Teams Remaining</p>
                <p className="text-3xl font-bold text-blue-600">{teamsRemaining}</p>
                <p className="text-sm text-gray-600">of 24 total</p>
              </div>
              <Users className="h-12 w-12 text-blue-500" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Matchups Complete</p>
                <p className="text-3xl font-bold text-green-600">{completedMatchups}/{totalMatchups}</p>
                <p className="text-sm text-gray-600">this week</p>
              </div>
              <BarChart3 className="h-12 w-12 text-green-500" />
            </div>
          </div>

          {highScorer ? (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1 mr-2">
                  <p className="text-gray-500 text-sm">High Score</p>
                  <p className="text-xl font-bold text-orange-600">{getTeamName(highScorer)}</p>
                  <p className="text-2xl font-bold text-gray-800">{formatScore(highScore)}</p>
                </div>
                <Trophy className="h-12 w-12 text-yellow-500" />
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm">Prize Pool</p>
                  <p className="text-3xl font-bold text-green-600">$600</p>
                  <p className="text-sm text-gray-600">24 x $25</p>
                </div>
                <Trophy className="h-12 w-12 text-yellow-500" />
              </div>
            </div>
          )}
        </div>

        {currentWeekMatchups.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold mb-4 flex items-center">
              <Clock className="mr-2 text-red-500" />
              {currentGPWeek ? `Group Play Week ${currentGPWeek} - Live Matchups` : `${phase} - Live Matchups`}
            </h2>
            
            {currentGPWeek ? (
              <div className="space-y-6">
                {Object.entries(matchupsByGroup).sort().map(([group, matchups]) => (
                  <div key={group}>
                    <h3 className="text-xl font-bold mb-3 text-purple-600">Group {group}</h3>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {matchups.map((matchup, i) => renderMatchupCard(matchup, i, false))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {currentWeekMatchups.map((matchup, i) => renderMatchupCard(matchup, i, true))}
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center">
              <Trophy className="mr-2 text-yellow-500" size={24} />
              Top 4 Teams by Record
            </h2>
            <div className="space-y-3">
              {allStandings.map((team, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl font-bold text-gray-400">#{idx + 1}</span>
                    {getTeamLogo(team.col1) && (
                      <img src={getTeamLogo(team.col1)} alt="" className="h-12 w-12 object-contain" onError={(e) => e.target.style.display = 'none'} />
                    )}
                    <div>
                      <p className="font-bold text-gray-800">{getTeamName(team.col1)}</p>
                      <p className="text-sm text-gray-600">{getTeamOwner(team.col1)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-blue-600">{team.col2}-{team.col3}</p>
                    <p className="text-sm text-gray-500">{formatScore(team.col4)} pts</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            {closestMatchup && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-bold mb-3 text-orange-600">🔥 Closest Matchup</h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">{getTeamName(closestMatchup.col6)}</span>
                    <span className="text-xl font-bold">{formatScore(closestMatchup.col8)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">{getTeamName(closestMatchup.col7)}</span>
                    <span className="text-xl font-bold">{formatScore(closestMatchup.col9)}</span>
                  </div>
                  <p className="text-sm text-gray-500 text-center pt-2">
                    Decided by {formatScore(smallestDiff)} points
                  </p>
                </div>
              </div>
            )}

            {biggestBlowout && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-bold mb-3 text-red-600">💥 Biggest Blowout</h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">{getTeamName(biggestBlowout.col6)}</span>
                    <span className="text-xl font-bold">{formatScore(biggestBlowout.col8)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">{getTeamName(biggestBlowout.col7)}</span>
                    <span className="text-xl font-bold">{formatScore(biggestBlowout.col9)}</span>
                  </div>
                  <p className="text-sm text-gray-500 text-center pt-2">
                    Margin of {formatScore(largestDiff)} points
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {hotStreak && (
            <div className="bg-gradient-to-br from-green-50 to-emerald-100 rounded-lg shadow p-6 border-2 border-green-300">
              <h3 className="text-lg font-bold mb-2 text-green-700">🔥 Hot Streak</h3>
              <p className="text-2xl font-bold text-gray-800">{getTeamName(hotStreak[0])}</p>
              <p className="text-sm text-gray-600 mb-2">{getTeamOwner(hotStreak[0])}</p>
              <p className="text-3xl font-bold text-green-600">{hotStreak[1].wins} Wins</p>
              <p className="text-sm text-gray-600">in a row</p>
            </div>
          )}

          {coldStreak && (
            <div className="bg-gradient-to-br from-red-50 to-rose-100 rounded-lg shadow p-6 border-2 border-red-300">
              <h3 className="text-lg font-bold mb-2 text-red-700">❄️ Cold Streak</h3>
              <p className="text-2xl font-bold text-gray-800">{getTeamName(coldStreak[0])}</p>
              <p className="text-sm text-gray-600 mb-2">{getTeamOwner(coldStreak[0])}</p>
              <p className="text-3xl font-bold text-red-600">{coldStreak[1].losses} Losses</p>
              <p className="text-sm text-gray-600">in a row</p>
            </div>
          )}

          <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg shadow p-6 border-2 border-blue-300">
            <h3 className="text-lg font-bold mb-2 text-blue-700">📊 Tournament Average</h3>
            <p className="text-sm text-gray-600 mb-2">Points per game</p>
            <p className="text-4xl font-bold text-blue-600">{formatScore(avgPoints)}</p>
            <p className="text-sm text-gray-600 mt-2">across {totalGames} games</p>
          </div>
        </div>
      </div>
    );
  };

  const Standings = () => {
    const groupNames = ['A', 'B', 'C', 'D'];
    
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold mb-6">Group Standings</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {groupNames.map(groupName => {
            const standings = data.groupStandings
              .filter(s => s.col0 === groupName && s.col1 !== null)
              .sort((a, b) => toNumber(a.col6) - toNumber(b.col6));
            
            return (
              <div key={groupName} className="bg-white rounded-lg shadow overflow-hidden">
                <div className="bg-gradient-to-r from-blue-500 to-purple-500 p-4">
                  <h2 className="text-2xl font-bold text-white">Group {groupName}</h2>
                </div>
                <div className="p-4">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-2">Rank</th>
                        <th className="text-left py-2">Team</th>
                        <th className="text-center py-2">W</th>
                        <th className="text-center py-2">L</th>
                        <th className="text-center py-2">PF</th>
                      </tr>
                    </thead>
                    <tbody>
                      {standings.map((team, idx) => {
                        const qualifying = idx < 4;
                        return (
                          <tr key={idx} className={`border-b ${qualifying ? 'bg-green-50' : ''}`}>
                            <td className="py-2 px-2 font-bold">{team.col6}</td>
                            <td className="py-2">
                              <div className="flex items-center gap-2">
                                {getTeamLogo(team.col1) && (
                                  <img src={getTeamLogo(team.col1)} alt="" className="h-8 w-8 object-contain" onError={(e) => e.target.style.display = 'none'} />
                                )}
                                <div>
                                  <p className="font-semibold">{getTeamName(team.col1)}</p>
                                  <p className="text-xs text-gray-500">{getTeamOwner(team.col1)}</p>
                                </div>
                              </div>
                            </td>
                            <td className="text-center py-2">{team.col2}</td>
                            <td className="text-center py-2">{team.col3}</td>
                            <td className="text-center py-2">{formatScore(team.col4)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const Matchups = () => {
    const gpWeeks = [1, 2, 3, 4, 5];
    const configRow = data.config.find(row => row.col0 === 'Current NFL Week');
    const currentNFLWeek = configRow ? toNumber(configRow.col1) : 10;
    const currentGPWeek = currentNFLWeek >= 9 && currentNFLWeek <= 13 ? currentNFLWeek - 8 : null;
    
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold mb-6">Group Matchups</h1>
        
        {gpWeeks.map(gpWeek => {
          const weekMatchups = data.groupMatchups.filter(m => toNumber(m.col0) === gpWeek);
          if (weekMatchups.length === 0) return null;
          
          const matchupsByGroup = {};
          weekMatchups.forEach(matchup => {
            const group = matchup.col2;
            if (!matchupsByGroup[group]) matchupsByGroup[group] = [];
            matchupsByGroup[group].push(matchup);
          });
          
          const isCurrentWeek = gpWeek === currentGPWeek;
          
          return (
            <div key={gpWeek} className={`bg-white rounded-lg shadow p-6 ${isCurrentWeek ? 'border-4 border-blue-600' : ''}`}>
              <h3 className={`text-xl font-bold mb-4 ${isCurrentWeek ? 'text-blue-600' : 'text-gray-800'}`}>
                Group Play Week {gpWeek} {isCurrentWeek && '(Current Week)'}
                <span className="text-sm font-normal text-gray-500 ml-2">
                  NFL Week {gpWeek + 8}
                </span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {Object.entries(matchupsByGroup).sort().map(([group, matchups]) => (
                  <div key={group} className="border-2 border-gray-200 rounded-lg overflow-hidden">
                    <div className="bg-gray-100 p-3 border-b-2 border-gray-200">
                      <h4 className="text-base font-bold text-center">Group {group}</h4>
                    </div>
                    <div className="p-3">
                      {matchups.map((matchup, idx) => {
                        const homeTeam = getTeamName(matchup.col6);
                        const awayTeam = getTeamName(matchup.col7);
                        const homeScore = toNumber(matchup.col8);
                        const awayScore = toNumber(matchup.col9);
                        const hasScores = homeScore > 0 || awayScore > 0;
                        const winner = matchup.col10;
                        
                        return (
                          <div key={idx} className={idx < matchups.length - 1 ? "mb-3" : ""}>
                            <div className={`flex justify-between items-center p-2 rounded-t ${winner === matchup.col6 ? 'bg-green-100 font-bold' : 'bg-gray-50'}`}>
                              <span className="text-xs text-gray-600 mr-2">{matchup.col3}</span>
                              {getTeamLogo(matchup.col6) && (
                                <img src={getTeamLogo(matchup.col6)} alt="" className="h-6 w-6 object-contain mr-1" onError={(e) => e.target.style.display = 'none'} />
                              )}
                              <span className="text-sm flex-1">{homeTeam}</span>
                              <span className="text-lg font-bold">
                                {hasScores ? formatScore(homeScore) : '-'}
                              </span>
                            </div>
                            <div className={`flex justify-between items-center p-2 rounded-b border-t ${winner === matchup.col7 ? 'bg-green-100 font-bold' : 'bg-gray-50'}`}>
                              <span className="text-xs text-gray-600 mr-2">{matchup.col4}</span>
                              {getTeamLogo(matchup.col7) && (
                                <img src={getTeamLogo(matchup.col7)} alt="" className="h-6 w-6 object-contain mr-1" onError={(e) => e.target.style.display = 'none'} />
                              )}
                              <span className="text-sm flex-1">{awayTeam}</span>
                              <span className="text-lg font-bold">
                                {hasScores ? formatScore(awayScore) : '-'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const Bracket = () => {
    const rounds = {
      'Sweet 16': data.bracketMatchups.filter(m => toNumber(m.col0) === 1),
      'Elite 8': data.bracketMatchups.filter(m => toNumber(m.col0) === 2),
      'Final 4': data.bracketMatchups.filter(m => toNumber(m.col0) === 3),
      'Championship': data.bracketMatchups.filter(m => toNumber(m.col0) === 4)
    };

    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold mb-6">Elimination Bracket</h1>
        
        <div className="bg-white rounded-lg shadow p-6 overflow-x-auto">
          <div className="flex gap-8" style={{ minWidth: 'max-content' }}>
            {Object.entries(rounds).map(([roundName, matches]) => {
              if (matches.length === 0) return null;
              return (
                <div key={roundName} className="flex-1" style={{ minWidth: '250px' }}>
                  <h3 className="text-xl font-bold mb-4 text-center text-purple-600">{roundName}</h3>
                  <div className="space-y-6">
                    {matches.map((match, idx) => (
                      <div key={idx} className="border-2 border-gray-300 rounded-lg overflow-hidden">
                        <div className={`p-3 flex justify-between items-center ${match.col10 === match.col6 ? 'bg-green-100 font-bold' : 'bg-gray-50'}`}>
                          <span className="text-sm text-gray-600">{match.col4}</span>
                          {getTeamLogo(match.col6) && (
                            <img src={getTeamLogo(match.col6)} alt="" className="h-8 w-8 object-contain mx-2" onError={(e) => e.target.style.display = 'none'} />
                          )}
                          <span className="flex-1">{getTeamName(match.col6)}</span>
                          <span className="font-bold">{match.col8 ? formatScore(match.col8) : '-'}</span>
                        </div>
                        <div className="border-t-2"></div>
                        <div className={`p-3 flex justify-between items-center ${match.col10 === match.col7 ? 'bg-green-100 font-bold' : 'bg-gray-50'}`}>
                          <span className="text-sm text-gray-600">{match.col5}</span>
                          {getTeamLogo(match.col7) && (
                            <img src={getTeamLogo(match.col7)} alt="" className="h-8 w-8 object-contain mx-2" onError={(e) => e.target.style.display = 'none'} />
                          )}
                          <span className="flex-1">{getTeamName(match.col7)}</span>
                          <span className="font-bold">{match.col9 ? formatScore(match.col9) : '-'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const Teams = () => {
    const adlTeams = data.franchises.filter(team => team.col7 === 'ADL');
    const bdlTeams = data.franchises.filter(team => team.col7 === 'BDL');
    
    const renderTeamCard = (team, idx) => (
      <div key={idx} className="bg-white rounded-lg shadow p-4 hover:shadow-lg transition">
        <div className="flex items-center space-x-4">
          {team.col6 && (
            <img 
              src={team.col6} 
              alt={`${team.col1} logo`} 
              className="h-16 w-16 object-contain rounded"
              onError={(e) => e.target.style.display = 'none'}
            />
          )}
          <div className="flex-1">
            <h3 className="font-bold text-lg">{team.col1}</h3>
            <p className="text-gray-600">{team.col3}</p>
            <p className="text-sm text-gray-500">{team.col7}</p>
          </div>
        </div>
      </div>
    );
    
    return (
      <div className="space-y-8">
        <h1 className="text-3xl font-bold mb-6">All Teams</h1>
        
        <div>
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-4 mb-4">
            <h2 className="text-2xl font-bold text-white">ADL - {adlTeams.length} Teams</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {adlTeams.map((team, idx) => renderTeamCard(team, idx))}
          </div>
        </div>

        <div>
          <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg p-4 mb-4">
            <h2 className="text-2xl font-bold text-white">BDL - {bdlTeams.length} Teams</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {bdlTeams.map((team, idx) => renderTeamCard(team, idx))}
          </div>
        </div>
      </div>
    );
  };

  const History = () => {
    const champions = data.history.filter(h => h.col0 !== null).sort((a, b) => toNumber(b.col0) - toNumber(a.col0));
    
    return (
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-lg p-8 text-white">
          <div className="flex items-center justify-center">
            <Trophy className="h-16 w-16 mr-4" />
            <div className="text-center">
              <h1 className="text-4xl font-bold mb-2">Commissioner's Cup Champions</h1>
              <p className="text-xl opacity-90">Hall of Champions</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {champions.map((champ, idx) => {
            const isCurrentYear = toNumber(champ.col0) === 2024;
            return (
              <div key={idx} className={`bg-white rounded-lg shadow-lg overflow-hidden ${isCurrentYear ? 'border-4 border-yellow-400' : ''}`}>
                <div className={`p-6 ${isCurrentYear ? 'bg-gradient-to-r from-yellow-50 to-yellow-100' : 'bg-gradient-to-r from-gray-50 to-gray-100'}`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`text-4xl font-bold ${isCurrentYear ? 'text-yellow-600' : 'text-gray-600'}`}>
                        {champ.col0}
                      </div>
                      {isCurrentYear && (
                        <span className="bg-yellow-400 text-yellow-900 text-xs font-bold px-3 py-1 rounded-full">
                          CURRENT CHAMPION
                        </span>
                      )}
                    </div>
                    <Trophy className={`h-12 w-12 ${isCurrentYear ? 'text-yellow-500' : 'text-gray-400'}`} />
                  </div>
                  
                  <div className="flex items-center gap-4">
                    {champ.col4 && (
                      <img 
                        src={champ.col4} 
                        alt={`${champ.col1} logo`} 
                        className="h-20 w-20 object-contain"
                        onError={(e) => e.target.style.display = 'none'}
                      />
                    )}
                    <div className="flex-1">
                      <h3 className="text-2xl font-bold text-gray-800 mb-1">{champ.col1}</h3>
                      <p className="text-lg text-gray-600">{champ.col2}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                          champ.col3 === 'ADL' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                        }`}>
                          {champ.col3}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold mb-4">Championship Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-gray-600 text-sm mb-2">Total Tournaments</p>
              <p className="text-4xl font-bold text-blue-600">{champions.length}</p>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-gray-600 text-sm mb-2">ADL Championships</p>
              <p className="text-4xl font-bold text-blue-600">
                {champions.filter(c => c.col3 === 'ADL').length}
              </p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <p className="text-gray-600 text-sm mb-2">BDL Championships</p>
              <p className="text-4xl font-bold text-purple-600">
                {champions.filter(c => c.col3 === 'BDL').length}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const Rules = () => {
    return (
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-8 text-white">
          <h1 className="text-4xl font-bold mb-2">Tournament Rules & Format</h1>
          <p className="text-xl opacity-90">Commissioner's Cup 2024</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold text-blue-600 mb-4">Overview</h2>
          <p className="text-gray-700 mb-4">
            The Commissioner's Cup is a yearly tournament that involves all teams across the Big Dynasty Leagues. 
            This is a separate competition from normal league play and does not impact records, standings, or post 
            season outcomes of the standard league format. The competition is tracked externally from the MFL league 
            management site.
          </p>
          <p className="text-gray-700">
            A separate trophy and cash prize will be awarded for this tournament. The tournament format follows a 
            world cup style with round robin group play to determine seeding for a 16 team single elimination bracket.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold text-blue-600 mb-4">Tournament Timeline</h2>
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded">
              <span className="font-bold text-blue-600 min-w-[100px]">Week 8:</span>
              <span className="text-gray-700">After completion of week eight, teams will be drawn and seeded for group play</span>
            </div>
            <div className="flex items-start gap-3 p-3 bg-blue-50 rounded">
              <span className="font-bold text-blue-600 min-w-[100px]">Weeks 9-13:</span>
              <span className="text-gray-700">Round robin group play (5 weeks)</span>
            </div>
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded">
              <span className="font-bold text-blue-600 min-w-[100px]">Week 14:</span>
              <span className="text-gray-700">Sweet 16 - Single Elimination Round</span>
            </div>
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded">
              <span className="font-bold text-blue-600 min-w-[100px]">Week 15:</span>
              <span className="text-gray-700">Elite 8 - Single Elimination Round</span>
            </div>
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded">
              <span className="font-bold text-blue-600 min-w-[100px]">Week 16:</span>
              <span className="text-gray-700">Final 4 - Single Elimination Round</span>
            </div>
            <div className="flex items-start gap-3 p-3 bg-yellow-50 rounded border-2 border-yellow-400">
              <span className="font-bold text-yellow-700 min-w-[100px]">Week 17:</span>
              <span className="text-gray-700 font-semibold">Championship Game 🏆</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold text-blue-600 mb-4">Group Draw & Seeding</h2>
          <p className="text-gray-700 mb-4">
            Teams are divided into groups based on their current all-play record in their respective league. 
            Tie breaker for same all play records goes to most points scored season to date.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-blue-100">
                  <th className="border border-gray-300 p-3 text-left">Tier</th>
                  <th className="border border-gray-300 p-3 text-left">Criteria</th>
                  <th className="border border-gray-300 p-3 text-center">Teams per League</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-gray-300 p-3 font-semibold">Tier 1</td>
                  <td className="border border-gray-300 p-3">Top 4 All Play</td>
                  <td className="border border-gray-300 p-3 text-center">4 ADL + 4 BDL</td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="border border-gray-300 p-3 font-semibold">Tier 2</td>
                  <td className="border border-gray-300 p-3">Ranks 5-8 All Play</td>
                  <td className="border border-gray-300 p-3 text-center">4 ADL + 4 BDL</td>
                </tr>
                <tr>
                  <td className="border border-gray-300 p-3 font-semibold">Tier 3</td>
                  <td className="border border-gray-300 p-3">Ranks 9-12 All Play</td>
                  <td className="border border-gray-300 p-3 text-center">4 ADL + 4 BDL</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-gray-700 mt-4">
            Each group (A, B, C, D) will have 6 teams with 3 teams from each league. Seeds 1-2 are drawn from Tier 1, 
            Seeds 3-4 from Tier 2, and Seeds 5-6 from Tier 3.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold text-blue-600 mb-4">Round Robin Group Play</h2>
          <p className="text-gray-700 mb-4">
            During round robin group play, each team will play all teams in their group once (one matchup per week for five weeks).
          </p>
          <p className="text-gray-700 mb-4 font-semibold">Tiebreakers for round robin games:</p>
          <ol className="list-decimal list-inside space-y-2 text-gray-700 ml-4">
            <li>Most bench points</li>
            <li>Coin flip by commissioner (higher seed heads, lower seed tails)</li>
          </ol>
          <p className="text-gray-700 mt-4">
            The top 4 teams from each group (based on win/loss record) advance to the 16-team elimination bracket. 
            Tie breaker for tied records goes to most points scored in group play.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold text-blue-600 mb-4">Elimination Bracket</h2>
          <p className="text-gray-700 mb-4">
            The top 4 teams from each group advance to a single-elimination bracket. Teams must win to advance.
          </p>
          <p className="text-gray-700 mb-4 font-semibold">Tiebreakers for bracket games:</p>
          <ol className="list-decimal list-inside space-y-2 text-gray-700 ml-4">
            <li>Most bench points</li>
            <li>Coin flip by commissioner (higher seed heads, lower seed tails)</li>
          </ol>
        </div>

        <div className="bg-gradient-to-r from-green-50 to-emerald-100 rounded-lg shadow p-6 border-2 border-green-300">
          <h2 className="text-2xl font-bold text-green-700 mb-4">💰 Prize Structure</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-white rounded">
              <span className="font-semibold text-gray-700">Entry Fee (per team):</span>
              <span className="text-2xl font-bold text-green-600">$25</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-white rounded">
              <span className="font-semibold text-gray-700">Total Prize Pool (24 teams):</span>
              <span className="text-2xl font-bold text-green-600">$600</span>
            </div>
            <div className="border-t-2 border-green-300 my-3"></div>
            <div className="flex justify-between items-center p-4 bg-yellow-100 rounded border-2 border-yellow-400">
              <span className="font-bold text-gray-800">🏆 Champion (60%):</span>
              <span className="text-3xl font-bold text-yellow-700">$360</span>
            </div>
            <div className="flex justify-between items-center p-4 bg-gray-100 rounded">
              <span className="font-bold text-gray-800">🥈 Runner-Up (40%):</span>
              <span className="text-2xl font-bold text-gray-600">$240</span>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 rounded-lg p-6 border-l-4 border-blue-600">
          <h3 className="text-lg font-bold text-blue-900 mb-2">Important Notes</h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700">
            <li>Teams set ONE lineup each week that serves for both league play and CC tournament play</li>
            <li>The Commissioner is responsible for collecting fees and coordinating payouts</li>
            <li>The winner reigns over both leagues with bragging rights until dethroned by the next champion</li>
          </ul>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-xl text-gray-600">Loading Commissioner's Cup data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
<nav className="bg-white shadow-lg">
        <div className="max-w-7xl mx-auto px-2 sm:px-4">
          <div className="flex justify-between items-center py-3">
            <div className="flex items-center">
              <img src="https://iili.io/3wiyhl.png" alt="Logo" className="h-10 w-10 sm:h-12 sm:w-12" />
            </div>
            <div className="flex gap-1 flex-wrap justify-end">
              {[
                { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
                { id: 'standings', label: 'Standings', icon: Award },
                { id: 'matchups', label: 'Matchups', icon: Calendar },
                { id: 'bracket', label: 'Bracket', icon: Target },
                { id: 'teams', label: 'Teams', icon: Users },
                { id: 'history', label: 'History', icon: Trophy },
                { id: 'rules', label: 'Rules', icon: BookOpen }
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`p-2 rounded-lg transition ${
                    activeTab === id
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                  title={label}
                >
                  <Icon className="h-5 w-5" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'standings' && <Standings />}
        {activeTab === 'matchups' && <Matchups />}
        {activeTab === 'bracket' && <Bracket />}
        {activeTab === 'teams' && <Teams />}
        {activeTab === 'history' && <History />}
        {activeTab === 'rules' && <Rules />}
        
        {lastUpdate && (
          <div className="mt-8 text-center text-sm text-gray-500">
            Last updated: {lastUpdate.toLocaleTimeString()}
          </div>
        )}
      </main>
    </div>
  );
};

export default CommissionersCup;
