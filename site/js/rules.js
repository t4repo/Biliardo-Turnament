/* Biliardo Tournament — rules content.
 * Summaries based on WPA World Standardized Rules (pool), WPBSA rules (snooker)
 * and common Italian federation practice (5-Pins). Organisers should confirm
 * house rules before the event. */
window.BT_RULES = {
  general: {
    title: 'Tournament & Referee',
    tagline: 'How the event runs, what referees do and the signals they use.',
    facts: [
      ['Formats', 'Single elimination · Round robin'],
      ['Ranking', 'Win = 3 pts, then game difference'],
      ['Break', 'Alternate or winner breaks'],
      ['Login', 'None — data stays on this device']
    ],
    sections: [
      { h: 'Formats', list: [
        '<b>Single elimination (knockout):</b> lose once and you are out. If the number of players is not a power of two, the top seeds receive a bye into round two.',
        '<b>Round robin (league):</b> everyone plays everyone once. The table is ordered by ranking points (win = 3), then game difference (racks/frames/sets won minus lost), then games won, then point difference.',
        '<b>Race:</b> a match is a "race to N" — the first player to win N racks, frames or sets wins the match. Snooker matches are shown as "best of 2N−1" frames.'
      ]},
      { h: 'Seeding & draw', list: [
        'Players are seeded in the order they are entered. Tick “Random draw” when creating the tournament to shuffle them.',
        'Byes are given to the highest seeds and advance automatically.',
        'The lag (both players shoot to the head cushion; closest to it wins) or a coin toss decides the first break.'
      ]},
      { h: 'Breaking', list: [
        '<b>Alternate break:</b> players take turns breaking, whoever won the previous rack. Standard in most tournaments and the default here.',
        '<b>Winner breaks:</b> the player who won the previous rack breaks the next one.',
        'In snooker and 5-Pins, the break-off alternates every frame/set.'
      ]},
      { h: 'Duties of the referee', list: [
        'Is the final judge of fact. Calls fouls, announces the score and keeps the scoreboard on this site up to date.',
        'Racks the balls (or checks the rack), cleans balls on request and re-spots balls when the rules require it.',
        'Warns a player who is on two consecutive fouls (9-Ball, 10-Ball, Straight Pool) — three in a row carries a penalty.',
        'Keeps the shot clock when one is used, and enforces conduct rules.',
        'If a mistake is entered on the scoreboard, use <b>Undo</b> — every action can be reversed.'
      ]},
      { h: 'Referee signals (used by the animated referee)', list: [
        '<b>Arm pointing to a player:</b> point, rack, frame or set awarded to that player.',
        '<b>Arms crossed:</b> foul called on the player on that side.',
        '<b>Both arms raised:</b> game over — the match winner is declared.'
      ]},
      { h: 'Conduct', list: [
        'Shake hands before and after the match. No coaching during play unless the event allows a time-out.',
        'Only the shooter may be at the table; the non-shooter stays seated and quiet.',
        'Unsportsmanlike conduct may be penalised by the referee with loss of a rack, frame or the match.',
        'A player who is not present when called may be given a walkover (forfeit). Agree the waiting time before the event.'
      ]},
      { h: 'House rules to agree before the first match', list: [
        'Race length per round (for example race to 5 in early rounds, race to 7 in the final).',
        'Break rule (alternate or winner breaks) and whether a shot clock is used (30 s with one 30 s extension per rack is common).',
        'Any local variations from the summaries on these pages. Local rules always take priority when announced before play.'
      ]}
    ]
  },

  eightball: {
    title: '8-Ball',
    tagline: 'Call-shot game with solids (1–7) and stripes (9–15). Clear your group, then pocket the 8.',
    facts: [
      ['Balls', '15 object balls + cue ball'],
      ['Rack', 'Triangle, 8-ball in the centre'],
      ['Win', 'Legally pocket the 8 in the called pocket'],
      ['Typical race', 'Race to 5–7']
    ],
    sections: [
      { h: 'Objective', p: 'One player pockets the solids (1–7), the other the stripes (9–15). The player who pockets their whole group and then legally pockets the 8-ball in a called pocket wins the rack.' },
      { h: 'Racking', list: [
        'Fifteen balls in a triangle, the apex ball on the foot spot.',
        'The 8-ball goes in the centre of the third row; one solid and one stripe in the two back corners.'
      ]},
      { h: 'The break', list: [
        'The cue ball is placed anywhere behind the head string (the “kitchen”).',
        'For a legal break the breaker must pocket a ball or drive at least four object balls to one or more cushions. If not, the incoming player may accept the table as it lies, or have the balls re-racked and choose who breaks.',
        'Pocketing the 8-ball on a legal break is not a loss: the breaker may re-spot the 8 and continue, or re-rack and break again.',
        'Scratch on a legal break: foul. Pocketed balls stay down (except the 8, which is re-spotted), the table is open and the incoming player has cue ball in hand behind the head string (WPA). Some leagues give ball in hand anywhere — confirm locally.'
      ]},
      { h: 'Open table & choosing groups', list: [
        'The table is always open immediately after the break.',
        'While the table is open you may hit a solid first to pocket a stripe or vice versa, but the 8-ball may not be the first ball contacted.',
        'Groups are decided when a player legally pockets a called ball after the break.'
      ]},
      { h: 'Legal shot & calling', list: [
        'Call the ball and the pocket for every shot except the break. Obvious shots need not be stated, but the opponent may ask. The 8-ball must always be called.',
        'Contact a ball of your own group first, then either pocket a ball or drive any ball (including the cue ball) to a cushion.',
        'Keep shooting as long as you legally pocket a called ball. Safeties may be declared in advance.'
      ]},
      { h: 'Fouls (opponent gets cue ball in hand anywhere)', list: [
        'Pocketing the cue ball or driving it off the table.',
        'Hitting the wrong ball first, or no ball at all.',
        'No ball reaches a cushion and no ball is pocketed after contact.',
        'Any ball driven off the table, a double hit, a push shot, or touching any ball with hand, clothing or cue.',
        'Shooting with no foot touching the floor, or while balls are still moving.'
      ]},
      { h: 'Loss of the rack', list: [
        'Pocketing the 8-ball before your group is cleared.',
        'Pocketing the 8-ball in an un-called pocket, or on a foul (for example together with a scratch).',
        'Driving the 8-ball off the table.',
        'Under WPA rules a foul on the 8-ball shot that does not pocket the 8 is an ordinary foul; many bar leagues treat a scratch on the 8 as a loss — agree beforehand.'
      ]}
    ],
    scoring: 'Each rack won counts 1 in the race. The referee presses “Win Rack” for the winner and “Foul” to record fouls.'
  },

  nineball: {
    title: '9-Ball',
    tagline: 'Rotation game with balls 1–9. Always hit the lowest ball first — the 9 wins the rack.',
    facts: [
      ['Balls', '1–9 + cue ball'],
      ['Rack', 'Diamond, 1 on the spot, 9 in the centre'],
      ['Win', 'Legally pocket the 9-ball'],
      ['Typical race', 'Race to 7–11']
    ],
    sections: [
      { h: 'Objective', p: 'The cue ball must always contact the lowest-numbered ball on the table first, but balls may be pocketed in any order. The player who legally pockets the 9-ball wins the rack.' },
      { h: 'Racking', list: [
        'Nine balls in a diamond, the 1-ball at the apex on the foot spot, the 9-ball in the centre, the others in any order.',
        'The rack must be tight, with the balls frozen to each other.'
      ]},
      { h: 'The break', list: [
        'Cue ball anywhere behind the head string. The 1-ball must be hit first.',
        'A legal break pockets a ball or drives at least four object balls to a cushion. Otherwise it is a foul and the incoming player has cue ball in hand anywhere.',
        'Pocketing the 9-ball on a legal break wins the rack.'
      ]},
      { h: 'Push out', list: [
        'The player taking the first shot after the break may declare a “push out”: the cue ball need not touch any ball and no cushion is required.',
        'The opponent then chooses whether to shoot or hand the shot back.'
      ]},
      { h: 'Play', list: [
        'Hit the lowest-numbered ball first; any ball pocketed on a legal shot lets you continue.',
        'After contact a ball must be pocketed or any ball must reach a cushion.',
        'The 9-ball pocketed on a legal shot (including a combination or carom) wins. If it is pocketed on a foul or driven off the table it is re-spotted.'
      ]},
      { h: 'Fouls', list: [
        'Penalty: the opponent receives cue ball in hand anywhere on the table.',
        'Scratch, wrong ball first, no cushion after contact, ball off the table, double hit, touching balls, no foot on the floor.',
        '<b>Three consecutive fouls</b> by the same player in one rack lose that rack. The player must be warned after the second foul. A legal shot resets the count.'
      ]}
    ],
    scoring: 'Each rack won counts 1. Record every foul: on a third consecutive foul the site awards the rack to the opponent automatically. Press “Legal shot” after a legal shot to reset a player’s foul count.'
  },

  tenball: {
    title: '10-Ball',
    tagline: 'Rotation game with balls 1–10 and every shot called. The pro rotation format.',
    facts: [
      ['Balls', '1–10 + cue ball'],
      ['Rack', 'Triangle, 1 on the spot, 10 in the centre'],
      ['Win', 'Pocket the 10 in the called pocket'],
      ['Typical race', 'Race to 7–9']
    ],
    sections: [
      { h: 'Objective', p: 'As in 9-Ball, the lowest-numbered ball must be contacted first. Every shot is a called shot. The player who legally pockets the 10-ball in the called pocket wins the rack.' },
      { h: 'Racking', list: [
        'Ten balls in a triangle, the 1-ball at the apex on the foot spot, the 10-ball in the centre of the third row.'
      ]},
      { h: 'The break', list: [
        'Hit the 1-ball first. A legal break pockets a ball or drives at least four object balls to a cushion; otherwise foul and ball in hand for the opponent.',
        'The 10-ball pocketed on the break is re-spotted — it does not win — and the breaker continues if the break was legal.',
        'Push out is allowed on the first shot after the break, as in 9-Ball.'
      ]},
      { h: 'Call shot', list: [
        'Call the ball and the pocket for every shot after the break. Obvious shots may be accepted without a spoken call, but if in doubt, call it.',
        'If the called ball is not pocketed in the called pocket (and no foul occurs), the incoming player chooses to shoot or hand the shot back.',
        'Legally pocketing the 10-ball in the called pocket wins — even early, for example on a called combination. If the 10 drops on a foul or uncalled it is re-spotted.'
      ]},
      { h: 'Fouls', list: [
        'Penalty: cue ball in hand anywhere for the opponent.',
        'Same fouls as 9-Ball. Three consecutive fouls lose the rack (after a warning on the second).'
      ]}
    ],
    scoring: 'Each rack won counts 1. Three consecutive fouls are tracked automatically.'
  },

  straight: {
    title: 'Straight Pool (14.1 Continuous)',
    tagline: 'Every called ball is a point. Play to a target score — 100 is the classic.',
    facts: [
      ['Balls', '15 + cue ball'],
      ['Scoring', '1 point per ball'],
      ['Win', 'First to the target score'],
      ['Typical target', '50 · 75 · 100 · 125']
    ],
    sections: [
      { h: 'Objective', p: 'Every legally pocketed called ball scores one point. Play is continuous: when 14 balls are gone they are re-racked and the shooter carries on. The first player to reach the agreed target wins.' },
      { h: 'Opening break', list: [
        'All 15 balls are racked in a triangle on the foot spot. The cue ball starts behind the head string.',
        'The breaker must either call and pocket a ball, or drive the cue ball and at least two object balls to a cushion.',
        'Failure is a breaking foul: <b>−2 points</b>, and the opponent may accept the table or make the breaker break again.'
      ]},
      { h: 'Play', list: [
        'Every shot is a called shot (ball and pocket). Any extra balls pocketed on a legal called shot also score 1 each.',
        'After contact, a ball must be pocketed or the cue ball or an object ball must reach a cushion.',
        'When only one object ball and the cue ball remain, the other 14 are re-racked with the apex spot empty and the shooter continues.'
      ]},
      { h: 'Fouls & penalties', list: [
        'A normal foul costs <b>−1 point</b>. After a scratch the opponent has cue ball in hand behind the head string.',
        '<b>Three consecutive fouls</b>: −1 for the foul plus an extra <b>−15 points</b>. All 15 balls are re-racked and the offender breaks under the opening break rules.',
        'A legal shot resets the consecutive-foul count. Scores may go below zero.'
      ]}
    ],
    scoring: 'Press “+1 Ball” for each point (or “+N” for several), “Foul −1” and “Break foul −2”. The −15 penalty is applied automatically on the third consecutive foul. The match ends automatically at the target.'
  },

  snooker: {
    title: 'Snooker',
    tagline: '15 reds and six colours on a 12-ft table. Pot red, colour, red, colour…',
    facts: [
      ['Balls', '15 reds, 6 colours, cue ball'],
      ['Values', 'Red 1 · Yellow 2 · Green 3 · Brown 4 · Blue 5 · Pink 6 · Black 7'],
      ['Maximum break', '147'],
      ['Match', 'Best of N frames']
    ],
    sections: [
      { h: 'Objective', p: 'Score more points than your opponent in a frame by potting balls and from your opponent’s fouls. Win the required number of frames to win the match.' },
      { h: 'Order of play', list: [
        'The break-off is played from the “D” and must contact a red first. Break-off alternates each frame.',
        'While reds remain, pot a red, then nominate and pot a colour, then a red again, and so on.',
        'Colours are re-spotted while reds are on the table. When all reds are gone, the colours are potted in order: yellow, green, brown, blue, pink, black.'
      ]},
      { h: 'Fouls', list: [
        'A foul gives the opponent at least <b>4 points</b>, or the value of the ball involved if higher (5, 6 or 7).',
        'Common fouls: failing to hit the ball on, potting the cue ball, potting the wrong ball, touching a ball, both feet off the floor, ball off the table.',
        'After a foul the opponent may play on or ask the offender to play again.',
        '<b>Free ball:</b> if a player is snookered after a foul, they may nominate any ball as the ball on.',
        '<b>Miss:</b> the referee may call “foul and a miss” if a player does not make a good enough attempt to hit the ball on; the opponent may have the balls replaced.'
      ]},
      { h: 'End of the frame', list: [
        'The frame ends when the final black is potted or fouled, or when a player concedes.',
        'If the scores are level after the final black, the black is re-spotted, the players toss for the first shot, which is played from the D. The next score or foul wins.'
      ]}
    ],
    scoring: 'Tap a ball to add its value to that player’s frame score. Use the foul buttons on the player who fouled — the points go to the opponent. Press “End Frame” to award the frame to the leader, or “Concede” to give it away.'
  },

  fivepins: {
    title: 'Italian 5-Pins (Cinque Birilli)',
    tagline: 'Carom game without pockets: use your ball to drive your opponent’s ball into the pins.',
    facts: [
      ['Table', 'Carom table, no pockets'],
      ['Balls', 'Two cue balls + red ball (pallino)'],
      ['Pins', '4 white + 1 red in the centre'],
      ['Game', 'First to 60 (also 40 / 80 / 100)']
    ],
    sections: [
      { h: 'Objective', p: 'Each player has a cue ball. You strike your own ball so that it hits your opponent’s ball, which then scores by knocking down pins or hitting the red ball. The first player to the agreed total wins the game (set).' },
      { h: 'Set up', list: [
        'Five pins stand in a cross in the centre of the table: four white pins and the red pin in the middle.',
        'The red ball is placed on its spot; players lag to decide who starts. The start alternates each set.'
      ]},
      { h: 'Scoring', list: [
        'Each white pin knocked down: <b>2 points</b>.',
        'Red pin knocked down together with others: <b>4 points</b>.',
        'Red pin knocked down on its own: <b>10 points</b>.',
        'Opponent’s ball hitting the red ball: <b>3 points</b>.'
      ]},
      { h: 'Fouls (points go to the opponent)', list: [
        'Failing to hit the opponent’s ball with your own cue ball.',
        'Knocking down pins with your own cue ball — the value of those pins is given to the opponent.',
        'A ball jumping off the table, touching a ball, playing while balls are still moving.',
        'Most federations award at least 2 points to the opponent for any foul. Penalty details vary between federations — agree them before the event.'
      ]}
    ],
    scoring: 'Use +2 / +3 / +4 / +10 (or +N) for the scoring player. Fouls add points to the opponent. The set is won automatically on reaching the target; the match is a race to N sets.'
  }
};
