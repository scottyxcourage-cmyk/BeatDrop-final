const { _normalise: normalise } = require('../routes/sports');

describe('normalise (ESPN data → flat format)', () => {
  test('returns empty array for empty events', () => {
    expect(normalise({ events: [] })).toEqual([]);
    expect(normalise({})).toEqual([]);
  });

  test('normalises a full ESPN event correctly', () => {
    const espnData = {
      leagues: [{ name: 'Premier League' }],
      events: [{
        date: '2024-01-15T15:00:00Z',
        competitions: [{
          league: { name: 'Premier League' },
          status: {
            type: { description: 'In Progress' },
            displayClock: '67:30',
            period: 2
          },
          competitors: [
            {
              homeAway: 'home',
              team: { displayName: 'Arsenal', logo: 'https://arsenal.png' },
              score: '2'
            },
            {
              homeAway: 'away',
              team: { displayName: 'Chelsea', logo: 'https://chelsea.png' },
              score: '1'
            }
          ]
        }]
      }]
    };

    const result = normalise(espnData);
    expect(result).toHaveLength(1);

    const match = result[0];
    expect(match.strHomeTeam).toBe('Arsenal');
    expect(match.strAwayTeam).toBe('Chelsea');
    expect(match.intHomeScore).toBe('2');
    expect(match.intAwayScore).toBe('1');
    expect(match.strLeague).toBe('Premier League');
    expect(match.strStatus).toBe('In Progress');
    expect(match.strTime).toBe('67:30');
    expect(match.strPeriod).toBe('Period 2');
    expect(match.homeLogo).toBe('https://arsenal.png');
    expect(match.awayLogo).toBe('https://chelsea.png');
    expect(match.dateEvent).toBeTruthy();
  });

  test('handles event with no competitions', () => {
    const data = {
      events: [{ date: '2024-01-01T00:00:00Z' }]
    };
    const result = normalise(data);
    expect(result).toHaveLength(1);
    expect(result[0].strHomeTeam).toBe('');
    expect(result[0].strAwayTeam).toBe('');
  });

  test('handles missing team data', () => {
    const data = {
      events: [{
        competitions: [{
          competitors: [],
          status: { type: {} }
        }]
      }]
    };
    const result = normalise(data);
    expect(result).toHaveLength(1);
    expect(result[0].strHomeTeam).toBe('');
    expect(result[0].strAwayTeam).toBe('');
    expect(result[0].intHomeScore).toBeNull();
    expect(result[0].intAwayScore).toBeNull();
  });

  test('handles null scores', () => {
    const data = {
      events: [{
        competitions: [{
          competitors: [
            { homeAway: 'home', team: { displayName: 'Team A' } },
            { homeAway: 'away', team: { displayName: 'Team B' } }
          ],
          status: { type: { description: 'Scheduled' } }
        }]
      }]
    };
    const result = normalise(data);
    expect(result[0].intHomeScore).toBeNull();
    expect(result[0].intAwayScore).toBeNull();
  });

  test('uses league name from top-level when competition.league is missing', () => {
    const data = {
      leagues: [{ name: 'NBA' }],
      events: [{
        competitions: [{
          competitors: [],
          status: { type: {} }
        }]
      }]
    };
    const result = normalise(data);
    expect(result[0].strLeague).toBe('NBA');
  });

  test('uses league.name fallback', () => {
    const data = {
      league: { name: 'La Liga' },
      events: [{
        competitions: [{
          competitors: [],
          status: { type: {} }
        }]
      }]
    };
    const result = normalise(data);
    expect(result[0].strLeague).toBe('La Liga');
  });

  test('handles multiple events', () => {
    const data = {
      events: [
        { competitions: [{ competitors: [{ homeAway: 'home', team: { displayName: 'A' } }], status: { type: {} } }] },
        { competitions: [{ competitors: [{ homeAway: 'home', team: { displayName: 'B' } }], status: { type: {} } }] },
        { competitions: [{ competitors: [{ homeAway: 'home', team: { displayName: 'C' } }], status: { type: {} } }] }
      ]
    };
    const result = normalise(data);
    expect(result).toHaveLength(3);
    expect(result.map(r => r.strHomeTeam)).toEqual(['A', 'B', 'C']);
  });

  test('falls back through status type fields', () => {
    const data = {
      events: [{
        competitions: [{
          competitors: [],
          status: {
            type: { detail: 'Final', shortDetail: 'FT' }
          }
        }]
      }]
    };
    const result = normalise(data);
    expect(result[0].strStatus).toBe('Final');
  });

  test('uses shortDetail when description and detail are missing', () => {
    const data = {
      events: [{
        competitions: [{
          competitors: [],
          status: {
            type: { shortDetail: 'HT' }
          }
        }]
      }]
    };
    const result = normalise(data);
    expect(result[0].strStatus).toBe('HT');
  });

  test('returns empty strPeriod when no period', () => {
    const data = {
      events: [{
        competitions: [{
          competitors: [],
          status: { type: {} }
        }]
      }]
    };
    const result = normalise(data);
    expect(result[0].strPeriod).toBe('');
  });

  test('score of 0 is preserved (not treated as null)', () => {
    const data = {
      events: [{
        competitions: [{
          competitors: [
            { homeAway: 'home', team: { displayName: 'A' }, score: 0 },
            { homeAway: 'away', team: { displayName: 'B' }, score: 0 }
          ],
          status: { type: {} }
        }]
      }]
    };
    const result = normalise(data);
    expect(result[0].intHomeScore).toBe(0);
    expect(result[0].intAwayScore).toBe(0);
  });
});
